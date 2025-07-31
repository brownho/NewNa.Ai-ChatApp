// API Configuration
// For development, use your local IP address or ngrok URL
// For production, use your actual server URL

// Examples:
// Local development: 'http://192.168.1.100:3000'
// Ngrok: 'https://your-ngrok-id.ngrok.io'
// Production: 'https://api.newna.ai'

// Current server configuration
// Option 1: Direct local IP (requires accepting self-signed certificate)
// export const API_BASE_URL = 'https://192.168.4.105:3000';

// Option 2: Using ngrok (recommended for iOS development)
// 1. Run: ./ngrok http 3000
// 2. Copy the https URL from ngrok output (e.g., https://abc123.ngrok-free.app)
// 3. Update the URL below
export const API_BASE_URL = 'https://YOUR-NGROK-ID.ngrok-free.app'; // Replace with your ngrok URL

// App Configuration
export const APP_CONFIG = {
  DEFAULT_MODEL: 'mixtral',
  MESSAGE_LIMIT_GUEST: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/json',
  ],
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  IS_GUEST: 'isGuest',
  SELECTED_MODEL: 'selectedModel',
  THEME: 'theme',
};