module.exports = {
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Rate limiting
  DAILY_MESSAGE_LIMIT: parseInt(process.env.DAILY_MESSAGE_LIMIT) || 50,
  GUEST_MESSAGE_LIMIT: parseInt(process.env.GUEST_MESSAGE_LIMIT) || 10,
  
  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'text/plain', 'text/html', 'text/css', 'text/javascript',
    'application/json', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/javascript', 'application/x-python-code',
    'text/x-python', 'text/markdown'
  ],
  
  // API endpoints
  OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat',
  OLLAMA_MODELS_URL: process.env.OLLAMA_MODELS_URL || 'http://localhost:11434/api/tags',
  
  // Admin users (should be in database in production)
  ADMIN_USERS: {
    username: 'sabrown0812',
    email: 'sabrown0812@gmail.com'
  },
  
  // Server
  PORT: process.env.PORT || 3000,
  USE_HTTPS: process.env.USE_HTTPS === 'true',
  
  // Paths
  UPLOAD_DIR: 'uploads',
  CERT_PATH: 'certs/cert.pem',
  KEY_PATH: 'certs/key.pem'
};