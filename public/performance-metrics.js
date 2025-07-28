// Performance Metrics for BrownFi Local LLMs

class PerformanceMetrics {
    constructor() {
        this.currentMetrics = {
            startTime: null,
            endTime: null,
            firstTokenTime: null,
            tokenCount: 0,
            charCount: 0,
            tokensPerSecond: 0,
            responseTime: 0,
            streaming: false,
            abortController: null
        };
        
        this.sessionStats = {
            totalMessages: 0,
            totalTokens: 0,
            totalTime: 0,
            avgResponseTime: 0,
            avgTokensPerSecond: 0
        };
        
        this.initUI();
        this.loadSessionStats();
    }
    
    initUI() {
        // Add metrics display to header
        const modelInfo = document.querySelector('.model-info');
        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'performance-metrics';
        metricsDiv.innerHTML = `
            <span id="response-time" class="metric" title="Response time">--ms</span>
            <span id="tokens-per-second" class="metric" title="Tokens per second">--t/s</span>
            <span id="token-count" class="metric" title="Token count">--tokens</span>
        `;
        modelInfo.appendChild(metricsDiv);
        
        // Get metric elements
        this.responseTimeEl = document.getElementById('response-time');
        this.tokensPerSecondEl = document.getElementById('tokens-per-second');
        this.tokenCountEl = document.getElementById('token-count');
        
        // Add stop button (initially hidden)
        const stopBtn = document.createElement('button');
        stopBtn.id = 'stop-generation';
        stopBtn.className = 'stop-generation-btn';
        stopBtn.innerHTML = '⏹ Stop';
        stopBtn.style.display = 'none';
        stopBtn.onclick = () => this.stopGeneration();
        document.querySelector('.input-container').appendChild(stopBtn);
        this.stopBtn = stopBtn;
        
        // Add session stats panel
        const statsPanel = document.createElement('div');
        statsPanel.className = 'stats-panel';
        statsPanel.innerHTML = `
            <button class="stats-toggle" onclick="performanceMetrics.toggleStats()">📊</button>
            <div class="stats-content" style="display: none;">
                <h3>Session Statistics</h3>
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Messages</div>
                        <div class="stat-value" id="stat-messages">0</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Tokens</div>
                        <div class="stat-value" id="stat-tokens">0</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Response Time</div>
                        <div class="stat-value" id="stat-avg-time">--</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Speed</div>
                        <div class="stat-value" id="stat-avg-speed">--</div>
                    </div>
                </div>
                <button class="reset-stats-btn" onclick="performanceMetrics.resetStats()">Reset Stats</button>
            </div>
        `;
        document.body.appendChild(statsPanel);
        this.statsPanel = statsPanel;
        
        // Add keyboard shortcut for stop
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentMetrics.streaming) {
                this.stopGeneration();
            }
        });
    }
    
    startTracking() {
        this.currentMetrics = {
            startTime: Date.now(),
            endTime: null,
            firstTokenTime: null,
            tokenCount: 0,
            charCount: 0,
            tokensPerSecond: 0,
            responseTime: 0,
            streaming: true,
            abortController: new AbortController()
        };
        
        // Show stop button
        this.stopBtn.style.display = 'block';
        
        // Update UI
        this.responseTimeEl.textContent = '0ms';
        this.tokensPerSecondEl.textContent = '0t/s';
        this.tokenCountEl.textContent = '0tokens';
        
        // Start live updates
        this.updateInterval = setInterval(() => this.updateLiveMetrics(), 100);
    }
    
    recordFirstToken() {
        if (!this.currentMetrics.firstTokenTime && this.currentMetrics.startTime) {
            this.currentMetrics.firstTokenTime = Date.now();
            const ttft = this.currentMetrics.firstTokenTime - this.currentMetrics.startTime;
            console.log(`Time to first token: ${ttft}ms`);
        }
    }
    
    updateTokenCount(text) {
        // Simple token estimation (more accurate would use tiktoken)
        // Rough estimate: ~4 chars per token for English
        this.currentMetrics.charCount = text.length;
        this.currentMetrics.tokenCount = Math.ceil(text.length / 4);
        
        this.recordFirstToken();
    }
    
    updateLiveMetrics() {
        if (!this.currentMetrics.streaming) return;
        
        const elapsed = Date.now() - this.currentMetrics.startTime;
        this.currentMetrics.responseTime = elapsed;
        
        if (this.currentMetrics.tokenCount > 0 && elapsed > 0) {
            this.currentMetrics.tokensPerSecond = (this.currentMetrics.tokenCount / (elapsed / 1000)).toFixed(1);
        }
        
        // Update UI
        this.responseTimeEl.textContent = `${Math.round(elapsed)}ms`;
        this.tokensPerSecondEl.textContent = `${this.currentMetrics.tokensPerSecond}t/s`;
        this.tokenCountEl.textContent = `${this.currentMetrics.tokenCount}tokens`;
    }
    
    stopTracking() {
        this.currentMetrics.endTime = Date.now();
        this.currentMetrics.streaming = false;
        
        // Hide stop button
        this.stopBtn.style.display = 'none';
        
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Final update
        this.updateLiveMetrics();
        
        // Update session stats
        this.updateSessionStats();
        
        // Log performance data
        console.log('Performance metrics:', {
            responseTime: `${this.currentMetrics.responseTime}ms`,
            timeToFirstToken: this.currentMetrics.firstTokenTime ? 
                `${this.currentMetrics.firstTokenTime - this.currentMetrics.startTime}ms` : 'N/A',
            totalTokens: this.currentMetrics.tokenCount,
            tokensPerSecond: this.currentMetrics.tokensPerSecond,
            characters: this.currentMetrics.charCount
        });
    }
    
    stopGeneration() {
        if (this.currentMetrics.abortController) {
            this.currentMetrics.abortController.abort();
            this.stopTracking();
            
            // Add indicator that generation was stopped
            if (currentMessageDiv) {
                currentMessageDiv.innerHTML += '\n\n*[Generation stopped by user]*';
                currentMessageDiv.classList.remove('streaming');
            }
        }
    }
    
    updateSessionStats() {
        this.sessionStats.totalMessages++;
        this.sessionStats.totalTokens += this.currentMetrics.tokenCount;
        this.sessionStats.totalTime += this.currentMetrics.responseTime;
        
        this.sessionStats.avgResponseTime = Math.round(
            this.sessionStats.totalTime / this.sessionStats.totalMessages
        );
        
        this.sessionStats.avgTokensPerSecond = (
            this.sessionStats.totalTokens / (this.sessionStats.totalTime / 1000)
        ).toFixed(1);
        
        this.saveSessionStats();
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        document.getElementById('stat-messages').textContent = this.sessionStats.totalMessages;
        document.getElementById('stat-tokens').textContent = this.sessionStats.totalTokens;
        document.getElementById('stat-avg-time').textContent = `${this.sessionStats.avgResponseTime}ms`;
        document.getElementById('stat-avg-speed').textContent = `${this.sessionStats.avgTokensPerSecond}t/s`;
    }
    
    toggleStats() {
        const content = this.statsPanel.querySelector('.stats-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        this.updateStatsDisplay();
    }
    
    resetStats() {
        this.sessionStats = {
            totalMessages: 0,
            totalTokens: 0,
            totalTime: 0,
            avgResponseTime: 0,
            avgTokensPerSecond: 0
        };
        this.saveSessionStats();
        this.updateStatsDisplay();
    }
    
    saveSessionStats() {
        localStorage.setItem('performanceStats', JSON.stringify(this.sessionStats));
    }
    
    loadSessionStats() {
        const saved = localStorage.getItem('performanceStats');
        if (saved) {
            this.sessionStats = JSON.parse(saved);
        }
    }
    
    getAbortSignal() {
        return this.currentMetrics.abortController?.signal;
    }
}

// Initialize performance metrics
const performanceMetrics = new PerformanceMetrics();

// Override sendMessage to include performance tracking
const originalSendMessage4 = window.sendMessage;
window.sendMessage = async function(contentOverride, isRegeneration = false) {
    const message = contentOverride || messageInput.value.trim();
    if (!message) return;

    // Add file context
    const filesContext = fileUploadManager.getFilesContext();
    const fullMessage = filesContext && !isRegeneration ? message + filesContext : message;

    if (!isRegeneration) {
        addMessage('user', fullMessage);
        messages.push({ role: 'user', content: fullMessage });
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.disabled = true;
    sendButton.disabled = true;
    setStatus('loading', 'Thinking...');

    // Start performance tracking
    performanceMetrics.startTracking();

    currentMessageDiv = addMessage('assistant', '', true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages, model: selectedModel }),
            signal: performanceMetrics.getAbortSignal()
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        currentMessageDiv.classList.remove('streaming');
                        messages.push({ role: 'assistant', content: assistantMessage });
                        performanceMetrics.stopTracking();
                        setTimeout(() => {
                            addMessageActions(currentMessageDiv, 'assistant', assistantMessage);
                            addCopyButtons();
                        }, 100);
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            assistantMessage += parsed.content;
                            performanceMetrics.updateTokenCount(assistantMessage);
                            updateStreamingMessage(assistantMessage);
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }

        setStatus('ready', 'Ready');
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Generation stopped by user');
            setStatus('ready', 'Ready');
        } else {
            console.error('Error:', error);
            currentMessageDiv.innerHTML = '<em>Error: Failed to get response from Ollama. Make sure Ollama is running with the selected model.</em>';
            currentMessageDiv.classList.remove('streaming');
            setStatus('error', 'Error');
        }
        performanceMetrics.stopTracking();
    } finally {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
        currentMessageDiv = null;
        
        if (!isRegeneration) {
            fileUploadManager.clearFiles();
        }
        
        setTimeout(() => chatHistory.saveCurrentSession(), 1000);
    }
};