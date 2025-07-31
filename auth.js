const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

// JWT secret key - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Session-based authentication middleware
const authenticateSession = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  
  // Get user from database
  db.get('SELECT id, username, email, daily_message_count, last_message_date FROM users WHERE id = ?', 
    [req.session.userId], 
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    }
  );
};

// Check usage limits middleware
const checkUsageLimits = (req, res, next) => {
  const user = req.user;
  const today = new Date().toISOString().split('T')[0];
  
  // Reset daily count if it's a new day
  if (user.last_message_date !== today) {
    db.run('UPDATE users SET daily_message_count = 0, last_message_date = ? WHERE id = ?',
      [today, user.id],
      (err) => {
        if (err) console.error('Error resetting daily count:', err);
        user.daily_message_count = 0;
        user.last_message_date = today;
      }
    );
  }
  
  // Check if user has unlimited messages
  const unlimitedUsers = ['mike1014brown', 'sabrown0812'];
  console.log('Checking user:', user.username, 'Message count:', user.daily_message_count);
  
  if (unlimitedUsers.includes(user.username)) {
    console.log('User has unlimited messages:', user.username);
    // Skip limit check for unlimited users
    return next();
  }
  
  // Check if user has exceeded daily limit (50 for free users)
  const dailyLimit = 50; // You can make this dynamic based on user type
  if (user.daily_message_count >= dailyLimit) {
    return res.status(429).json({ 
      error: 'Daily message limit exceeded', 
      limit: dailyLimit,
      resetTime: 'midnight UTC'
    });
  }
  
  next();
};

// Register new user
const register = (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating account' });
    }
    
    // Insert user into database
    db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating account' });
        }
        
        // Create initial chat session
        const userId = this.lastID;
        db.run(
          'INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)',
          [userId, 'Default Session'],
          (err) => {
            if (err) console.error('Error creating default session:', err);
          }
        );
        
        res.json({ 
          message: 'Account created successfully',
          userId: userId
        });
      }
    );
  });
};

// Login user
const login = (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Find user by email
  db.get(
    'SELECT * FROM users WHERE email = ? AND is_active = 1',
    [email],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      bcrypt.compare(password, user.password_hash, (err, result) => {
        if (err || !result) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        // Generate JWT token (optional, for API access)
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        // Check admin status
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sabrown0812';
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sabrown0812@gmail.com';
        const isAdmin = user.username === ADMIN_USERNAME && user.email === ADMIN_EMAIL;
        
        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            dailyMessageCount: user.daily_message_count,
            totalMessages: user.total_messages,
            isAdmin: isAdmin
          },
          token
        });
      });
    }
  );
};

// Logout user
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

// Get user info
const getUserInfo = (req, res) => {
  const userId = req.user.id;
  
  db.get(
    `SELECT u.id, u.username, u.email, u.daily_message_count, u.total_messages,
            u.created_at, COUNT(DISTINCT cs.id) as session_count
     FROM users u
     LEFT JOIN chat_sessions cs ON u.id = cs.user_id
     WHERE u.id = ?
     GROUP BY u.id`,
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user info' });
      }
      
      // Add admin flag based on configuration
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sabrown0812';
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sabrown0812@gmail.com';
      
      user.isAdmin = user.username === ADMIN_USERNAME && user.email === ADMIN_EMAIL;
      
      res.json(user);
    }
  );
};

module.exports = {
  authenticateToken,
  authenticateSession,
  checkUsageLimits,
  register,
  login,
  logout,
  getUserInfo
};