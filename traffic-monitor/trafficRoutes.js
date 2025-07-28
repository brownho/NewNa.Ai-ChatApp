const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Create traffic routes for the monitoring dashboard
function createTrafficRoutes(trafficLogger) {
    // Get recent traffic (last 1000 entries from memory)
    router.get('/api/traffic/recent', (req, res) => {
        const recent = trafficLogger.getRecentTraffic();
        res.json({
            count: recent.length,
            entries: recent
        });
    });
    
    // Get list of available log files
    router.get('/api/traffic/logs', (req, res) => {
        const files = trafficLogger.getLogFiles();
        const fileInfo = files.map(filename => {
            const filePath = path.join(__dirname, 'logs', filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                date: filename.replace('traffic-', '').replace('.json', ''),
                size: stats.size,
                modified: stats.mtime
            };
        });
        res.json(fileInfo);
    });
    
    // Get specific log file data
    router.get('/api/traffic/logs/:filename', (req, res) => {
        const { filename } = req.params;
        
        // Security: ensure filename is safe
        if (!filename.match(/^traffic-\d{4}-\d{2}-\d{2}\.json$/)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        
        const data = trafficLogger.getLogData(filename);
        res.json(data);
    });
    
    // Get traffic statistics
    router.get('/api/traffic/stats', (req, res) => {
        const recent = trafficLogger.getRecentTraffic();
        
        // Calculate statistics
        const stats = {
            totalRequests: recent.length,
            averageResponseTime: 0,
            totalTokens: 0,
            uniqueIPs: new Set(),
            modelUsage: {},
            browserStats: {},
            osStats: {},
            hourlyDistribution: {},
            errorCount: 0
        };
        
        // Analyze recent traffic
        recent.forEach(entry => {
            // Response times
            if (entry.responseTime) {
                stats.averageResponseTime += entry.responseTime;
            }
            
            // Tokens
            stats.totalTokens += entry.tokensGenerated || 0;
            
            // Unique IPs
            stats.uniqueIPs.add(entry.ip);
            
            // Model usage
            const model = entry.model || 'unknown';
            stats.modelUsage[model] = (stats.modelUsage[model] || 0) + 1;
            
            // Browser stats
            const browser = entry.metadata?.browser || 'unknown';
            stats.browserStats[browser] = (stats.browserStats[browser] || 0) + 1;
            
            // OS stats
            const os = entry.metadata?.os || 'unknown';
            stats.osStats[os] = (stats.osStats[os] || 0) + 1;
            
            // Hourly distribution
            const hour = new Date(entry.timestamp).getHours();
            stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;
            
            // Errors
            if (entry.error || entry.status >= 400) {
                stats.errorCount++;
            }
        });
        
        // Finalize calculations
        stats.averageResponseTime = stats.totalRequests > 0 
            ? Math.round(stats.averageResponseTime / stats.totalRequests) 
            : 0;
        stats.uniqueIPs = stats.uniqueIPs.size;
        
        res.json(stats);
    });
    
    // Search traffic logs
    router.post('/api/traffic/search', (req, res) => {
        const { query, startDate, endDate, ip, model } = req.body;
        const results = [];
        
        // Get date range of files to search
        const files = trafficLogger.getLogFiles();
        const relevantFiles = files.filter(filename => {
            const fileDate = filename.replace('traffic-', '').replace('.json', '');
            return (!startDate || fileDate >= startDate) && 
                   (!endDate || fileDate <= endDate);
        });
        
        // Search through relevant files
        relevantFiles.forEach(filename => {
            const data = trafficLogger.getLogData(filename);
            
            data.forEach(entry => {
                let match = true;
                
                // Filter by IP
                if (ip && entry.ip !== ip) match = false;
                
                // Filter by model
                if (model && entry.model !== model) match = false;
                
                // Search in messages
                if (query && match) {
                    const searchStr = JSON.stringify(entry.messages).toLowerCase();
                    if (!searchStr.includes(query.toLowerCase())) {
                        match = false;
                    }
                }
                
                if (match) {
                    results.push(entry);
                }
            });
        });
        
        // Sort by timestamp descending
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            count: results.length,
            results: results.slice(0, 1000) // Limit to 1000 results
        });
    });
    
    // Export traffic data as CSV
    router.get('/api/traffic/export/:filename', (req, res) => {
        const { filename } = req.params;
        
        // Security: ensure filename is safe
        if (!filename.match(/^traffic-\d{4}-\d{2}-\d{2}\.json$/)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        
        const data = trafficLogger.getLogData(filename);
        
        // Convert to CSV
        const csv = [
            'Timestamp,IP,Model,Response Time (ms),Tokens,Status,Browser,OS,Messages',
            ...data.map(entry => {
                const messages = entry.messages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join(' | ');
                return [
                    entry.timestamp,
                    entry.ip,
                    entry.model,
                    entry.responseTime || '',
                    entry.tokensGenerated || 0,
                    entry.status || '',
                    entry.metadata?.browser || '',
                    entry.metadata?.os || '',
                    `"${messages.replace(/"/g, '""')}"`
                ].join(',');
            })
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.json', '.csv')}"`);
        res.send(csv);
    });
    
    return router;
}

module.exports = createTrafficRoutes;