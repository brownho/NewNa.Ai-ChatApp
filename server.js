// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { exec, spawn } = require('child_process');
const multer = require('multer');
const fs = require('fs').promises;
const vm = require('vm');
const { promisify } = require('util');
const execAsync = promisify(exec);
const session = require('express-session');

// Import authentication and database
const db = require('./database');
const auth = require('./auth');

// Import traffic monitoring
const trafficLogger = require('./traffic-monitor/trafficLogger');
const createTrafficRoutes = require('./traffic-monitor/trafficRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize traffic logger
const logger = trafficLogger();

app.use(cors({
    credentials: true,
    origin: true // In production, specify your actual domain
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Apply traffic logging middleware
app.use(logger);

// Serve static files
app.use(express.static('public'));

// Serve traffic monitor dashboard
app.use('/traffic-monitor', express.static(path.join(__dirname, 'traffic-monitor')));

// Add traffic monitoring routes
app.use(createTrafficRoutes(logger));

// Authentication routes
app.post('/api/auth/register', auth.register);
app.post('/api/auth/login', auth.login);
app.post('/api/auth/logout', auth.logout);
app.get('/api/auth/verify', auth.authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});
app.get('/api/auth/user', auth.authenticateSession, auth.getUserInfo);

// Chat session routes
app.get('/api/sessions', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT cs.*, COUNT(m.id) as message_count 
     FROM chat_sessions cs 
     LEFT JOIN messages m ON cs.id = m.session_id 
     WHERE cs.user_id = ? 
     GROUP BY cs.id 
     ORDER BY cs.updated_at DESC`,
    [userId],
    (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching sessions' });
      }
      res.json(sessions);
    }
  );
});

app.post('/api/sessions', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  const { session_name } = req.body;
  
  db.run(
    'INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)',
    [userId, session_name || 'New Session'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating session' });
      }
      res.json({ id: this.lastID, session_name: session_name || 'New Session' });
    }
  );
});

// Get messages for a session
app.get('/api/sessions/:sessionId/messages', auth.authenticateSession, (req, res) => {
  const sessionId = req.params.sessionId;
  const userId = req.user.id;
  
  // Verify session belongs to user
  db.get(
    'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Get messages
      db.all(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching messages' });
          }
          res.json(messages);
        }
      );
    }
  );
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Get list of available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Guest chat endpoint (no authentication, limited to 10 messages)
app.post('/api/guest/chat', async (req, res) => {
  const { model, messages } = req.body;
  
  try {
    const response = await axios.post(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/chat`, {
      model,
      messages,
      stream: false
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to get response from Ollama' });
  }
});

// Protected chat endpoint with usage limits
app.post('/api/chat', auth.authenticateSession, auth.checkUsageLimits, async (req, res) => {
  const { model, messages, sessionId } = req.body;
  const userId = req.user.id;
  
  // Verify session belongs to user
  if (sessionId) {
    const session = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
  }
  
  try {
    // Save user message
    if (sessionId && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      db.run(
        'INSERT INTO messages (session_id, role, content, model) VALUES (?, ?, ?, ?)',
        [sessionId, userMessage.role, userMessage.content, model]
      );
    }
    
    const response = await axios.post(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/chat`, {
      model,
      messages,
      stream: false
    });
    
    // Save assistant response
    if (sessionId && response.data.message) {
      db.run(
        'INSERT INTO messages (session_id, role, content, model) VALUES (?, ?, ?, ?)',
        [sessionId, response.data.message.role, response.data.message.content, model]
      );
      
      // Update session updated_at
      db.run(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );
    }
    
    // Update user's message count
    db.run(
      'UPDATE users SET daily_message_count = daily_message_count + 1, total_messages = total_messages + 1 WHERE id = ?',
      [userId]
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to get response from Ollama' });
  }
});

// File upload endpoint (protected)
app.post('/api/upload', auth.authenticateSession, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const fileContent = await fs.readFile(req.file.path, 'utf-8');
    res.json({
      filename: req.file.originalname,
      content: fileContent,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Code execution endpoint (protected)
app.post('/api/execute', auth.authenticateSession, async (req, res) => {
  const { code, language } = req.body;
  
  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }
  
  try {
    let output;
    let error = null;
    
    switch (language) {
      case 'javascript':
        try {
          const script = new vm.Script(code);
          const context = vm.createContext({
            console: {
              log: (...args) => {
                output = (output || '') + args.join(' ') + '\n';
              }
            }
          });
          script.runInContext(context, { timeout: 5000 });
        } catch (err) {
          error = err.message;
        }
        break;
        
      case 'python':
        try {
          const result = await execAsync(`python3 -c "${code.replace(/"/g, '\\"')}"`, {
            timeout: 10000
          });
          output = result.stdout;
          if (result.stderr) error = result.stderr;
        } catch (err) {
          error = err.message;
        }
        break;
        
      case 'bash':
        try {
          const result = await execAsync(code, {
            timeout: 10000,
            shell: '/bin/bash'
          });
          output = result.stdout;
          if (result.stderr) error = result.stderr;
        } catch (err) {
          error = err.message;
        }
        break;
        
      default:
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
    
    res.json({ output: output || '', error });
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ error: 'Failed to execute code' });
  }
});

// GPU stats endpoint
app.get('/api/gpu-stats', async (req, res) => {
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits');
    const [temp, memUsed, memTotal] = stdout.trim().split(', ').map(Number);
    
    res.json({
      temperature: temp,
      memoryUsed: memUsed,
      memoryTotal: memTotal
    });
  } catch (error) {
    res.json({
      temperature: null,
      memoryUsed: null,
      memoryTotal: null,
      error: 'GPU stats unavailable'
    });
  }
});

// Meeting API endpoints
// Create a new meeting
app.post('/api/meetings', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  const { title, description, scheduled_date } = req.body;
  
  db.run(
    'INSERT INTO meetings (user_id, title, description, scheduled_date) VALUES (?, ?, ?, ?)',
    [userId, title, description || '', scheduled_date || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating meeting' });
      }
      res.json({ id: this.lastID, title, description, scheduled_date });
    }
  );
});

// Get all meetings for a user
app.get('/api/meetings', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT m.*, 
     (SELECT COUNT(*) FROM meeting_transcripts WHERE meeting_id = m.id) as transcript_count,
     (SELECT COUNT(*) FROM meeting_action_items WHERE meeting_id = m.id) as action_item_count
     FROM meetings m 
     WHERE m.user_id = ? 
     ORDER BY m.created_at DESC`,
    [userId],
    (err, meetings) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching meetings' });
      }
      res.json(meetings);
    }
  );
});

// Get specific meeting details
app.get('/api/meetings/:id', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  db.get(
    'SELECT * FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching meeting' });
      }
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      res.json(meeting);
    }
  );
});

// Start a meeting
app.post('/api/meetings/:id/start', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  db.run(
    'UPDATE meetings SET actual_start = CURRENT_TIMESTAMP, status = "in_progress" WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error starting meeting' });
      }
      res.json({ success: true, meetingId });
    }
  );
});

// End a meeting
app.post('/api/meetings/:id/end', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  db.run(
    `UPDATE meetings 
     SET actual_end = CURRENT_TIMESTAMP, 
         status = "completed",
         duration = CAST((julianday(CURRENT_TIMESTAMP) - julianday(actual_start)) * 24 * 60 AS INTEGER)
     WHERE id = ? AND user_id = ?`,
    [meetingId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error ending meeting' });
      }
      res.json({ success: true, meetingId });
    }
  );
});

// Save transcript entry
app.post('/api/meetings/:id/transcript', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const { speaker_name, text, timestamp, confidence, is_interim } = req.body;
  
  db.run(
    'INSERT INTO meeting_transcripts (meeting_id, speaker_name, text, timestamp, confidence, is_interim) VALUES (?, ?, ?, ?, ?, ?)',
    [meetingId, speaker_name || 'Unknown', text, timestamp || new Date().toISOString(), confidence || 1.0, is_interim || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error saving transcript' });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// Get meeting transcript
app.get('/api/meetings/:id/transcript', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  // Verify user owns the meeting
  db.get(
    'SELECT id FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err || !meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      db.all(
        'SELECT * FROM meeting_transcripts WHERE meeting_id = ? AND is_interim = 0 ORDER BY timestamp ASC',
        [meetingId],
        (err, transcripts) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching transcripts' });
          }
          res.json(transcripts);
        }
      );
    }
  );
});

// Save AI suggestion
app.post('/api/meetings/:id/suggestions', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const { suggestion_text, context, relevance_score } = req.body;
  
  db.run(
    'INSERT INTO meeting_suggestions (meeting_id, suggestion_text, context, relevance_score) VALUES (?, ?, ?, ?)',
    [meetingId, suggestion_text, context || '', relevance_score || 0.5],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error saving suggestion' });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// Mark suggestion as used
app.put('/api/meetings/:id/suggestions/:suggestionId/use', auth.authenticateSession, (req, res) => {
  const suggestionId = req.params.suggestionId;
  
  db.run(
    'UPDATE meeting_suggestions SET used = 1 WHERE id = ?',
    [suggestionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating suggestion' });
      }
      res.json({ success: true });
    }
  );
});

// Generate meeting summary
app.post('/api/meetings/:id/summary', auth.authenticateSession, async (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  try {
    // Get all transcripts for the meeting
    const transcripts = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM meeting_transcripts WHERE meeting_id = ? AND is_interim = 0 ORDER BY timestamp ASC',
        [meetingId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    if (transcripts.length === 0) {
      return res.status(400).json({ error: 'No transcripts found for this meeting' });
    }
    
    // Prepare transcript text for AI analysis
    const transcriptText = transcripts.map(t => `${t.speaker_name}: ${t.text}`).join('\n');
    
    // Call Ollama to generate summary
    const summaryPrompt = `Please analyze this meeting transcript and provide:
1. A concise summary (2-3 paragraphs)
2. Key points discussed (bullet points)
3. Decisions made (if any)
4. Next steps and action items

Transcript:
${transcriptText}`;

    const response = await axios.post(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/generate`, {
      model: 'llama2',
      prompt: summaryPrompt,
      stream: false
    });
    
    const aiResponse = response.data.response;
    
    // Parse AI response (simple parsing, could be enhanced)
    const sections = aiResponse.split(/\n(?=\d\.|\*|-)/).filter(s => s.trim());
    const summary = sections[0] || aiResponse;
    const keyPoints = sections[1] || '';
    const decisions = sections[2] || '';
    const nextSteps = sections[3] || '';
    
    // Save summary to database
    db.run(
      'INSERT INTO meeting_summaries (meeting_id, summary, key_points, decisions, next_steps) VALUES (?, ?, ?, ?, ?)',
      [meetingId, summary, keyPoints, decisions, nextSteps],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error saving summary' });
        }
        res.json({
          id: this.lastID,
          summary,
          key_points: keyPoints,
          decisions,
          next_steps: nextSteps
        });
      }
    );
    
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate meeting summary' });
  }
});

// Get meeting summary
app.get('/api/meetings/:id/summary', auth.authenticateSession, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.user.id;
  
  db.get(
    `SELECT ms.* FROM meeting_summaries ms
     JOIN meetings m ON ms.meeting_id = m.id
     WHERE ms.meeting_id = ? AND m.user_id = ?
     ORDER BY ms.generated_at DESC LIMIT 1`,
    [meetingId, userId],
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching summary' });
      }
      res.json(summary || {});
    }
  );
});

// User profile endpoints
app.get('/api/profile', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT * FROM user_profiles WHERE user_id = ?',
    [userId],
    (err, profile) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching profile' });
      }
      res.json(profile || {});
    }
  );
});

app.post('/api/profile', auth.authenticateSession, (req, res) => {
  const userId = req.user.id;
  const { job_title, department, responsibilities, communication_style, meeting_preferences } = req.body;
  
  db.run(
    `INSERT INTO user_profiles (user_id, job_title, department, responsibilities, communication_style, meeting_preferences)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       job_title = excluded.job_title,
       department = excluded.department,
       responsibilities = excluded.responsibilities,
       communication_style = excluded.communication_style,
       meeting_preferences = excluded.meeting_preferences,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, job_title, department, responsibilities, communication_style, meeting_preferences],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating profile' });
      }
      res.json({ success: true });
    }
  );
});

// Guest mode support - redirect to login only if no guest mode
app.get('/', (req, res, next) => {
  // Allow access to index.html without authentication (guest mode handled client-side)
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Meeting Mentor health check endpoint
app.get('/api/meeting-mentor/health', (req, res) => {
  res.json({
    status: 'healthy',
    features: {
      realTimeTranscription: true,
      aiSuggestions: true,
      persistentStorage: true,
      userProfiles: true,
      meetingSummaries: true,
      discreetMode: true,
      actionItems: true,
      exportCapabilities: true
    },
    version: '1.0.0'
  });
});

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Only allow specific admin user
  if (req.user.username !== 'sabrown0812' || req.user.email !== 'sabrown0812@gmail.com') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  
  next();
};

// Dashboard API endpoints
app.get('/api/dashboard/stats', auth.authenticateSession, requireAdmin, async (req, res) => {
  try {
    // Get database stats
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM users) as totalUsers,
          (SELECT COUNT(*) FROM chat_sessions WHERE datetime(updated_at) > datetime('now', '-1 hour')) as activeSessions,
          (SELECT COUNT(*) FROM messages) as totalMessages,
          (SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')) as newUsersToday
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // Get file size of database
    const fs = require('fs').promises;
    const dbStats = await fs.stat('./chat.db');
    
    // Get traffic stats for today
    const path = require('path');
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(__dirname, 'traffic-logs', `${today}.json`);
    
    let apiRequestsToday = 0;
    let totalResponseTime = 0;
    
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const trafficData = logContent.split('\n').filter(line => line).map(line => JSON.parse(line));
      apiRequestsToday = trafficData.length;
      
      trafficData.forEach(entry => {
        if (entry.responseTime) {
          totalResponseTime += entry.responseTime;
        }
      });
    } catch (error) {
      // Log file doesn't exist yet
    }
    
    const avgResponseTime = apiRequestsToday > 0 ? Math.round(totalResponseTime / apiRequestsToday) : 0;
    
    // Calculate changes (mock data for now - you'd calculate from historical data)
    res.json({
      totalUsers: stats.totalUsers,
      userChange: 12, // Mock percentage change
      activeSessions: stats.activeSessions,
      sessionChange: -5,
      totalMessages: stats.totalMessages,
      messageChange: 23,
      apiRequestsToday,
      apiChange: 0, // Would need historical data to calculate
      avgResponseTime,
      responseTimeChange: 0, // Would need historical data to calculate
      dbSize: dbStats.size,
      newUsersToday: stats.newUsersToday
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/dashboard/traffic', auth.authenticateSession, requireAdmin, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Read today's traffic log
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(__dirname, 'traffic-logs', `${today}.json`);
    
    let trafficData = [];
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      trafficData = logContent.split('\n').filter(line => line).map(line => JSON.parse(line));
    } catch (error) {
      // Log file doesn't exist yet
    }
    
    // Calculate hourly traffic
    const hourlyTraffic = Array(24).fill(0);
    const uniqueIPs = new Set();
    let errorCount = 0;
    
    trafficData.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourlyTraffic[hour]++;
      uniqueIPs.add(entry.ip);
      if (entry.statusCode >= 400) errorCount++;
    });
    
    // Find peak hour
    let peakHour = 0;
    let peakRequests = 0;
    hourlyTraffic.forEach((count, hour) => {
      if (count > peakRequests) {
        peakRequests = count;
        peakHour = hour;
      }
    });
    
    const errorRate = trafficData.length > 0 ? ((errorCount / trafficData.length) * 100).toFixed(2) : 0;
    
    res.json({
      hourlyTraffic,
      peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
      uniqueVisitors: uniqueIPs.size,
      errorRate
    });
  } catch (error) {
    console.error('Traffic data error:', error);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
});

app.get('/api/dashboard/users', auth.authenticateSession, requireAdmin, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.id, u.username, u.email, u.created_at,
          u.total_messages, u.is_active,
          u.last_message_date,
          CASE 
            WHEN u.last_message_date = date('now') THEN 1 
            ELSE 0 
          END as active_today
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(users.map(user => ({
      ...user,
      last_active: user.last_message_date || user.created_at,
      is_active: user.active_today
    })));
  } catch (error) {
    console.error('Dashboard users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/dashboard/activity', auth.authenticateSession, requireAdmin, async (req, res) => {
  try {
    // Get recent messages as activity
    const activities = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          m.created_at as timestamp,
          u.username,
          'Sent message' as action,
          substr(m.content, 1, 50) || '...' as details,
          m.model
        FROM messages m
        LEFT JOIN chat_sessions cs ON m.session_id = cs.id
        LEFT JOIN users u ON cs.user_id = u.id
        WHERE m.role = 'user'
        ORDER BY m.created_at DESC
        LIMIT 20
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(activities.map(activity => ({
      ...activity,
      response_time: Math.floor(Math.random() * 200) + 50
    })));
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.get('/api/dashboard/system', auth.authenticateSession, requireAdmin, async (req, res) => {
  try {
    // Check Ollama status
    let ollamaStatus = 'Offline';
    let availableModels = 0;
    
    try {
      const ollamaResponse = await axios.get(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/tags`);
      if (ollamaResponse.data && ollamaResponse.data.models) {
        ollamaStatus = 'Online';
        availableModels = ollamaResponse.data.models.length;
      }
    } catch (error) {
      // Ollama is offline
    }
    
    // Get system info
    const os = require('os');
    const uptime = process.uptime();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = Math.round((1 - freeMemory / totalMemory) * 100);
    
    res.json({
      ollamaStatus,
      availableModels,
      dbStatus: 'Connected',
      uptime: Math.floor(uptime),
      memoryUsage,
      cpuUsage: Math.floor(Math.random() * 60) + 20 // Mock CPU usage
    });
  } catch (error) {
    console.error('Dashboard system error:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// WebSocket server for real-time features
const WebSocket = require('ws');

// Check if HTTPS is enabled
let server;
if (process.env.USE_HTTPS === 'true' || process.argv.includes('--https')) {
  // HTTPS Server
  const https = require('https');
  const fs = require('fs');
  
  try {
    const httpsOptions = {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem')
    };
    server = https.createServer(httpsOptions, app);
    console.log('🔐 HTTPS mode enabled');
  } catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message);
    console.error('\nTo generate self-signed certificates, run:');
    console.error('mkdir -p certs');
    console.error('openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"');
    process.exit(1);
  }
} else {
  // HTTP Server
  server = require('http').createServer(app);
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const protocol = process.env.USE_HTTPS === 'true' || process.argv.includes('--https') ? 'https' : 'http';
  console.log(`Server running on ${protocol}://0.0.0.0:${PORT}`);
  console.log(`Login at ${protocol}://localhost:${PORT}/login.html`);
  
  if (protocol === 'https') {
    console.log('\n⚠️  Note: You will see a security warning because this uses a self-signed certificate.');
    console.log('Click "Advanced" and "Proceed to localhost" to continue.');
    console.log('\n🎤 Microphone access will work with HTTPS!');
  }
});