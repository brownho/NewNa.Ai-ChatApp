const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create and open database
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      daily_message_count INTEGER DEFAULT 0,
      last_message_date DATE,
      total_messages INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Chat sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    )
  `);

  // Usage limits table
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type TEXT DEFAULT 'free',
      daily_message_limit INTEGER DEFAULT 50,
      model_access TEXT DEFAULT 'basic'
    )
  `);

  // Insert default usage limits
  db.run(`
    INSERT OR IGNORE INTO usage_limits (user_type, daily_message_limit, model_access)
    VALUES 
      ('free', 50, 'basic'),
      ('premium', 500, 'all')
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

  // Meeting-related tables
  db.run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      scheduled_date DATETIME,
      actual_start DATETIME,
      actual_end DATETIME,
      duration INTEGER,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      user_id INTEGER,
      participant_name TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'participant',
      joined_at DATETIME,
      left_at DATETIME,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      speaker_id INTEGER,
      speaker_name TEXT,
      text TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      confidence REAL,
      is_interim BOOLEAN DEFAULT 0,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (speaker_id) REFERENCES meeting_participants(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      suggestion_text TEXT NOT NULL,
      context TEXT,
      relevance_score REAL,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      assigned_to TEXT,
      due_date DATETIME,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      summary TEXT NOT NULL,
      key_points TEXT,
      decisions TEXT,
      next_steps TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      job_title TEXT,
      department TEXT,
      responsibilities TEXT,
      communication_style TEXT,
      meeting_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes for meeting tables
  db.run(`CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON meeting_transcripts(meeting_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_meeting_id ON meeting_participants(meeting_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_action_items_meeting_id ON meeting_action_items(meeting_id)`);

  // Traffic logs table for analytics
  db.run(`
    CREATE TABLE IF NOT EXISTS traffic_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      method TEXT,
      path TEXT,
      user_type TEXT,
      user_id INTEGER,
      username TEXT,
      model TEXT,
      messages TEXT, -- JSON string
      metadata TEXT, -- JSON string
      response_time INTEGER,
      tokens_generated INTEGER,
      status_code INTEGER,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes for traffic analytics
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_user_id ON traffic_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_user_type ON traffic_logs(user_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_model ON traffic_logs(model)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_status ON traffic_logs(status_code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_traffic_path ON traffic_logs(path)`);
});

module.exports = db;