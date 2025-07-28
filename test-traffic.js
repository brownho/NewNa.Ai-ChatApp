const axios = require('axios');

async function testTraffic() {
    console.log('Sending test traffic to Ollama Chat App...');
    
    try {
        // Send a test chat request
        const response = await axios.post('http://localhost:3000/api/chat', {
            model: 'mixtral',
            messages: [
                { role: 'user', content: 'Hello! This is a test message.' }
            ],
            options: {
                temperature: 0.7
            }
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        console.log('Request sent successfully');
        
        // Wait a moment then check stats
        setTimeout(async () => {
            const stats = await axios.get('http://localhost:3000/api/traffic/stats');
            console.log('\nTraffic Stats:', JSON.stringify(stats.data, null, 2));
            
            const recent = await axios.get('http://localhost:3000/api/traffic/recent');
            console.log(`\nRecent Traffic: ${recent.data.count} entries`);
            if (recent.data.entries[0]) {
                console.log('Latest entry:', {
                    timestamp: recent.data.entries[0].timestamp,
                    ip: recent.data.entries[0].ip,
                    model: recent.data.entries[0].model,
                    responseTime: recent.data.entries[0].responseTime,
                    tokens: recent.data.entries[0].tokensGenerated
                });
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTraffic();