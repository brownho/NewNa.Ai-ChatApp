const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../database');

// Get meeting history for authenticated user
router.get('/history', (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT m.*, 
            COUNT(DISTINCT mt.id) as transcript_count,
            COUNT(DISTINCT mai.id) as action_count
     FROM meetings m
     LEFT JOIN meeting_transcripts mt ON m.id = mt.meeting_id
     LEFT JOIN meeting_action_items mai ON m.id = mai.meeting_id
     WHERE m.user_id = ?
     GROUP BY m.id
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [userId],
    (err, meetings) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Error fetching meeting history' });
      }
      res.json(meetings);
    }
  );
});

// Get specific meeting details
router.get('/:meetingId', (req, res) => {
  const userId = req.user.id;
  const meetingId = req.params.meetingId;
  
  // Verify meeting belongs to user
  db.get(
    'SELECT * FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err || !meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      // Get transcript
      db.all(
        'SELECT * FROM meeting_transcripts WHERE meeting_id = ? ORDER BY timestamp',
        [meetingId],
        (err, transcript) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching transcript' });
          }
          
          // Get action items
          db.all(
            'SELECT * FROM meeting_action_items WHERE meeting_id = ?',
            [meetingId],
            (err, actionItems) => {
              if (err) {
                return res.status(500).json({ error: 'Error fetching action items' });
              }
              
              // Get participants
              db.all(
                'SELECT * FROM meeting_participants WHERE meeting_id = ?',
                [meetingId],
                (err, participants) => {
                  if (err) {
                    return res.status(500).json({ error: 'Error fetching participants' });
                  }
                  
                  meeting.transcript = transcript;
                  meeting.actionItems = actionItems;
                  meeting.participants = participants;
                  
                  res.json(meeting);
                }
              );
            }
          );
        }
      );
    }
  );
});

// Create new meeting
router.post('/', (req, res) => {
  const { title, description, participants = [] } = req.body;
  const userId = req.user.id;
  
  db.run(
    'INSERT INTO meetings (user_id, title, description, actual_start) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [userId, title || 'Untitled Meeting', description || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create meeting' });
      }
      
      const meetingId = this.lastID;
      
      // Add participants if provided
      if (participants.length > 0) {
        const participantValues = participants.map(p => 
          `(${meetingId}, ${p.userId || 'NULL'}, '${p.name}', '${p.email || ''}', 'participant')`
        ).join(',');
        
        db.run(
          `INSERT INTO meeting_participants (meeting_id, user_id, participant_name, email, role) VALUES ${participantValues}`,
          (err) => {
            if (err) console.error('Error adding participants:', err);
          }
        );
      }
      
      res.json({ 
        id: meetingId,
        title: title || 'Untitled Meeting',
        description: description || '',
        actual_start: new Date().toISOString()
      });
    }
  );
});

// Save meeting transcript entry
router.post('/:meetingId/transcript', (req, res) => {
  const userId = req.user.id;
  const meetingId = req.params.meetingId;
  const { speaker_name, text, timestamp, is_interim } = req.body;
  
  // Verify meeting belongs to user
  db.get(
    'SELECT id FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err || !meeting) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      db.run(
        'INSERT INTO meeting_transcripts (meeting_id, speaker_name, text, timestamp, is_interim) VALUES (?, ?, ?, ?, ?)',
        [meetingId, speaker_name || 'Unknown', text, timestamp || new Date().toISOString(), is_interim || 0],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save transcript' });
          }
          res.json({ id: this.lastID });
        }
      );
    }
  );
});

// Compact transcript for long meetings
router.post('/compact-transcript', async (req, res) => {
  const { transcript, meetingContext } = req.body;
  
  if (!transcript || !transcript.length) {
    return res.status(400).json({ error: 'No transcript provided' });
  }
  
  try {
    // Use AI to summarize and compact the transcript
    const response = await axios.post(
      process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat',
      {
        model: 'jaahas',
        messages: [
          {
            role: 'system',
            content: 'You are a meeting assistant. Summarize the transcript by grouping related discussions, removing redundancy, and preserving key information and context.'
          },
          {
            role: 'user',
            content: `Meeting Context: ${meetingContext || 'General meeting'}\n\nTranscript to compact:\n${JSON.stringify(transcript)}\n\nProvide a compacted version that preserves important details while reducing redundancy.`
          }
        ],
        stream: false
      }
    );
    
    res.json({ compactedTranscript: response.data.message.content });
  } catch (error) {
    console.error('Error compacting transcript:', error);
    res.status(500).json({ error: 'Failed to compact transcript' });
  }
});

// Chat with meeting context
router.post('/chat', async (req, res) => {
  const { message, context, model } = req.body;
  
  try {
    // Build context string
    let contextString = '';
    if (context.meetingTitle) {
      contextString += `Meeting Title: ${context.meetingTitle}\n`;
    }
    if (context.meetingDescription) {
      contextString += `Meeting Description: ${context.meetingDescription}\n`;
    }
    if (context.transcript && context.transcript.length) {
      contextString += `\nTranscript:\n${typeof context.transcript === 'string' ? context.transcript : JSON.stringify(context.transcript)}\n`;
    }
    if (context.actionItems && context.actionItems.length) {
      contextString += `\nAction Items:\n${JSON.stringify(context.actionItems)}\n`;
    }
    if (context.keyPoints && context.keyPoints.length) {
      contextString += `\nKey Points:\n${JSON.stringify(context.keyPoints)}\n`;
    }
    
    const response = await axios.post(
      process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat',
      {
        model: model || 'jaahas',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful meeting assistant. Answer questions about the meeting based on the provided context. Be concise and relevant.'
          },
          {
            role: 'user',
            content: `Meeting Context:\n${contextString}\n\nQuestion: ${message}`
          }
        ],
        stream: false
      }
    );
    
    res.json({ response: response.data.message.content });
  } catch (error) {
    console.error('Error in meeting chat:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Save action item
router.post('/:meetingId/actions', (req, res) => {
  const userId = req.user.id;
  const meetingId = req.params.meetingId;
  const { description, assigned_to, due_date } = req.body;
  
  // Verify meeting belongs to user
  db.get(
    'SELECT id FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err || !meeting) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      db.run(
        'INSERT INTO meeting_action_items (meeting_id, description, assigned_to, due_date) VALUES (?, ?, ?, ?)',
        [meetingId, description, assigned_to || null, due_date || null],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save action item' });
          }
          res.json({ 
            id: this.lastID,
            description,
            assigned_to,
            due_date,
            status: 'pending'
          });
        }
      );
    }
  );
});

// Update meeting
router.put('/:meetingId', (req, res) => {
  const userId = req.user.id;
  const meetingId = req.params.meetingId;
  const { title, description, actual_end, duration } = req.body;
  
  db.run(
    `UPDATE meetings 
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         actual_end = COALESCE(?, actual_end),
         duration = COALESCE(?, duration),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [title, description, actual_end, duration, meetingId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update meeting' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      res.json({ success: true });
    }
  );
});

// Save meeting summary
router.post('/:meetingId/summary', (req, res) => {
  const userId = req.user.id;
  const meetingId = req.params.meetingId;
  const { summary, key_points, decisions, next_steps } = req.body;
  
  // Verify meeting belongs to user
  db.get(
    'SELECT id FROM meetings WHERE id = ? AND user_id = ?',
    [meetingId, userId],
    (err, meeting) => {
      if (err || !meeting) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      db.run(
        `INSERT OR REPLACE INTO meeting_summaries 
         (meeting_id, summary, key_points, decisions, next_steps) 
         VALUES (?, ?, ?, ?, ?)`,
        [meetingId, summary, key_points, decisions, next_steps],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save summary' });
          }
          res.json({ success: true });
        }
      );
    }
  );
});

module.exports = router;