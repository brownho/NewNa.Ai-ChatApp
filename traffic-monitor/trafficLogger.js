const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Get client IP address handling proxies
function getClientIP(req) {
    // Check for forwarded IPs (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    // Check for real IP headers
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    
    // Fallback to connection remote address
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.connection.socket?.remoteAddress || 
           'unknown';
}

// Extract additional metadata from request
function extractMetadata(req) {
    return {
        userAgent: req.headers['user-agent'] || 'unknown',
        referer: req.headers['referer'] || 'direct',
        acceptLanguage: req.headers['accept-language'] || 'unknown',
        contentLength: req.headers['content-length'] || 0,
        origin: req.headers['origin'] || 'unknown',
        // Extract browser and OS info from user agent
        browser: extractBrowser(req.headers['user-agent'] || ''),
        os: extractOS(req.headers['user-agent'] || '')
    };
}

// Simple browser detection
function extractBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Other';
}

// Simple OS detection
function extractOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Other';
}

// Traffic logger middleware
function trafficLogger() {
    // In-memory storage for recent traffic (for real-time monitoring)
    const recentTraffic = [];
    const MAX_RECENT_ENTRIES = 1000;
    
    // Daily log rotation
    function getLogFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(logsDir, `traffic-${date}.json`);
    }
    
    // Load existing log entries for today
    function loadTodayLogs() {
        const logFile = getLogFilePath();
        if (fs.existsSync(logFile)) {
            try {
                const data = fs.readFileSync(logFile, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                console.error('Error loading log file:', err);
                return [];
            }
        }
        return [];
    }
    
    // Save log entry to file and database
    function saveLogEntry(entry) {
        // Save to file (for backward compatibility)
        const logFile = getLogFilePath();
        let logs = loadTodayLogs();
        logs.push(entry);
        
        try {
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (err) {
            console.error('Error saving log entry to file:', err);
        }
        
        // Save to database
        try {
            db.run(`
                INSERT INTO traffic_logs (
                    request_id, timestamp, ip_address, method, path,
                    user_type, user_id, username, model, messages,
                    metadata, response_time, tokens_generated,
                    status_code, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                entry.id,
                entry.timestamp,
                entry.ip,
                entry.method,
                entry.path,
                entry.userType,
                entry.userId,
                entry.username,
                entry.model,
                JSON.stringify(entry.messages),
                JSON.stringify(entry.metadata),
                entry.responseTime,
                entry.tokensGenerated,
                entry.status,
                entry.error
            ], (err) => {
                if (err) {
                    console.error('Error saving traffic log to database:', err);
                }
            });
        } catch (err) {
            console.error('Error preparing traffic log for database:', err);
        }
    }
    
    // Middleware function
    const middleware = async (req, res, next) => {
        // Log both authenticated and guest chat API calls
        const isChat = (req.path === '/api/chat' || req.path === '/api/guest/chat') && req.method === 'POST';
        if (!isChat) {
            return next();
        }
        
        const startTime = Date.now();
        const requestId = uuidv4();
        
        // Capture request data
        const logEntry = {
            id: requestId,
            timestamp: new Date().toISOString(),
            ip: getClientIP(req),
            method: req.method,
            path: req.path,
            userType: req.path === '/api/guest/chat' ? 'guest' : 'authenticated',
            userId: null, // Will be filled later
            username: 'guest', // Will be updated later
            model: req.body.model || 'default',
            messages: req.body.messages || [],
            options: req.body.options || {},
            metadata: extractMetadata(req),
            // Will be filled after response
            responseTime: null,
            tokensGenerated: null,
            error: null,
            status: null
        };
        
        // Store request ID for response tracking
        req.trafficLogId = requestId;
        
        // Override res.write to capture streaming response
        const originalWrite = res.write;
        let responseChunks = [];
        let tokenCount = 0;
        
        res.write = function(chunk, encoding) {
            responseChunks.push(chunk);
            
            // Try to count tokens from streaming response
            try {
                const chunkStr = chunk.toString();
                const lines = chunkStr.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        // Ollama sends JSON directly, not with 'data:' prefix
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            // Count actual content length for token estimation
                            const text = data.message.content;
                            const words = text.split(/[\s\.,!?;:]+/).filter(w => w.length > 0);
                            tokenCount += Math.ceil(words.length * 1.3);
                        }
                        
                        // Also capture final token count from eval_count
                        if (data.done && data.eval_count) {
                            tokenCount = data.eval_count;
                        }
                    } catch (parseErr) {
                        // Some lines might be SSE format with 'data:' prefix
                        if (line.startsWith('data: ')) {
                            const data = JSON.parse(line.slice(6));
                            if (data.message?.content) {
                                const text = data.message.content;
                                const words = text.split(/[\s\.,!?;:]+/).filter(w => w.length > 0);
                                tokenCount += Math.ceil(words.length * 1.3);
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore parsing errors
            }
            
            return originalWrite.call(this, chunk, encoding);
        };
        
        // Capture response end
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            if (chunk) {
                responseChunks.push(chunk);
            }
            
            // Calculate response metrics
            logEntry.responseTime = Date.now() - startTime;
            logEntry.tokensGenerated = tokenCount;
            logEntry.status = res.statusCode;
            
            // Update user info if available (after auth middleware has run)
            if (req.user) {
                logEntry.userId = req.user.id;
                logEntry.username = req.user.username;
            }
            
            // Save to file and memory
            saveLogEntry(logEntry);
            
            // Add to recent traffic (for real-time monitoring)
            recentTraffic.unshift(logEntry);
            if (recentTraffic.length > MAX_RECENT_ENTRIES) {
                recentTraffic.pop();
            }
            
            // Emit to WebSocket if available
            if (middleware.emit) {
                middleware.emit('traffic', logEntry);
            }
            
            return originalEnd.call(this, chunk, encoding);
        };
        
        // Handle errors
        res.on('error', (error) => {
            logEntry.error = error.message;
            logEntry.responseTime = Date.now() - startTime;
            saveLogEntry(logEntry);
        });
        
        next();
    };
    
    // Attach methods to middleware
    middleware.getRecentTraffic = () => recentTraffic;
    middleware.getLogFiles = () => {
        try {
            return fs.readdirSync(logsDir)
                .filter(file => file.startsWith('traffic-') && file.endsWith('.json'))
                .sort()
                .reverse();
        } catch (err) {
            console.error('Error reading log files:', err);
            return [];
        }
    };
    middleware.getLogData = (filename) => {
        try {
            const data = fs.readFileSync(path.join(logsDir, filename), 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Error reading log file:', err);
            return [];
        }
    };
    
    return middleware;
}

module.exports = trafficLogger;