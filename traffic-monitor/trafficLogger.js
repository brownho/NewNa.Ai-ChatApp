const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
    
    // Save log entry to file
    function saveLogEntry(entry) {
        const logFile = getLogFilePath();
        let logs = loadTodayLogs();
        logs.push(entry);
        
        try {
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (err) {
            console.error('Error saving log entry:', err);
        }
    }
    
    // Middleware function
    const middleware = async (req, res, next) => {
        // Only log chat API calls
        if (req.path !== '/api/chat' || req.method !== 'POST') {
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
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (data.message?.content) {
                            tokenCount++;
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