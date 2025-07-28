# Ollama Chat Traffic Monitor

A comprehensive traffic monitoring utility for the Ollama Chat App that tracks all prompts, responses, and metadata.

## Features

- **Real-time Traffic Monitoring**: Live updates via WebSocket
- **Request Logging**: Captures all chat requests with metadata including:
  - IP addresses (handles proxies)
  - User agents, browsers, and operating systems
  - Model usage
  - Response times
  - Token counts
  - Error tracking
- **Dashboard Analytics**:
  - Statistics cards (total requests, avg response time, tokens, error rate)
  - Charts for hourly distribution, model usage, browser/OS distribution
  - Live traffic table with filtering
  - Historical log viewing
  - Search functionality
- **Data Export**: Export traffic data as CSV
- **Automatic Log Rotation**: Daily log files

## Usage

1. The traffic monitor is automatically integrated when you start the server:
   ```bash
   npm start
   ```

2. Access the dashboard at:
   ```
   http://localhost:3000/traffic-monitor/dashboard.html
   ```

## Dashboard Features

### Live Traffic Tab
- Real-time updates of incoming requests
- Filter by model or IP address
- Click on messages to view full details
- Export current view as CSV

### Historical Logs Tab
- Browse daily log files
- View past traffic data
- Download log files

### Search Tab
- Search across all logs by:
  - Message content
  - Date range
  - IP address
  - Model
- Export search results

## Log Storage

Logs are stored in `traffic-monitor/logs/` directory with daily rotation:
- Format: `traffic-YYYY-MM-DD.json`
- Each entry contains complete request/response metadata
- Logs are automatically created and rotated daily

## Security Notes

- IP addresses are logged for monitoring purposes
- No authentication tokens or sensitive data are logged
- File access is restricted to prevent directory traversal
- Safe command execution with whitelisted commands only

## Performance

- Minimal overhead on request processing
- In-memory storage for recent 1000 entries
- Efficient file-based storage for historical data
- WebSocket for real-time updates without polling