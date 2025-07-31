const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../database');
const { checkUsageLimits } = require('../middleware/rateLimiting');

// Configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
const GUEST_MESSAGE_LIMIT = parseInt(process.env.GUEST_MESSAGE_LIMIT) || 10;

// Helper function to save message
const saveMessage = (sessionId, role, content, callback) => {
  db.run(
    'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
    [sessionId, role, content],
    callback
  );
};

// Helper function to update session timestamp
const updateSessionTimestamp = (sessionId) => {
  db.run(
    'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [sessionId]
  );
};

// Authenticated chat endpoint
router.post('/', checkUsageLimits, async (req, res) => {
  const { message, sessionId, model, modelParameters = {} } = req.body;
  const userId = req.user.id;
  
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and session ID are required' });
  }
  
  // Verify session belongs to user
  db.get(
    'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    async (err, session) => {
      if (err || !session) {
        return res.status(403).json({ error: 'Invalid session' });
      }
      
      try {
        // Get conversation history
        const messages = await new Promise((resolve, reject) => {
          db.all(
            'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at',
            [sessionId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        // Add current message
        messages.push({ role: 'user', content: message });
        
        // Save user message
        saveMessage(sessionId, 'user', message, (err) => {
          if (err) console.error('Error saving user message:', err);
        });
        
        // Call Ollama API
        const response = await axios.post(OLLAMA_API_URL, {
          model: model || 'jaahas',
          messages: messages,
          stream: false,
          options: {
            temperature: modelParameters.temperature ?? 0.7,
            top_p: modelParameters.topP ?? 0.9,
            top_k: modelParameters.topK ?? 40,
            repeat_penalty: modelParameters.repeatPenalty ?? 1.1,
            seed: modelParameters.seed ?? -1,
            num_predict: modelParameters.numPredict ?? -1,
            stop: modelParameters.stop || []
          }
        });
        
        const assistantMessage = response.data.message.content;
        
        // Save assistant message
        saveMessage(sessionId, 'assistant', assistantMessage, (err) => {
          if (err) console.error('Error saving assistant message:', err);
        });
        
        // Update session timestamp
        updateSessionTimestamp(sessionId);
        
        // Update user's daily message count
        db.run(
          'UPDATE users SET daily_message_count = daily_message_count + 1 WHERE id = ?',
          [userId]
        );
        
        res.json({ 
          message: assistantMessage,
          tokensUsed: response.data.eval_count || 0,
          model: response.data.model
        });
        
      } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ 
          error: 'Failed to get response from AI model',
          details: error.message 
        });
      }
    }
  );
});

// Guest chat endpoint
router.post('/guest', async (req, res) => {
  const { message, model, modelParameters = {}, messageCount = 0 } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Check guest message limit
  if (messageCount >= GUEST_MESSAGE_LIMIT) {
    return res.status(403).json({ 
      error: 'Message limit reached. Please sign up for unlimited messages.',
      limit: GUEST_MESSAGE_LIMIT
    });
  }
  
  try {
    // For guests, we don't maintain conversation history
    const response = await axios.post(OLLAMA_API_URL, {
      model: model || 'jaahas',
      messages: [{ role: 'user', content: message }],
      stream: false,
      options: {
        temperature: modelParameters.temperature ?? 0.7,
        top_p: modelParameters.topP ?? 0.9,
        top_k: modelParameters.topK ?? 40,
        repeat_penalty: modelParameters.repeatPenalty ?? 1.1,
        seed: modelParameters.seed ?? -1,
        num_predict: modelParameters.numPredict ?? -1,
        stop: modelParameters.stop || []
      }
    });
    
    res.json({ 
      message: response.data.message.content,
      model: response.data.model
    });
    
  } catch (error) {
    console.error('Ollama API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get response from AI model',
      details: error.message 
    });
  }
});

// Share chat endpoint
router.post('/share', async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  // Verify session belongs to user
  db.get(
    'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    (err, session) => {
      if (err || !session) {
        return res.status(403).json({ error: 'Invalid session' });
      }
      
      // Get messages
      db.all(
        'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at',
        [sessionId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching messages' });
          }
          
          // Create share ID (simple implementation - in production use proper UUID)
          const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);
          
          // Store shared chat (you might want to create a separate table for this)
          const sharedData = {
            sessionName: session.session_name,
            messages: messages,
            sharedAt: new Date().toISOString(),
            sharedBy: req.user.username
          };
          
          // For now, we'll store in memory (in production, use database)
          global.sharedChats = global.sharedChats || {};
          global.sharedChats[shareId] = sharedData;
          
          res.json({ 
            shareId,
            shareUrl: `/share.html?id=${shareId}`
          });
        }
      );
    }
  );
});

module.exports = router;