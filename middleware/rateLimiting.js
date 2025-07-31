const db = require('../database');

// Configuration
const DAILY_MESSAGE_LIMIT = parseInt(process.env.DAILY_MESSAGE_LIMIT) || 50;

// Check usage limits middleware
const checkUsageLimits = (req, res, next) => {
  const user = req.user;
  const today = new Date().toISOString().split('T')[0];
  
  // Reset daily count if it's a new day
  if (user.last_message_date !== today) {
    db.run(
      'UPDATE users SET daily_message_count = 0, last_message_date = ? WHERE id = ?',
      [today, user.id],
      (err) => {
        if (err) {
          console.error('Error resetting daily count:', err);
        }
        user.daily_message_count = 0;
        user.last_message_date = today;
        checkLimit();
      }
    );
  } else {
    checkLimit();
  }
  
  function checkLimit() {
    if (user.daily_message_count >= DAILY_MESSAGE_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily message limit reached',
        limit: DAILY_MESSAGE_LIMIT,
        resetTime: new Date(today + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000
      });
    }
    next();
  }
};

// Rate limiting for specific endpoints
const createRateLimiter = (windowMs, maxRequests) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.user ? req.user.id : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [k, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, filtered);
      }
    }
    
    // Check current user
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(t => t > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    next();
  };
};

module.exports = {
  checkUsageLimits,
  createRateLimiter
};