const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all sessions for authenticated user
router.get('/', (req, res) => {
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
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error fetching sessions' });
      }
      res.json(sessions);
    }
  );
});

// Create new session
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { session_name } = req.body;
  
  db.run(
    'INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)',
    [userId, session_name || 'New Session'],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error creating session' });
      }
      res.json({ 
        id: this.lastID, 
        session_name: session_name || 'New Session',
        created_at: new Date().toISOString()
      });
    }
  );
});

// Update session name
router.put('/:sessionId', (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const { session_name } = req.body;
  
  if (!session_name || !session_name.trim()) {
    return res.status(400).json({ error: 'Session name is required' });
  }
  
  db.run(
    'UPDATE chat_sessions SET session_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [session_name.trim(), sessionId, userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error updating session' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json({ success: true });
    }
  );
});

// Delete session
router.delete('/:sessionId', (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  
  // Start transaction to delete session and its messages
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Delete messages first (foreign key constraint)
    db.run(
      'DELETE FROM messages WHERE session_id = ? AND session_id IN (SELECT id FROM chat_sessions WHERE user_id = ?)',
      [sessionId, userId],
      (err) => {
        if (err) {
          db.run('ROLLBACK');
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Error deleting session' });
        }
        
        // Delete session
        db.run(
          'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
          [sessionId, userId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Error deleting session' });
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Session not found' });
            }
            
            db.run('COMMIT');
            res.json({ success: true });
          }
        );
      }
    );
  });
});

// Get messages for a session
router.get('/:sessionId/messages', (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.sessionId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  // First verify the session belongs to the user
  db.get(
    'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
    (err, session) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error fetching messages' });
      }
      
      if (!session) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get messages
      db.all(
        `SELECT * FROM messages 
         WHERE session_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [sessionId, limit, offset],
        (err, messages) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Error fetching messages' });
          }
          
          // Reverse to get chronological order
          res.json(messages.reverse());
        }
      );
    }
  );
});

module.exports = router;