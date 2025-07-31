# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack web application providing a ChatGPT-like interface for local Ollama models with user authentication, guest access, chat sessions, file uploads, meeting assistance, traffic monitoring, and admin dashboard.

## Development Commands

```bash
# Install dependencies
npm install

# Run the application
npm start                  # HTTP mode (default port 3000)
npm run start:https        # HTTPS mode (requires certs setup)

# Test traffic monitoring
node test-traffic.js

# Database operations
rm chat.db && npm start    # Reset database completely

# Ollama prerequisites
ollama pull mixtral        # Default model
ollama list               # Verify models installed
```

## Architecture & Critical Patterns

### Backend Structure
The backend is intentionally monolithic with these key files:
- `server.js` - Main Express server with all routes defined inline (no route modules)
- `auth.js` - JWT-based authentication with session management
- `database.js` - Raw SQLite3 queries (no ORM)
- `config/constants.js` - Centralized configuration
- `middleware/rateLimiting.js` - Usage limits and rate limiting
- `traffic-monitor/trafficLogger.js` - Request logging with daily rotation

### Frontend Architecture
Vanilla JavaScript with modular approach:
- Entry points: `public/index.html` (chat), `public/login.html` (auth), `public/dashboard.html` (admin)
- All JS modules in `public/` use global variables for cross-component communication
- `window.selectedModel` - Global model selection
- No build process - direct script imports in HTML

### Critical Implementation Patterns

1. **Authentication**: All authenticated requests MUST include `credentials: 'include'`
   ```javascript
   fetch('/api/endpoint', {
     credentials: 'include',  // Required for session cookies
     // ...
   })
   ```

2. **Database Access**: Direct SQL queries without ORM
   ```javascript
   db.get('SELECT * FROM users WHERE id = ?', [userId], callback)
   db.run('INSERT INTO chat_messages...', params, callback)
   ```

3. **Chat Flow**: Messages go through validation → database → Ollama → response
   - Authenticated: `/api/chat` (saves to DB)
   - Guest: `/api/guest/chat` (no persistence)

4. **WebSocket**: Used for real-time traffic monitoring at `/traffic`

5. **File Uploads**: Multer middleware, 10MB limit, stored in `uploads/`

## Environment Configuration

```bash
# .env file (create if missing)
USE_HTTPS=true              # Enable HTTPS
OLLAMA_API_URL=http://localhost:11434/api/chat
DAILY_MESSAGE_LIMIT=50
GUEST_MESSAGE_LIMIT=10
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

## Common Tasks

### Adding New Features
1. Add routes directly in `server.js` (no separate route files)
2. Add frontend logic in `public/` with direct script imports
3. Use existing patterns for consistency

### Debugging Issues
- Check browser console for frontend errors
- Server logs to console (use `npm start` to see logs)
- SQLite DB viewable with any SQLite client
- Traffic logs in `traffic-monitor/logs/`

### Testing
No automated testing framework - use manual testing:
- `node test-traffic.js` - Test traffic monitoring
- Browser testing for UI features
- Postman/curl for API endpoints

## Important Constraints

1. **No Build Process** - Vanilla JS only, no webpack/babel
2. **Monolithic Server** - All routes in `server.js`, avoid modularization
3. **Global State** - Frontend uses global variables, not module exports
4. **Raw SQL** - No ORM, direct SQLite3 queries
5. **Session-Based Auth** - Express sessions with cookies, not stateless JWT