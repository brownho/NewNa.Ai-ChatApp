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

// Import traffic monitoring
const trafficLogger = require('./traffic-monitor/trafficLogger');
const createTrafficRoutes = require('./traffic-monitor/trafficRoutes');

const app = express();
const PORT = 3000;

// Initialize traffic logger
const logger = trafficLogger();

app.use(cors());
app.use(express.json());

// Apply traffic logging middleware
app.use(logger);

app.use(express.static('public'));

// Serve traffic monitor dashboard
app.use('/traffic-monitor', express.static(path.join(__dirname, 'traffic-monitor')));

// Add traffic monitoring routes
app.use(createTrafficRoutes(logger));

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ollama API endpoint
const OLLAMA_API_URL = 'http://localhost:11434/api/chat';

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Make request to Ollama
    const response = await axios.post(OLLAMA_API_URL, {
      model: model || 'mixtral',
      messages: messages,
      stream: true,
      options: req.body.options || {}
    }, {
      responseType: 'stream'
    });
    
    // Stream the response
    response.data.on('data', chunk => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message) {
            res.write(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`);
          }
          if (parsed.done) {
            res.write(`data: [DONE]\n\n`);
            res.end();
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    });
    
    response.data.on('error', error => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to communicate with Ollama' });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    res.json(response.data.models || []);
  } catch (error) {
    console.error('Models error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get GPU stats
app.get('/api/gpu-stats', async (req, res) => {
  exec('nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to get GPU stats' });
    }
    
    const [temp, memUsed, memTotal, utilization] = stdout.trim().split(', ');
    res.json({
      temperature: parseInt(temp),
      memoryUsed: parseInt(memUsed),
      memoryTotal: parseInt(memTotal),
      utilization: parseInt(utilization)
    });
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const filePath = file.path;
    
    // Read file content based on type
    let content = '';
    let fileType = 'text';
    
    if (file.mimetype.startsWith('image/')) {
      // For images, convert to base64
      const imageBuffer = await fs.readFile(filePath);
      content = imageBuffer.toString('base64');
      fileType = 'image';
    } else {
      // For text files, read as string
      content = await fs.readFile(filePath, 'utf8');
      fileType = 'text';
    }
    
    // Clean up uploaded file
    await fs.unlink(filePath);
    
    res.json({
      filename: file.originalname,
      content: content,
      type: fileType,
      mimeType: file.mimetype,
      size: file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// Code execution endpoint
app.post('/api/execute', async (req, res) => {
  const { code, language } = req.body;
  
  // Security: Limit execution time
  const timeout = 10000; // 10 seconds
  
  try {
    let result = { output: '', error: '', executionTime: 0 };
    const startTime = Date.now();
    
    switch (language) {
      case 'javascript':
        result = await executeJavaScript(code, timeout);
        break;
        
      case 'python':
        result = await executePython(code, timeout);
        break;
        
      case 'bash':
        result = await executeBash(code, timeout);
        break;
        
      default:
        result.error = `Unsupported language: ${language}`;
    }
    
    result.executionTime = Date.now() - startTime;
    res.json(result);
    
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      output: '', 
      error: error.message || 'Execution failed',
      executionTime: 0 
    });
  }
});

// Execute JavaScript in sandbox
async function executeJavaScript(code, timeout) {
  return new Promise((resolve) => {
    const result = { output: '', error: '' };
    
    // Create sandbox with limited API
    const sandbox = {
      console: {
        log: (...args) => {
          result.output += args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
        },
        error: (...args) => {
          result.error += args.join(' ') + '\n';
        }
      },
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean
    };
    
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    
    const timer = setTimeout(() => {
      result.error = 'Execution timed out';
      resolve(result);
    }, timeout);
    
    try {
      script.runInContext(context, { timeout });
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      result.error = error.toString();
      resolve(result);
    }
  });
}

// Execute Python code
async function executePython(code, timeout) {
  const result = { output: '', error: '' };
  
  try {
    // Create temporary file
    const tempFile = `/tmp/temp_${Date.now()}.py`;
    await fs.writeFile(tempFile, code);
    
    // Execute with timeout
    const { stdout, stderr } = await execAsync(`timeout ${timeout / 1000} python3 ${tempFile}`, {
      maxBuffer: 1024 * 1024 // 1MB output limit
    });
    
    result.output = stdout;
    result.error = stderr;
    
    // Clean up
    await fs.unlink(tempFile).catch(() => {});
    
  } catch (error) {
    if (error.code === 124) {
      result.error = 'Execution timed out';
    } else {
      result.error = error.stderr || error.message;
    }
  }
  
  return result;
}

// Execute Bash commands (restricted)
async function executeBash(code, timeout) {
  const result = { output: '', error: '' };
  
  // Security: Whitelist safe commands
  const safeCommands = ['echo', 'date', 'ls', 'pwd', 'cat', 'grep', 'sed', 'awk', 'sort', 'uniq', 'wc', 'head', 'tail'];
  const firstCommand = code.trim().split(/\s+/)[0];
  
  if (!safeCommands.includes(firstCommand)) {
    result.error = `Command '${firstCommand}' is not allowed for security reasons`;
    return result;
  }
  
  try {
    const { stdout, stderr } = await execAsync(code, {
      timeout: timeout,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash'
    });
    
    result.output = stdout;
    result.error = stderr;
    
  } catch (error) {
    if (error.killed) {
      result.error = 'Execution timed out';
    } else {
      result.error = error.stderr || error.message;
    }
  }
  
  return result;
}

// Share endpoint - create shareable link
app.post('/api/share', async (req, res) => {
  try {
    const { messages, title, expiresIn } = req.body;
    const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store share data (in production, use database)
    const shareData = {
      id: shareId,
      title: title || 'Shared Chat',
      messages: messages,
      created: new Date().toISOString(),
      expires: expiresIn ? new Date(Date.now() + expiresIn).toISOString() : null,
      views: 0
    };
    
    // Simple in-memory storage (replace with database in production)
    global.shares = global.shares || {};
    global.shares[shareId] = shareData;
    
    res.json({
      shareId: shareId,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${shareId}`
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get shared chat
app.get('/api/share/:id', async (req, res) => {
  try {
    const shareId = req.params.id;
    const shareData = global.shares?.[shareId];
    
    if (!shareData) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    // Check expiration
    if (shareData.expires && new Date(shareData.expires) < new Date()) {
      delete global.shares[shareId];
      return res.status(404).json({ error: 'Share link expired' });
    }
    
    // Increment views
    shareData.views++;
    
    res.json(shareData);
  } catch (error) {
    console.error('Get share error:', error);
    res.status(500).json({ error: 'Failed to retrieve shared chat' });
  }
});

// Serve share page
app.get('/share/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

// WebSocket for real-time collaboration
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from local network at http://<your-ip>:${PORT}`);
});

// Simple WebSocket setup for collaboration
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

global.collaborationRooms = {};

// Enable real-time traffic monitoring via WebSocket
logger.emit = (event, data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'traffic', event, data }));
    }
  });
};

wss.on('connection', (ws) => {
  let currentRoom = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          currentRoom = data.room;
          if (!global.collaborationRooms[currentRoom]) {
            global.collaborationRooms[currentRoom] = new Set();
          }
          global.collaborationRooms[currentRoom].add(ws);
          
          // Send current participants count
          broadcastToRoom(currentRoom, {
            type: 'participants',
            count: global.collaborationRooms[currentRoom].size
          });
          break;
          
        case 'message':
          // Broadcast message to all in room except sender
          broadcastToRoom(currentRoom, {
            type: 'message',
            message: data.message,
            role: data.role
          }, ws);
          break;
          
        case 'typing':
          broadcastToRoom(currentRoom, {
            type: 'typing',
            user: data.user
          }, ws);
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  ws.on('close', () => {
    if (currentRoom && global.collaborationRooms[currentRoom]) {
      global.collaborationRooms[currentRoom].delete(ws);
      if (global.collaborationRooms[currentRoom].size === 0) {
        delete global.collaborationRooms[currentRoom];
      } else {
        broadcastToRoom(currentRoom, {
          type: 'participants',
          count: global.collaborationRooms[currentRoom].size
        });
      }
    }
  });
});

function broadcastToRoom(room, data, exclude = null) {
  const clients = global.collaborationRooms[room];
  if (clients) {
    clients.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}