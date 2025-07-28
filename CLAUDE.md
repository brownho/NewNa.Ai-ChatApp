# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack web application that provides a ChatGPT-like interface for local Ollama models. The app features user authentication, guest access, chat sessions, file uploads, meeting assistance with AI coaching, comprehensive traffic monitoring, and an admin dashboard.

## Development Commands

### Running the Application
```bash
# Install dependencies
npm install

# Start the server (production)
npm start

# Start the server (development mode with nodemon)
npm dev

# The server runs on port 3000 by default (HTTP) or port 3000 (HTTPS)

# HTTPS Configuration
# 1. Generate self-signed certificates:
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# 2. Enable HTTPS in .env:
# USE_HTTPS=true

# 3. Access via https://localhost:3000
```

### Database Management
```bash
# The SQLite database is automatically created on first run
# Database file: chat.db

# To reset the database, delete chat.db and restart the server
rm chat.db
npm start
```

### Testing Traffic Monitoring
```bash
node test-traffic.js
```

### Ollama Prerequisites
```bash
# Ensure Ollama is installed and running
# Pull at least one model before starting
ollama pull mixtral  # or another model
ollama list  # Verify models are installed
```

## Architecture & Code Structure

### Backend Architecture

The backend is a monolithic Express.js application (`server.js`) with the following key components:

1. **Authentication System**: JWT-based auth with session management, stored in SQLite
2. **Database Layer**: SQLite3 with comprehensive schema for users, chats, meetings, and analytics
3. **WebSocket Support**: Real-time features for traffic monitoring and chat updates
4. **File Handling**: Multer-based file uploads with restrictions
5. **Traffic Monitoring**: Custom middleware tracking all requests, with daily log rotation

Key middleware and route organization:
- Authentication middleware checks session validity
- Traffic monitoring middleware logs all requests
- Routes are defined inline in server.js (not modularized)

### Frontend Architecture

The frontend uses vanilla JavaScript with a modular approach:

1. **Main Entry**: `public/index.html` - Chat interface
2. **Authentication**: `public/login.html` - User registration/login
3. **JavaScript Modules**: Located in `public/`:
   - `script.js` - Main chat interface logic
   - `chat-history-sidebar.js` - Collapsible sidebar for chat sessions
   - `code-execution.js` - Sandboxed code execution interface
   - `file-upload.js` - File upload handling
   - `meeting-assistant.js` - Basic meeting features
   - `meeting-mentor.js` - AI-powered meeting coaching (popup version)
   - `meeting-mentor-fullscreen.js` - Full-screen meeting assistant with AI coaching
   - `meeting-ui-controller.js` - Unified meeting UI controller
   - `performance-metrics.js` - Response time tracking
   - `model-parameters.js` - Model parameter controls
   - `sharing.js` - Chat sharing functionality
   - `auth.js` - Client-side authentication logic
   - `dashboard.js` - Admin dashboard functionality

The frontend communicates with the backend via REST APIs and WebSocket for real-time features.

### Database Schema

Key tables and their relationships:
- `users` - User accounts with auth tokens
- `chat_sessions` - Chat conversations linked to users
- `chat_messages` - Individual messages in sessions
- `meetings` - Meeting records with participants and transcripts
- `user_profiles` - Extended user information

## Critical Implementation Details

### Authentication Flow
1. User registers/logs in via `/api/auth/register` or `/api/auth/login` endpoints
2. Server creates session and returns auth token
3. Frontend stores user data in localStorage
4. All authenticated requests include `credentials: 'include'` for session cookies
5. Guest users can access limited features without authentication

### Chat Message Flow
1. User sends message via POST to `/api/chat` (authenticated) or `/api/guest/chat` (guests)
2. Server validates session and user limits
3. Message is saved to database (authenticated users only)
4. Server forwards to Ollama API at `http://localhost:11434/api/chat`
5. Response is returned to client and saved (authenticated users only)

### Traffic Monitoring
- All requests are logged with detailed metrics
- Logs rotate daily at midnight
- Real-time dashboard available at `/traffic`
- WebSocket connection for live updates

### File Upload Constraints
- Max file size: 10MB
- Allowed types: Images, documents, code files
- Files stored in `uploads/` directory
- Linked to chat messages in database

## Common Development Tasks

### Adding New API Endpoints
Add routes directly in `server.js` following the existing pattern:
```javascript
app.post('/your-endpoint', authenticateToken, async (req, res) => {
  // Implementation
});
```

### Modifying Frontend Features
1. Edit relevant JavaScript files in `public/js/`
2. No build step required - changes are immediate
3. Clear browser cache if changes don't appear

### Database Schema Changes
1. Modify the table creation in `server.js`
2. Delete `chat.db` to recreate with new schema
3. Consider data migration for production

### Debugging
- Server logs to console and journal (if using systemd)
- Check browser console for frontend errors
- SQLite database can be inspected with any SQLite client

## Deployment Notes

The project includes several deployment configurations:
- Systemd service file for auto-start
- Support for ngrok, Cloudflare tunnels, etc.
- See SETUP.md for detailed deployment instructions

## New Features Added

### Meeting Mentor Full-Screen
- Full-screen meeting assistant with real-time transcription
- AI-powered coaching suggestions based on meeting context
- Automatic action item detection
- Meeting summary generation
- User profile customization for personalized suggestions
- Meeting description field for better AI context
- Guest user support
- Mobile-responsive design with proper scrolling
- Export meeting notes functionality

### Chat History Sidebar
- Collapsible sidebar replacing dropdown menu
- Search functionality for sessions
- Session management (create, rename, delete)
- Visual indicators for active sessions
- Smooth animations and transitions

### Guest Access
- Users can access chat without authentication
- Limited to basic features
- No data persistence
- Meetings work for guests with local storage

### Admin Dashboard
- Located at `/dashboard.html`
- Real-time traffic analytics
- User statistics and activity monitoring
- System status monitoring
- Database metrics
- Only accessible to authenticated users

### HTTPS Support
- Built-in HTTPS configuration
- Self-signed certificate generation
- Configurable via .env file
- Required for microphone access on remote devices

## Important Conventions

1. **No Build Process**: This is a vanilla JS project - no bundling or transpilation
2. **Direct Database Access**: No ORM layer - raw SQL queries throughout
3. **Inline Styles**: CSS is mostly in HTML files, not separate stylesheets
4. **Session Storage**: Uses Express sessions with cookies for authentication
5. **Error Handling**: Try-catch blocks around all async operations
6. **Module Structure**: Server code is in monolithic `server.js`, authentication in `auth.js`, database in `database.js`
7. **No Testing Framework**: No automated tests configured - manual testing only
8. **Deployment Scripts**: Multiple deployment scripts for different environments (VPS, GoDaddy, Cloudflare)
9. **Global Variables**: Model selection exposed as `window.selectedModel` for cross-component access
10. **Credentials**: All fetch requests requiring auth must include `credentials: 'include'`