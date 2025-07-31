// Meeting Mentor - Enhanced meeting assistant with persistent storage and advanced features
class MeetingMentor {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = [];
        this.conversationContext = [];
        this.suggestionInterval = null;
        this.lastSuggestionTime = 0;
        this.currentMeetingId = null;
        this.userProfile = null;
        this.speakerVoiceProfiles = new Map();
        this.audioContext = null;
        this.isDiscreetMode = false;
        this.autoSaveInterval = null;
        
        this.initializeSpeechRecognition();
        this.initializeAudioAnalyzer();
        this.loadUserProfile();
        this.createUI();
    }

    async initializeAudioAnalyzer() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (response.ok) {
                this.userProfile = await response.json();
                this.isAuthenticated = true;
            } else if (response.status === 401) {
                // User is not logged in
                console.warn('User not logged in - Meeting Mentor requires authentication');
                this.isAuthenticated = false;
                this.showAuthenticationWarning();
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }
    
    showAuthenticationWarning() {
        // Add a warning message to the UI
        const container = document.getElementById('meeting-mentor');
        if (container) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'auth-warning';
            warningDiv.style.cssText = 'background: #ff6b6b; color: white; padding: 10px; margin: 10px; border-radius: 5px; text-align: center;';
            warningDiv.innerHTML = '⚠️ Meeting Mentor requires you to be logged in. <a href="/login.html" style="color: white; text-decoration: underline;">Click here to log in</a>';
            container.insertBefore(warningDiv, container.firstChild);
        }
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

        // Enhanced event handlers
        this.recognition.onstart = () => {
            console.log('Meeting Mentor started');
            this.updateStatus('Listening...', 'active');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific error types
            if (event.error === 'not-allowed') {
                this.updateStatus('Microphone access denied. Please allow microphone access and refresh the page.', 'error');
                alert('Microphone access is required for Meeting Mentor.\n\n' +
                      'To fix this:\n' +
                      '1. Click the lock/info icon in your browser\'s address bar\n' +
                      '2. Find "Microphone" in the permissions\n' +
                      '3. Change it to "Allow"\n' +
                      '4. Refresh the page and try again\n\n' +
                      'Note: If you\'re not using HTTPS, microphone access may be blocked.');
                this.isListening = false;
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
                this.updateStatus('Meeting Mentor stopped', 'inactive');
            }
        };
    }

    createUI() {
        // Create meeting mentor container with enhanced UI (no toggle button)
        const container = document.createElement('div');
        container.id = 'meeting-mentor';
        container.className = 'meeting-mentor-container';
        container.innerHTML = `
            <div class="mentor-header">
                <h3>Meeting Assistant</h3>
                <div class="mentor-controls">
                    <button id="toggleMeetingMode" class="meeting-toggle-btn">
                        <span class="mic-icon">🎤</span>
                        <span class="toggle-text">Start Meeting</span>
                    </button>
                    <button id="toggleDiscreetMode" class="discreet-mode-btn" title="Discreet Mode">
                        <span class="discreet-icon">🤫</span>
                    </button>
                    <button id="meetingHistory" class="history-btn" title="Meeting History">
                        <span class="history-icon">📚</span>
                    </button>
                    <button id="profileSettings" class="profile-btn" title="Profile Settings">
                        <span class="profile-icon">👤</span>
                    </button>
                </div>
            </div>
            
            <div class="meeting-info" id="meetingInfo" style="display: none;">
                <input type="text" id="meetingTitle" placeholder="Meeting Title..." class="meeting-title-input">
                <div class="meeting-participants">
                    <span class="participants-label">Participants:</span>
                    <div id="participantsList" class="participants-list"></div>
                </div>
            </div>
            
            <div class="mentor-content">
                <div class="transcript-panel">
                    <div class="panel-header">
                        <h4>Live Transcript</h4>
                        <div class="transcript-actions">
                            <button id="exportTranscript" class="export-btn" disabled title="Export Transcript">
                                <span>📄</span>
                            </button>
                            <button id="clearTranscript" class="clear-btn" disabled title="Clear">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </div>
                    <div id="transcriptContent" class="transcript-content">
                        <p class="transcript-placeholder">Click "Start Meeting" to begin transcription...</p>
                    </div>
                </div>
                
                <div class="suggestions-panel">
                    <div class="panel-header">
                        <h4>AI Suggestions</h4>
                        <button id="refreshSuggestions" class="refresh-btn" disabled title="Refresh">
                            <span>🔄</span>
                        </button>
                    </div>
                    <div id="suggestionsContent" class="suggestions-content">
                        <p class="suggestions-placeholder">Personalized suggestions will appear here...</p>
                    </div>
                </div>
                
                <div class="action-items-panel">
                    <div class="panel-header">
                        <h4>Action Items</h4>
                        <button id="addActionItem" class="add-action-btn" disabled title="Add Action Item">
                            <span>➕</span>
                        </button>
                    </div>
                    <div id="actionItemsContent" class="action-items-content">
                        <p class="action-items-placeholder">Action items will be tracked here...</p>
                    </div>
                </div>
            </div>
            
            <div class="meeting-status">
                <span id="meetingStatus" class="status-text">Ready</span>
                <span id="recordingTime" class="recording-time"></span>
                <div id="audioVisualizer" class="audio-visualizer"></div>
            </div>
            
            <!-- Hidden modals -->
            <div id="profileModal" class="mentor-modal" style="display: none;">
                <div class="modal-content">
                    <h3>Profile Settings</h3>
                    <form id="profileForm">
                        <div class="form-group">
                            <label>Job Title</label>
                            <input type="text" id="jobTitle" name="job_title" placeholder="e.g., Product Manager">
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <input type="text" id="department" name="department" placeholder="e.g., Engineering">
                        </div>
                        <div class="form-group">
                            <label>Key Responsibilities</label>
                            <textarea id="responsibilities" name="responsibilities" placeholder="List your main responsibilities..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Communication Style</label>
                            <select id="communicationStyle" name="communication_style">
                                <option value="formal">Formal</option>
                                <option value="casual">Casual</option>
                                <option value="technical">Technical</option>
                                <option value="collaborative">Collaborative</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="save-btn">Save Profile</button>
                            <button type="button" class="cancel-btn" onclick="meetingMentor.closeModal('profileModal')">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div id="historyModal" class="mentor-modal" style="display: none;">
                <div class="modal-content">
                    <h3>Meeting History</h3>
                    <div id="meetingsList" class="meetings-list">
                        <p>Loading meetings...</p>
                    </div>
                    <button type="button" class="close-btn" onclick="meetingMentor.closeModal('historyModal')">Close</button>
                </div>
            </div>
        `;

        // Insert after header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(container, header.nextSibling);

        // Add styles
        this.addStyles();
        
        // Add event listeners
        this.setupEventListeners();
    }

    addStyles() {
        if (document.getElementById('meeting-mentor-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'meeting-mentor-styles';
        styles.textContent = `
            .meeting-mentor-toggle {
                position: fixed;
                top: 70px;
                right: 20px;
                z-index: 1000;
            }
            
            .show-meeting-btn {
                background: #6B46C1;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 15px;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(107, 70, 193, 0.3);
            }
            
            .show-meeting-btn:hover {
                background: #9F7AEA;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(107, 70, 193, 0.4);
            }
            
            .show-meeting-btn.active {
                background: #48bb78;
                box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
            }
            
            .meeting-mentor-container {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 500px;
                max-height: 85vh;
                background: #1a1a1a;
                border: 2px solid #6B46C1;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                display: none;
                flex-direction: column;
                z-index: 999;
                transition: all 0.3s ease;
            }
            
            .meeting-mentor-container.visible {
                display: flex;
            }
            
            .meeting-mentor-container.discreet {
                opacity: 0.3;
                width: 60px;
                height: 60px;
                overflow: hidden;
            }
            
            .meeting-mentor-container.discreet:hover {
                opacity: 1;
                width: 450px;
                height: auto;
                max-height: 80vh;
            }
            
            .mentor-header {
                background: #2d3748;
                color: white;
                padding: 15px 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .mentor-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .mentor-controls {
                display: flex;
                gap: 10px;
            }
            
            .mentor-controls button {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .mentor-controls button:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .meeting-toggle-btn.active {
                background: #48bb78 !important;
                border-color: #48bb78 !important;
            }
            
            .discreet-mode-btn.active {
                background: #ed8936 !important;
                border-color: #ed8936 !important;
            }
            
            .meeting-info {
                padding: 15px 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .meeting-title-input {
                width: 100%;
                padding: 8px 12px;
                background: #0d0d0d;
                border: 1px solid #6B46C1;
                border-radius: 6px;
                font-size: 14px;
                margin-bottom: 10px;
                color: #e0e0e0;
            }
            
            .participants-list {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 8px;
            }
            
            .participant-badge {
                background: #e2e8f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .mentor-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: grid;
                gap: 20px;
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .panel-header h4 {
                margin: 0;
                font-size: 16px;
                color: #9F7AEA;
            }
            
            .transcript-panel, .suggestions-panel, .action-items-panel {
                background: #0d0d0d;
                border: 1px solid #333333;
                border-radius: 8px;
                padding: 15px;
            }
            
            .transcript-content, .suggestions-content, .action-items-content {
                max-height: 200px;
                overflow-y: auto;
                background: #1a1a1a;
                border-radius: 6px;
                padding: 10px;
            }
            
            .transcript-entry {
                margin-bottom: 10px;
                padding: 8px;
                background: #2a2a2a;
                border-radius: 6px;
                border-left: 3px solid #6B46C1;
            }
            
            .entry-time {
                font-size: 11px;
                color: #666666;
                margin-right: 10px;
            }
            
            .entry-speaker {
                font-weight: bold;
                color: #9F7AEA;
                margin-right: 5px;
            }
            
            .suggestion-item {
                background: #2a2a2a;
                border: 1px solid #6B46C1;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
            }
            
            .use-suggestion-btn {
                background: #3182ce;
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .action-item {
                background: #2a2a2a;
                border: 1px solid #48bb78;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
                color: #e0e0e0;
            }
            
            .meeting-status {
                background: #2d3748;
                padding: 15px 20px;
                border-radius: 0 0 12px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #333333;
            }
            
            .audio-visualizer {
                width: 100px;
                height: 20px;
                background: #0d0d0d;
                border: 1px solid #6B46C1;
                border-radius: 10px;
                overflow: hidden;
            }
            
            .audio-bar {
                height: 100%;
                background: #48bb78;
                width: 0;
                transition: width 0.1s ease;
            }
            
            .mentor-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1001;
            }
            
            .modal-content {
                background: #1a1a1a;
                border: 2px solid #6B46C1;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                color: #e0e0e0;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #9F7AEA;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 8px 12px;
                background: #0d0d0d;
                border: 1px solid #6B46C1;
                border-radius: 6px;
                font-size: 14px;
                color: #e0e0e0;
            }
            
            .form-group textarea {
                min-height: 80px;
                resize: vertical;
            }
            
            .form-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            }
            
            .save-btn {
                background: #48bb78;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
            }
            
            .cancel-btn, .close-btn {
                background: #e2e8f0;
                color: #2d3748;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
            }
            
            .meetings-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .meeting-item {
                background: #f7fafc;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .meeting-item:hover {
                background: #e2e8f0;
            }
            
            .meeting-title {
                font-weight: bold;
                color: #2d3748;
                margin-bottom: 5px;
            }
            
            .meeting-date {
                font-size: 12px;
                color: #718096;
            }
            
            .meeting-stats {
                display: flex;
                gap: 15px;
                margin-top: 5px;
                font-size: 12px;
                color: #4a5568;
            }
        `;
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('toggleMeetingMode');
        const discreetBtn = document.getElementById('toggleDiscreetMode');
        const clearBtn = document.getElementById('clearTranscript');
        const refreshBtn = document.getElementById('refreshSuggestions');
        const exportBtn = document.getElementById('exportTranscript');
        const profileBtn = document.getElementById('profileSettings');
        const historyBtn = document.getElementById('meetingHistory');
        const addActionBtn = document.getElementById('addActionItem');

        toggleBtn.addEventListener('click', () => this.toggleMeetingMode());
        discreetBtn.addEventListener('click', () => this.toggleDiscreetMode());
        clearBtn.addEventListener('click', () => this.clearTranscript());
        refreshBtn.addEventListener('click', () => this.generateSuggestions(true));
        exportBtn.addEventListener('click', () => this.exportTranscript());
        profileBtn.addEventListener('click', () => this.showProfileModal());
        historyBtn.addEventListener('click', () => this.showHistoryModal());
        addActionBtn.addEventListener('click', () => this.addActionItem());

        // Profile form submission
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Meeting title auto-save
        const titleInput = document.getElementById('meetingTitle');
        titleInput.addEventListener('blur', () => {
            if (this.currentMeetingId && titleInput.value) {
                this.updateMeetingTitle(titleInput.value);
            }
        });
    }

    async toggleMeetingMode() {
        const toggleBtn = document.getElementById('toggleMeetingMode');
        const toggleText = toggleBtn.querySelector('.toggle-text');
        const clearBtn = document.getElementById('clearTranscript');
        const refreshBtn = document.getElementById('refreshSuggestions');
        const exportBtn = document.getElementById('exportTranscript');
        const addActionBtn = document.getElementById('addActionItem');
        const container = document.getElementById('meeting-mentor');
        const meetingInfo = document.getElementById('meetingInfo');

        if (!this.isListening) {
            // Check if user is authenticated before starting
            if (!this.isAuthenticated) {
                this.updateStatus('Please log in to use Meeting Mentor', 'error');
                alert('Meeting Mentor requires you to be logged in to save meeting data. Please log in and try again.');
                window.location.href = '/login.html';
                return;
            }
            
            // Request microphone permission first
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (error) {
                console.error('Microphone permission error:', error);
                this.updateStatus('Microphone access denied', 'error');
                alert('Microphone access is required for Meeting Mentor.\n\n' +
                      'Please allow microphone access when prompted and try again.\n\n' +
                      'If you\'re using HTTP (not HTTPS), microphone access may be blocked by your browser.');
                return;
            }
            // Start new meeting
            try {
                const meeting = await this.createMeeting();
                this.currentMeetingId = meeting.id;
                
                // Start listening
                this.isListening = true;
                this.startListening();
                toggleBtn.classList.add('active');
                toggleText.textContent = 'End Meeting';
                clearBtn.disabled = false;
                refreshBtn.disabled = false;
                exportBtn.disabled = false;
                addActionBtn.disabled = false;
                container.classList.add('active');
                meetingInfo.style.display = 'block';
                this.startRecordingTimer();
                
                // Start auto-save interval
                this.autoSaveInterval = setInterval(() => {
                    this.autoSaveTranscript();
                }, 5000); // Auto-save every 5 seconds
                
                // Start suggestion generation
                this.suggestionInterval = setInterval(() => {
                    this.generateSuggestions();
                }, 15000); // Generate suggestions every 15 seconds
                
                // Start meeting on server
                await fetch(`/api/meetings/${this.currentMeetingId}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                
                this.updateStatus('Meeting started', 'success');
            } catch (error) {
                console.error('Failed to start meeting:', error);
                this.updateStatus(`Failed to start meeting: ${error.message}`, 'error');
                // Reset state on error
                this.isListening = false;
                toggleBtn.classList.remove('active');
                toggleText.textContent = 'Start Meeting';
                this.currentMeetingId = null;
            }
        } else {
            // End meeting
            this.isListening = false;
            this.stopListening();
            toggleBtn.classList.remove('active');
            toggleText.textContent = 'Start Meeting';
            container.classList.remove('active');
            this.stopRecordingTimer();
            
            // Clear intervals
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            
            if (this.suggestionInterval) {
                clearInterval(this.suggestionInterval);
                this.suggestionInterval = null;
            }
            
            // End meeting on server
            if (this.currentMeetingId) {
                await fetch(`/api/meetings/${this.currentMeetingId}/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                
                // Generate and save summary
                await this.generateMeetingSummary();
            }
            
            meetingInfo.style.display = 'none';
            this.updateStatus('Meeting ended', 'inactive');
        }
    }

    toggleDiscreetMode() {
        const container = document.getElementById('meeting-mentor');
        const discreetBtn = document.getElementById('toggleDiscreetMode');
        
        this.isDiscreetMode = !this.isDiscreetMode;
        
        if (this.isDiscreetMode) {
            container.classList.add('discreet');
            discreetBtn.classList.add('active');
        } else {
            container.classList.remove('discreet');
            discreetBtn.classList.remove('active');
        }
    }

    async createMeeting() {
        const response = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                title: 'Meeting ' + new Date().toLocaleString(),
                description: ''
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            // Check if it's an authentication error
            if (response.status === 401) {
                // User is not logged in - provide clear guidance
                throw new Error('Please log in to use Meeting Mentor. You need an account to save meeting data.');
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const meeting = await response.json();
        document.getElementById('meetingTitle').value = meeting.title;
        return meeting;
    }

    async updateMeetingTitle(title) {
        // This would need a new endpoint to update meeting title
        console.log('Updating meeting title:', title);
    }

    startListening() {
        if (this.recognition) {
            try {
                this.recognition.start();
                this.startAudioVisualization();
            } catch (error) {
                console.error('Speech recognition error:', error);
                if (error.message.includes('not-allowed')) {
                    this.updateStatus('Microphone access denied. Please allow microphone access.', 'error');
                    throw new Error('Microphone access denied');
                } else {
                    throw error;
                }
            }
        }
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
            this.stopAudioVisualization();
        }
    }

    async handleSpeechResult(event) {
        const results = event.results;
        const currentIndex = results.length - 1;
        const transcript = results[currentIndex][0].transcript;
        const confidence = results[currentIndex][0].confidence;
        const isFinal = results[currentIndex].isFinal;

        if (isFinal) {
            // Final transcript - add to conversation
            await this.addToTranscript(transcript, confidence);
            
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

    async addToTranscript(text, confidence = 1.0) {
        const timestamp = new Date().toLocaleTimeString();
        const speaker = await this.identifySpeaker(text); // Enhanced speaker identification
        
        const entry = {
            text: text.trim(),
            timestamp: timestamp,
            speaker: speaker,
            confidence: confidence
        };
        
        this.transcript.push(entry);
        this.conversationContext.push(text.trim());
        
        // Keep only last 10 entries for context
        if (this.conversationContext.length > 10) {
            this.conversationContext.shift();
        }

        this.updateTranscriptUI(entry);
        
        // Save to database if meeting is active
        if (this.currentMeetingId) {
            await this.saveTranscriptEntry(entry);
        }
    }

    async saveTranscriptEntry(entry) {
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    speaker_name: entry.speaker,
                    text: entry.text,
                    timestamp: new Date().toISOString(),
                    confidence: entry.confidence,
                    is_interim: false
                })
            });
        } catch (error) {
            console.error('Failed to save transcript entry:', error);
        }
    }

    async identifySpeaker(text) {
        // Simple speaker identification - could be enhanced with voice fingerprinting
        // For now, return a generic speaker name
        return 'Speaker';
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
        
        // Prepare context for AI with user profile
        const context = this.conversationContext.slice(-5).join('\n');
        const profileContext = this.userProfile ? `
User Profile:
- Job Title: ${this.userProfile.job_title || 'Not specified'}
- Department: ${this.userProfile.department || 'Not specified'}
- Responsibilities: ${this.userProfile.responsibilities || 'Not specified'}
- Communication Style: ${this.userProfile.communication_style || 'Not specified'}
` : '';

        const prompt = `${profileContext}

Based on this meeting conversation:
"${context}"

Provide 3 personalized, contextual suggestions for what to say next. Consider the user's role and communication style. Keep each suggestion under 50 words and make them relevant to the discussion. Format as numbered list.`;

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
                            content: 'You are a helpful meeting assistant. Provide brief, relevant suggestions for the conversation based on the user\'s profile and context.'
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
                await this.displaySuggestions(data.message.content);
            } else {
                this.updateSuggestionsUI('error', 'Failed to generate suggestions');
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
            this.updateSuggestionsUI('error', 'Error generating suggestions');
        }
    }

    async displaySuggestions(suggestionsText) {
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

        for (const line of lines) {
            if (line.match(/^\d+\.|^-/)) {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion-item';
                
                const text = line.replace(/^\d+\.\s*|-\s*/, '').trim();
                suggestion.innerHTML = `
                    <span class="suggestion-text">${text}</span>
                    <button class="use-suggestion-btn" onclick="meetingMentor.useSuggestion('${text.replace(/'/g, "\\'")}')">
                        Use
                    </button>
                `;
                
                suggestionDiv.appendChild(suggestion);
                
                // Save suggestion to database
                if (this.currentMeetingId) {
                    await this.saveSuggestion(text);
                }
            }
        }

        suggestionsContent.appendChild(suggestionDiv);
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'suggestions-timestamp';
        timestamp.textContent = `Generated at ${new Date().toLocaleTimeString()}`;
        suggestionsContent.appendChild(timestamp);
    }

    async saveSuggestion(text) {
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    suggestion_text: text,
                    context: this.conversationContext.slice(-3).join(' | '),
                    relevance_score: 0.8
                })
            });
        } catch (error) {
            console.error('Failed to save suggestion:', error);
        }
    }

    async useSuggestion(text) {
        // Copy suggestion to message input
        const messageInput = document.getElementById('messageInput');
        messageInput.value = text;
        messageInput.focus();
        
        // Mark suggestion as used
        // This would need the suggestion ID from the database
    }

    updateSuggestionsUI(state, message = '') {
        const suggestionsContent = document.getElementById('suggestionsContent');
        
        if (state === 'loading') {
            suggestionsContent.innerHTML = '<div class="loading-suggestions">🤔 Generating personalized suggestions...</div>';
        } else if (state === 'error') {
            suggestionsContent.innerHTML = `<div class="error-suggestions">❌ ${message}</div>`;
        }
    }

    async addActionItem() {
        const description = prompt('Enter action item description:');
        if (!description) return;
        
        const assignedTo = prompt('Assigned to (optional):');
        const dueDate = prompt('Due date (optional, YYYY-MM-DD):');
        
        // This would save to the action_items table
        const actionItem = {
            description,
            assigned_to: assignedTo || null,
            due_date: dueDate || null
        };
        
        this.displayActionItem(actionItem);
    }

    displayActionItem(item) {
        const actionItemsContent = document.getElementById('actionItemsContent');
        const placeholder = actionItemsContent.querySelector('.action-items-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'action-item';
        itemDiv.innerHTML = `
            <div class="action-description">${item.description}</div>
            ${item.assigned_to ? `<div class="action-assigned">Assigned to: ${item.assigned_to}</div>` : ''}
            ${item.due_date ? `<div class="action-due">Due: ${item.due_date}</div>` : ''}
        `;
        
        actionItemsContent.appendChild(itemDiv);
    }

    async exportTranscript() {
        if (!this.currentMeetingId) return;
        
        try {
            const response = await fetch(`/api/meetings/${this.currentMeetingId}/transcript`, {
                credentials: 'include'
            });
            const transcripts = await response.json();
            
            // Create text content
            let content = `Meeting Transcript\n`;
            content += `Date: ${new Date().toLocaleDateString()}\n`;
            content += `Title: ${document.getElementById('meetingTitle').value}\n\n`;
            
            transcripts.forEach(entry => {
                content += `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.speaker_name}: ${entry.text}\n`;
            });
            
            // Download as text file
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting-transcript-${new Date().toISOString()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.updateStatus('Transcript exported', 'success');
        } catch (error) {
            console.error('Failed to export transcript:', error);
            this.updateStatus('Failed to export transcript', 'error');
        }
    }

    async generateMeetingSummary() {
        if (!this.currentMeetingId) return;
        
        try {
            this.updateStatus('Generating meeting summary...', 'active');
            
            const response = await fetch(`/api/meetings/${this.currentMeetingId}/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (response.ok) {
                const summary = await response.json();
                this.updateStatus('Meeting summary generated', 'success');
                
                // Show summary notification
                alert('Meeting summary has been generated and saved!');
            } else {
                this.updateStatus('Failed to generate summary', 'error');
            }
        } catch (error) {
            console.error('Failed to generate summary:', error);
            this.updateStatus('Failed to generate summary', 'error');
        }
    }

    async showProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.style.display = 'flex';
        
        // Load existing profile
        if (this.userProfile) {
            document.getElementById('jobTitle').value = this.userProfile.job_title || '';
            document.getElementById('department').value = this.userProfile.department || '';
            document.getElementById('responsibilities').value = this.userProfile.responsibilities || '';
            document.getElementById('communicationStyle').value = this.userProfile.communication_style || 'formal';
        }
    }

    async saveProfile() {
        const formData = new FormData(document.getElementById('profileForm'));
        const profileData = Object.fromEntries(formData);
        
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            if (response.ok) {
                this.userProfile = profileData;
                this.closeModal('profileModal');
                this.updateStatus('Profile saved', 'success');
            } else {
                alert('Failed to save profile');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save profile');
        }
    }

    async showHistoryModal() {
        const modal = document.getElementById('historyModal');
        modal.style.display = 'flex';
        
        const meetingsList = document.getElementById('meetingsList');
        meetingsList.innerHTML = '<p>Loading meetings...</p>';
        
        try {
            const response = await fetch('/api/meetings', {
                credentials: 'include'
            });
            const meetings = await response.json();
            
            meetingsList.innerHTML = '';
            
            if (meetings.length === 0) {
                meetingsList.innerHTML = '<p>No meetings found.</p>';
                return;
            }
            
            meetings.forEach(meeting => {
                const meetingDiv = document.createElement('div');
                meetingDiv.className = 'meeting-item';
                meetingDiv.innerHTML = `
                    <div class="meeting-title">${meeting.title}</div>
                    <div class="meeting-date">${new Date(meeting.created_at).toLocaleString()}</div>
                    <div class="meeting-stats">
                        <span>Duration: ${meeting.duration || 0} minutes</span>
                        <span>Transcripts: ${meeting.transcript_count || 0}</span>
                        <span>Action Items: ${meeting.action_item_count || 0}</span>
                    </div>
                `;
                
                meetingDiv.addEventListener('click', () => this.viewMeeting(meeting.id));
                meetingsList.appendChild(meetingDiv);
            });
        } catch (error) {
            console.error('Failed to load meetings:', error);
            meetingsList.innerHTML = '<p>Failed to load meetings.</p>';
        }
    }

    async viewMeeting(meetingId) {
        // This would load and display a specific meeting
        console.log('Viewing meeting:', meetingId);
        // Could show transcript, summary, etc.
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
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

    async autoSaveTranscript() {
        // Auto-save any pending transcript entries
        // This is handled by the real-time saving in addToTranscript
    }

    startAudioVisualization() {
        if (!this.audioContext) return;
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const source = this.audioContext.createMediaStreamSource(stream);
                const analyzer = this.audioContext.createAnalyser();
                analyzer.fftSize = 256;
                source.connect(analyzer);
                
                const bufferLength = analyzer.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                const visualize = () => {
                    if (!this.isListening) return;
                    
                    requestAnimationFrame(visualize);
                    analyzer.getByteFrequencyData(dataArray);
                    
                    // Calculate average volume
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    const normalized = Math.min(average / 128, 1);
                    
                    // Update visualizer
                    const visualizer = document.getElementById('audioVisualizer');
                    visualizer.innerHTML = `<div class="audio-bar" style="width: ${normalized * 100}%"></div>`;
                };
                
                visualize();
            })
            .catch(err => console.error('Audio visualization error:', err));
    }

    stopAudioVisualization() {
        const visualizer = document.getElementById('audioVisualizer');
        visualizer.innerHTML = '';
    }
}

// Initialize meeting mentor when page loads
let meetingMentor;
window.addEventListener('load', () => {
    setTimeout(() => {
        meetingMentor = new MeetingMentor();
    }, 1000);
});