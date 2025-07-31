// Meeting Assistant - Live transcription and AI suggestions
class MeetingAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = [];
        this.conversationContext = [];
        this.suggestionInterval = null;
        this.lastSuggestionTime = 0;
        this.initializeSpeechRecognition();
        this.createUI();
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure for continuous listening
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Event handlers
        this.recognition.onstart = () => {
            console.log('Meeting assistant started');
            this.updateStatus('Listening...', 'active');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific error types
            if (event.error === 'not-allowed') {
                this.updateStatus('Microphone access denied. Please allow microphone access.', 'error');
                alert('Microphone access is required for Meeting Assistant.\n\n' +
                      'To fix this:\n' +
                      '1. Click the lock/info icon in your browser\'s address bar\n' +
                      '2. Find "Microphone" in the permissions\n' +
                      '3. Change it to "Allow"\n' +
                      '4. Refresh the page and try again');
                this.isListening = false;
                const toggleBtn = document.getElementById('toggleMeetingMode');
                const toggleText = toggleBtn.querySelector('.toggle-text');
                toggleBtn.classList.remove('active');
                toggleText.textContent = 'Start Meeting Mode';
                return;
            }
            
            this.updateStatus(`Error: ${event.error}`, 'error');
            
            // Restart on recoverable errors
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition.start();
                    }
                }, 1000);
            }
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Restart for continuous listening
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition.start();
                    }
                }, 100);
            } else {
                this.updateStatus('Meeting assistant stopped', 'inactive');
            }
        };
    }

    createUI() {
        // Create meeting assistant container (no toggle button)
        const container = document.createElement('div');
        container.id = 'meeting-assistant';
        container.className = 'meeting-assistant-container';
        container.innerHTML = `
            <div class="meeting-header">
                <h3>Meeting Assistant (Basic)</h3>
                <button id="toggleMeetingMode" class="meeting-toggle-btn">
                    <span class="mic-icon">🎤</span>
                    <span class="toggle-text">Start Meeting Mode</span>
                </button>
                <button id="clearTranscript" class="clear-btn" disabled>Clear</button>
            </div>
            
            <div class="meeting-notice">
                💡 <strong>Note:</strong> This is the basic meeting assistant. For advanced features like persistent storage, user profiles, and meeting history, use <strong>Meeting Mentor</strong> (🎯 button).
            </div>
            
            <div class="meeting-content">
                <div class="transcript-panel">
                    <h4>Live Transcript</h4>
                    <div id="transcriptContent" class="transcript-content">
                        <p class="transcript-placeholder">Click "Start Meeting Mode" to begin transcription...</p>
                    </div>
                </div>
                
                <div class="suggestions-panel">
                    <h4>AI Suggestions</h4>
                    <div id="suggestionsContent" class="suggestions-content">
                        <p class="suggestions-placeholder">Suggestions will appear here during the conversation...</p>
                    </div>
                    <div class="suggestion-actions">
                        <button id="refreshSuggestions" class="refresh-btn" disabled>
                            <span>🔄</span> Refresh Suggestions
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="meeting-status">
                <span id="meetingStatus" class="status-text">Ready</span>
                <span id="recordingTime" class="recording-time"></span>
            </div>
        `;

        // Insert after header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(container, header.nextSibling);

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('toggleMeetingMode');
        const clearBtn = document.getElementById('clearTranscript');
        const refreshBtn = document.getElementById('refreshSuggestions');

        toggleBtn.addEventListener('click', () => this.toggleMeetingMode());
        clearBtn.addEventListener('click', () => this.clearTranscript());
        refreshBtn.addEventListener('click', () => this.generateSuggestions(true));
    }

    toggleMeetingMode() {
        const toggleBtn = document.getElementById('toggleMeetingMode');
        const toggleText = toggleBtn.querySelector('.toggle-text');
        const clearBtn = document.getElementById('clearTranscript');
        const refreshBtn = document.getElementById('refreshSuggestions');
        const container = document.getElementById('meeting-assistant');

        if (!this.isListening) {
            // Start listening
            this.isListening = true;
            this.startListening();
            toggleBtn.classList.add('active');
            toggleText.textContent = 'Stop Meeting Mode';
            clearBtn.disabled = false;
            refreshBtn.disabled = false;
            container.classList.add('active');
            this.startRecordingTimer();
            
            // Start suggestion generation
            this.suggestionInterval = setInterval(() => {
                this.generateSuggestions();
            }, 15000); // Generate suggestions every 15 seconds
        } else {
            // Stop listening
            this.isListening = false;
            this.stopListening();
            toggleBtn.classList.remove('active');
            toggleText.textContent = 'Start Meeting Mode';
            container.classList.remove('active');
            this.stopRecordingTimer();
            
            // Stop suggestion generation
            if (this.suggestionInterval) {
                clearInterval(this.suggestionInterval);
                this.suggestionInterval = null;
            }
        }
    }

    startListening() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    handleSpeechResult(event) {
        const results = event.results;
        const currentIndex = results.length - 1;
        const transcript = results[currentIndex][0].transcript;
        const isFinal = results[currentIndex].isFinal;

        if (isFinal) {
            // Final transcript - add to conversation
            this.addToTranscript(transcript);
            
            // Trigger suggestions if enough time has passed
            const now = Date.now();
            if (now - this.lastSuggestionTime > 10000) { // 10 seconds
                this.generateSuggestions();
            }
        } else {
            // Interim results - show in UI
            this.updateInterimTranscript(transcript);
        }
    }

    addToTranscript(text) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            text: text.trim(),
            timestamp: timestamp,
            speaker: 'Speaker' // Could be enhanced to identify speakers
        };
        
        this.transcript.push(entry);
        this.conversationContext.push(text.trim());
        
        // Keep only last 10 entries for context
        if (this.conversationContext.length > 10) {
            this.conversationContext.shift();
        }

        this.updateTranscriptUI(entry);
    }

    updateTranscriptUI(entry) {
        const transcriptContent = document.getElementById('transcriptContent');
        const placeholder = transcriptContent.querySelector('.transcript-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }

        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.innerHTML = `
            <span class="entry-time">${entry.timestamp}</span>
            <span class="entry-speaker">${entry.speaker}:</span>
            <span class="entry-text">${entry.text}</span>
        `;
        
        transcriptContent.appendChild(entryDiv);
        transcriptContent.scrollTop = transcriptContent.scrollHeight;
    }

    updateInterimTranscript(text) {
        // Show interim results in status
        this.updateStatus(`Hearing: "${text.slice(-50)}..."`, 'active');
    }

    async generateSuggestions(force = false) {
        if (!force) {
            const now = Date.now();
            if (now - this.lastSuggestionTime < 10000) return; // Avoid too frequent suggestions
        }

        if (this.conversationContext.length === 0) return;

        this.lastSuggestionTime = Date.now();
        
        // Prepare context for AI
        const context = this.conversationContext.slice(-5).join('\n');
        const prompt = `Based on this meeting conversation:

"${context}"

Provide 3 brief, contextual suggestions for what to say next. Keep each suggestion under 50 words and make them relevant to the discussion. Format as numbered list.`;

        try {
            this.updateSuggestionsUI('loading');
            
            const response = await fetch(isGuest ? '/api/guest/chat' : '/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful meeting assistant. Provide brief, relevant suggestions for the conversation.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.displaySuggestions(data.message.content);
            } else {
                this.updateSuggestionsUI('error', 'Failed to generate suggestions');
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
            this.updateSuggestionsUI('error', 'Error generating suggestions');
        }
    }

    displaySuggestions(suggestionsText) {
        const suggestionsContent = document.getElementById('suggestionsContent');
        const placeholder = suggestionsContent.querySelector('.suggestions-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }

        // Clear previous suggestions
        suggestionsContent.innerHTML = '';

        // Parse and display suggestions
        const lines = suggestionsText.split('\n').filter(line => line.trim());
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestions-list';

        lines.forEach(line => {
            if (line.match(/^\d+\.|^-/)) {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion-item';
                
                const text = line.replace(/^\d+\.\s*|-\s*/, '').trim();
                suggestion.innerHTML = `
                    <span class="suggestion-text">${text}</span>
                    <button class="use-suggestion-btn" onclick="meetingAssistant.useSuggestion('${text.replace(/'/g, "\\'")}')">
                        Use
                    </button>
                `;
                
                suggestionDiv.appendChild(suggestion);
            }
        });

        suggestionsContent.appendChild(suggestionDiv);
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'suggestions-timestamp';
        timestamp.textContent = `Generated at ${new Date().toLocaleTimeString()}`;
        suggestionsContent.appendChild(timestamp);
    }

    useSuggestion(text) {
        // Copy suggestion to message input
        const messageInput = document.getElementById('messageInput');
        messageInput.value = text;
        messageInput.focus();
        
        // Optionally, automatically send
        // sendMessage();
    }

    updateSuggestionsUI(state, message = '') {
        const suggestionsContent = document.getElementById('suggestionsContent');
        
        if (state === 'loading') {
            suggestionsContent.innerHTML = '<div class="loading-suggestions">🤔 Generating suggestions...</div>';
        } else if (state === 'error') {
            suggestionsContent.innerHTML = `<div class="error-suggestions">❌ ${message}</div>`;
        }
    }

    clearTranscript() {
        this.transcript = [];
        this.conversationContext = [];
        const transcriptContent = document.getElementById('transcriptContent');
        transcriptContent.innerHTML = '<p class="transcript-placeholder">Transcript cleared. Listening...</p>';
        
        const suggestionsContent = document.getElementById('suggestionsContent');
        suggestionsContent.innerHTML = '<p class="suggestions-placeholder">Suggestions will appear here during the conversation...</p>';
    }

    updateStatus(text, type = 'normal') {
        const statusElement = document.getElementById('meetingStatus');
        statusElement.textContent = text;
        statusElement.className = `status-text status-${type}`;
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('recordingTime').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            document.getElementById('recordingTime').textContent = '';
        }
    }
}

// Initialize meeting assistant when page loads
let meetingAssistant;
window.addEventListener('load', () => {
    setTimeout(() => {
        meetingAssistant = new MeetingAssistant();
    }, 1000);
});