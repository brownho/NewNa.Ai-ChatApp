// Enhanced Meeting Mentor with Chat, History, and Collapsible Sections
class MeetingMentorEnhanced {
    constructor() {
        console.log('MeetingMentorEnhanced constructor called');
        this.recognition = null;
        this.isListening = false;
        this.transcript = [];
        this.actionItems = [];
        this.currentMeetingId = null;
        this.autoDetectedActions = new Set();
        this.meetingStartTime = null;
        this.participants = new Set();
        this.conversationContext = [];
        this.suggestionInterval = null;
        this.lastSuggestionTime = 0;
        this.userProfile = null;
        this.meetingHistory = [];
        this.compactedTranscript = null;
        this.sectionVisibility = {
            transcript: true,
            suggestions: true,
            actionItems: true,
            keyPoints: true,
            chat: true,
            history: false
        };
        
        try {
            this.initializeSpeechRecognition();
            this.loadUserProfile();
            this.createEnhancedUI();
            this.loadMeetingHistory();
            console.log('MeetingMentorEnhanced initialized successfully');
        } catch (error) {
            console.error('Error initializing MeetingMentorEnhanced:', error);
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
            }
        } catch (error) {
            console.log('Could not load user profile (normal for guests):', error.message);
        }
    }

    async loadMeetingHistory() {
        try {
            const response = await fetch('/api/meetings/history', {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (response.ok) {
                this.meetingHistory = await response.json();
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.log('Could not load meeting history:', error.message);
        }
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            console.log('Meeting recording started');
            this.updateStatus('Recording...', 'active');
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                this.updateStatus('Microphone access denied', 'error');
                alert('Please allow microphone access and refresh the page.');
            } else {
                this.updateStatus(`Error: ${event.error}`, 'error');
            }
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition.start();
                    }
                }, 100);
            }
        };
    }

    createEnhancedUI() {
        // Create fullscreen container
        const container = document.createElement('div');
        container.id = 'meeting-mentor-enhanced';
        container.className = 'meeting-enhanced-container';
        container.style.display = 'none';
        container.innerHTML = `
            <div class="meeting-enhanced-header">
                <div class="meeting-header-left">
                    <button id="backToChat" class="back-to-chat-btn">
                        ← Back to Chat
                    </button>
                    <h2>Meeting Assistant</h2>
                    <span id="meetingTimer" class="meeting-timer">00:00</span>
                </div>
                <div class="meeting-header-right">
                    <button id="showHistoryBtn" class="history-toggle-btn" title="Meeting History">📋</button>
                    <span id="meetingStatusEnhanced" class="meeting-status-indicator">Ready</span>
                    <button id="startMeetingEnhanced" class="start-meeting-btn">
                        <span class="rec-icon">⬤</span> Start Recording
                    </button>
                </div>
            </div>

            <div class="meeting-enhanced-content">
                <div class="meeting-main-panel">
                    <div class="meeting-info-bar">
                        <input type="text" id="meetingTitleEnhanced" placeholder="Meeting Title..." class="meeting-title-input-fs">
                        <div class="participants-section">
                            <span>Participants: </span>
                            <div id="participantsListEnhanced" class="participants-list-fs"></div>
                            <button id="addParticipant" class="add-participant-btn">+ Add</button>
                        </div>
                    </div>
                    
                    <div class="meeting-description-section">
                        <textarea id="meetingDescriptionEnhanced" placeholder="Meeting description and context..." class="meeting-description-input"></textarea>
                    </div>

                    <!-- Transcript Section -->
                    <div class="collapsible-section" data-section="transcript">
                        <div class="section-header" onclick="meetingMentorEnhanced.toggleSection('transcript')">
                            <h3>Live Transcript</h3>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="section-content" id="transcriptSection">
                            <div class="transcript-controls">
                                <button id="compactTranscript" class="compact-btn" title="Compact transcript for long meetings">
                                    📝 Compact Transcript
                                </button>
                                <span id="transcriptLength" class="transcript-info">0 entries</span>
                            </div>
                            <div id="transcriptEnhanced" class="transcript-enhanced">
                                <p class="empty-state">Click "Start Recording" to begin transcription...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Meeting Chat Section -->
                    <div class="collapsible-section" data-section="chat">
                        <div class="section-header" onclick="meetingMentorEnhanced.toggleSection('chat')">
                            <h3>Meeting Chat Assistant</h3>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="section-content" id="chatSection">
                            <div class="meeting-chat-container">
                                <div id="meetingChatMessages" class="meeting-chat-messages">
                                    <p class="empty-state">Ask questions about the meeting content...</p>
                                </div>
                                <div class="meeting-chat-input">
                                    <textarea id="meetingChatInput" placeholder="Ask about the meeting content, get summaries, or clarify discussions..." rows="2"></textarea>
                                    <button id="sendMeetingChat" class="send-chat-btn">Send</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="meeting-side-panel">
                    <!-- AI Suggestions Section -->
                    <div class="collapsible-section" data-section="suggestions">
                        <div class="section-header" onclick="meetingMentorEnhanced.toggleSection('suggestions')">
                            <h3>AI Suggestions</h3>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="section-content" id="suggestionsSection">
                            <div class="section-controls">
                                <button id="refreshSuggestionsEnhanced" class="refresh-btn" title="Refresh">🔄</button>
                                <button id="profileSettingsEnhanced" class="settings-btn" title="Profile Settings">⚙️</button>
                            </div>
                            <div id="suggestionsEnhanced" class="suggestions-enhanced">
                                <p class="empty-state">Start recording to get coaching tips...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Items Section -->
                    <div class="collapsible-section" data-section="actionItems">
                        <div class="section-header" onclick="meetingMentorEnhanced.toggleSection('actionItems')">
                            <h3>Action Items <span id="actionCount" class="count-badge">0</span></h3>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="section-content" id="actionItemsSection">
                            <div id="actionItemsEnhanced" class="action-items-enhanced">
                                <p class="empty-state">Action items will be automatically detected...</p>
                            </div>
                            <button id="addManualAction" class="add-manual-action-btn" disabled>
                                + Add Action Item
                            </button>
                        </div>
                    </div>

                    <!-- Key Points Section -->
                    <div class="collapsible-section" data-section="keyPoints">
                        <div class="section-header" onclick="meetingMentorEnhanced.toggleSection('keyPoints')">
                            <h3>Key Points</h3>
                            <span class="toggle-icon">▼</span>
                        </div>
                        <div class="section-content" id="keyPointsSection">
                            <div id="keyPointsEnhanced" class="key-points-enhanced">
                                <p class="empty-state">Important points will appear here...</p>
                            </div>
                        </div>
                    </div>

                    <div class="meeting-controls-section">
                        <button id="generateSummaryEnhanced" class="generate-summary-btn" disabled>
                            Generate Summary
                        </button>
                        <button id="exportMeetingEnhanced" class="export-meeting-btn" disabled>
                            Export Meeting
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Meeting History Panel -->
            <div id="meetingHistoryPanel" class="meeting-history-panel" style="display: none;">
                <div class="history-header">
                    <h3>Meeting History</h3>
                    <button id="closeHistory" class="close-history-btn">✕</button>
                </div>
                <div class="history-search">
                    <input type="text" id="historySearch" placeholder="Search meetings..." class="history-search-input">
                </div>
                <div id="meetingHistoryList" class="meeting-history-list">
                    <p class="empty-state">No previous meetings found</p>
                </div>
            </div>

            <!-- Profile Settings Modal -->
            <div id="profileModalEnhanced" class="profile-modal-enhanced" style="display: none;">
                <div class="modal-content-enhanced">
                    <h3>Profile Settings</h3>
                    <p class="modal-description">Set your role and goals to get personalized meeting suggestions</p>
                    <form id="profileFormEnhanced">
                        <div class="form-group">
                            <label>Job Title</label>
                            <input type="text" id="jobTitleEnhanced" name="job_title" placeholder="e.g., Product Manager, Software Engineer">
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <input type="text" id="departmentEnhanced" name="department" placeholder="e.g., Engineering, Sales, Marketing">
                        </div>
                        <div class="form-group">
                            <label>Current Goals & Responsibilities</label>
                            <textarea id="responsibilitiesEnhanced" name="responsibilities" placeholder="What are your main goals and responsibilities?"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Communication Style</label>
                            <select id="communicationStyleEnhanced" name="communication_style">
                                <option value="assertive">Assertive - Direct and confident</option>
                                <option value="collaborative">Collaborative - Team-focused</option>
                                <option value="analytical">Analytical - Data-driven</option>
                                <option value="diplomatic">Diplomatic - Tactful and considerate</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="save-profile-btn">Save Profile</button>
                            <button type="button" class="cancel-btn" onclick="meetingMentorEnhanced.closeProfileModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.addEnhancedStyles();
        this.setupEventListeners();
    }

    addEnhancedStyles() {
        if (document.getElementById('meeting-enhanced-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'meeting-enhanced-styles';
        styles.textContent = `
            .meeting-enhanced-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #0d0d0d;
                z-index: 2000;
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
            }

            .meeting-enhanced-header {
                background: #1a1a1a;
                border-bottom: 2px solid #6B46C1;
                padding: 1rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .meeting-header-left {
                display: flex;
                align-items: center;
                gap: 1.5rem;
            }

            .meeting-header-right {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .history-toggle-btn {
                background: #2a2a2a;
                color: #fff;
                border: 1px solid #444;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
            }

            .meeting-enhanced-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                padding: 1.5rem;
                gap: 1.5rem;
            }

            .meeting-main-panel {
                flex: 1.5;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                overflow-y: auto;
                padding-right: 1rem;
            }

            .meeting-side-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                overflow-y: auto;
            }

            /* Collapsible Sections */
            .collapsible-section {
                background: #1a1a1a;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #333;
            }

            .section-header {
                background: #242424;
                padding: 1rem;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
            }

            .section-header:hover {
                background: #2a2a2a;
            }

            .section-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .toggle-icon {
                transition: transform 0.3s ease;
            }

            .toggle-icon.collapsed {
                transform: rotate(-90deg);
            }

            .section-content {
                padding: 1rem;
                max-height: 1000px;
                overflow: hidden;
                transition: max-height 0.3s ease, padding 0.3s ease;
            }

            .section-content.collapsed {
                max-height: 0;
                padding: 0 1rem;
            }

            .section-controls {
                display: flex;
                justify-content: flex-end;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            /* Meeting Chat Styles */
            .meeting-chat-container {
                display: flex;
                flex-direction: column;
                height: 300px;
            }

            .meeting-chat-messages {
                flex: 1;
                background: #0d0d0d;
                border-radius: 8px;
                padding: 1rem;
                overflow-y: auto;
                margin-bottom: 1rem;
            }

            .chat-message {
                margin-bottom: 1rem;
                padding: 0.5rem;
                border-radius: 8px;
            }

            .chat-message.user {
                background: #2a2a4a;
                margin-left: 2rem;
            }

            .chat-message.assistant {
                background: #1a3a1a;
                margin-right: 2rem;
            }

            .meeting-chat-input {
                display: flex;
                gap: 0.5rem;
            }

            .meeting-chat-input textarea {
                flex: 1;
                background: #1a1a1a;
                border: 1px solid #444;
                color: #fff;
                padding: 0.75rem;
                border-radius: 8px;
                resize: none;
            }

            .send-chat-btn {
                background: #6B46C1;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
            }

            /* Transcript Controls */
            .transcript-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .compact-btn {
                background: #2a2a2a;
                color: #fff;
                border: 1px solid #444;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
            }

            .transcript-info {
                color: #888;
                font-size: 0.9rem;
            }

            /* Meeting History Panel */
            .meeting-history-panel {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 400px;
                background: #1a1a1a;
                border-left: 2px solid #6B46C1;
                z-index: 2100;
                display: flex;
                flex-direction: column;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }

            .meeting-history-panel.show {
                transform: translateX(0);
            }

            .history-header {
                background: #242424;
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #444;
            }

            .close-history-btn {
                background: none;
                border: none;
                color: #fff;
                font-size: 1.5rem;
                cursor: pointer;
            }

            .history-search {
                padding: 1rem;
                border-bottom: 1px solid #333;
            }

            .history-search-input {
                width: 100%;
                background: #0d0d0d;
                border: 1px solid #444;
                color: #fff;
                padding: 0.75rem;
                border-radius: 8px;
            }

            .meeting-history-list {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .history-item {
                background: #242424;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                cursor: pointer;
                transition: background 0.2s ease;
            }

            .history-item:hover {
                background: #2a2a2a;
            }

            .history-item-title {
                font-weight: bold;
                margin-bottom: 0.5rem;
            }

            .history-item-date {
                color: #888;
                font-size: 0.9rem;
            }

            .history-item-stats {
                display: flex;
                gap: 1rem;
                margin-top: 0.5rem;
                font-size: 0.9rem;
                color: #aaa;
            }

            /* Responsive adjustments */
            @media (max-width: 1024px) {
                .meeting-enhanced-content {
                    flex-direction: column;
                }

                .meeting-main-panel,
                .meeting-side-panel {
                    width: 100%;
                }

                .meeting-history-panel {
                    width: 100%;
                }
            }

            /* Additional styles for enhanced features */
            .transcript-enhanced {
                background: #0d0d0d;
                border-radius: 8px;
                padding: 1rem;
                max-height: 400px;
                overflow-y: auto;
            }

            .transcript-entry {
                margin-bottom: 0.75rem;
                padding: 0.5rem;
                border-left: 3px solid #444;
            }

            .transcript-entry.compacted {
                background: #1a1a2a;
                border-left-color: #6B46C1;
            }

            .empty-state {
                color: #666;
                font-style: italic;
                text-align: center;
                padding: 2rem;
            }

            .count-badge {
                background: #6B46C1;
                color: white;
                padding: 0.2rem 0.5rem;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-left: 0.5rem;
            }
        `;

        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Back to chat button
        document.getElementById('backToChat').addEventListener('click', () => this.hide());

        // Start/Stop meeting button
        document.getElementById('startMeetingEnhanced').addEventListener('click', () => this.toggleMeeting());

        // History button
        document.getElementById('showHistoryBtn').addEventListener('click', () => this.toggleHistoryPanel());
        document.getElementById('closeHistory').addEventListener('click', () => this.toggleHistoryPanel());

        // Compact transcript button
        document.getElementById('compactTranscript').addEventListener('click', () => this.compactTranscript());

        // Meeting chat
        document.getElementById('sendMeetingChat').addEventListener('click', () => this.sendMeetingChat());
        document.getElementById('meetingChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMeetingChat();
            }
        });

        // Profile settings
        document.getElementById('profileSettingsEnhanced').addEventListener('click', () => this.showProfileModal());
        document.getElementById('profileFormEnhanced').addEventListener('submit', (e) => this.saveProfile(e));

        // Refresh suggestions
        document.getElementById('refreshSuggestionsEnhanced').addEventListener('click', () => this.generateSuggestions(true));

        // Generate summary
        document.getElementById('generateSummaryEnhanced').addEventListener('click', () => this.generateSummary());

        // Export meeting
        document.getElementById('exportMeetingEnhanced').addEventListener('click', () => this.exportMeeting());

        // Add participant
        document.getElementById('addParticipant').addEventListener('click', () => this.addParticipant());

        // Add manual action
        document.getElementById('addManualAction').addEventListener('click', () => this.addManualActionItem());

        // History search
        document.getElementById('historySearch').addEventListener('input', (e) => this.filterHistory(e.target.value));
    }

    toggleSection(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        const content = section.querySelector('.section-content');
        const icon = section.querySelector('.toggle-icon');
        
        this.sectionVisibility[sectionName] = !this.sectionVisibility[sectionName];
        
        if (this.sectionVisibility[sectionName]) {
            content.classList.remove('collapsed');
            icon.classList.remove('collapsed');
        } else {
            content.classList.add('collapsed');
            icon.classList.add('collapsed');
        }
    }

    toggleHistoryPanel() {
        const panel = document.getElementById('meetingHistoryPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        
        if (panel.style.display === 'block') {
            setTimeout(() => panel.classList.add('show'), 10);
            this.loadMeetingHistory();
        } else {
            panel.classList.remove('show');
            setTimeout(() => panel.style.display = 'none', 300);
        }
    }

    async compactTranscript() {
        if (!this.transcript.length) {
            alert('No transcript to compact');
            return;
        }

        try {
            const response = await fetch('/api/meetings/compact-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    transcript: this.transcript,
                    meetingContext: document.getElementById('meetingDescriptionEnhanced').value
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.compactedTranscript = result.compactedTranscript;
                this.updateTranscriptDisplay(true);
                this.showNotification('Transcript compacted successfully', 'success');
            }
        } catch (error) {
            console.error('Error compacting transcript:', error);
            this.showNotification('Failed to compact transcript', 'error');
        }
    }

    async sendMeetingChat() {
        const input = document.getElementById('meetingChatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        const messagesContainer = document.getElementById('meetingChatMessages');
        
        // Add user message
        this.addChatMessage(message, 'user');
        input.value = '';
        
        try {
            // Prepare context
            const context = {
                transcript: this.compactedTranscript || this.transcript,
                meetingTitle: document.getElementById('meetingTitleEnhanced').value,
                meetingDescription: document.getElementById('meetingDescriptionEnhanced').value,
                actionItems: this.actionItems,
                keyPoints: this.extractKeyPoints()
            };
            
            const response = await fetch('/api/meetings/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message,
                    context,
                    model: window.selectedModel || 'jaahas'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.addChatMessage(result.response, 'assistant');
            } else {
                throw new Error('Failed to get response');
            }
        } catch (error) {
            console.error('Error in meeting chat:', error);
            this.addChatMessage('Sorry, I encountered an error processing your request.', 'assistant');
        }
    }

    addChatMessage(message, type) {
        const messagesContainer = document.getElementById('meetingChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `<strong>${type === 'user' ? 'You' : 'Assistant'}:</strong> ${message}`;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Remove empty state if present
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    updateHistoryDisplay() {
        const listContainer = document.getElementById('meetingHistoryList');
        
        if (!this.meetingHistory.length) {
            listContainer.innerHTML = '<p class="empty-state">No previous meetings found</p>';
            return;
        }
        
        listContainer.innerHTML = this.meetingHistory.map(meeting => `
            <div class="history-item" onclick="meetingMentorEnhanced.loadMeeting('${meeting.id}')">
                <div class="history-item-title">${meeting.title || 'Untitled Meeting'}</div>
                <div class="history-item-date">${new Date(meeting.actual_start || meeting.created_at).toLocaleDateString()}</div>
                <div class="history-item-stats">
                    <span>⏱️ ${meeting.duration ? Math.round(meeting.duration / 60) + ' min' : 'N/A'}</span>
                    <span>💬 ${meeting.transcript_count || 0} entries</span>
                    <span>✓ ${meeting.action_count || 0} actions</span>
                </div>
            </div>
        `).join('');
    }

    filterHistory(searchTerm) {
        const items = document.querySelectorAll('.history-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const title = item.querySelector('.history-item-title').textContent.toLowerCase();
            const date = item.querySelector('.history-item-date').textContent.toLowerCase();
            
            if (title.includes(term) || date.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async loadMeeting(meetingId) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (response.ok) {
                const meeting = await response.json();
                this.populateMeetingData(meeting);
                this.toggleHistoryPanel();
            }
        } catch (error) {
            console.error('Error loading meeting:', error);
            this.showNotification('Failed to load meeting', 'error');
        }
    }

    populateMeetingData(meeting) {
        // Populate meeting fields
        document.getElementById('meetingTitleEnhanced').value = meeting.title || '';
        document.getElementById('meetingDescriptionEnhanced').value = meeting.description || '';
        
        // Load transcript
        if (meeting.transcript) {
            this.transcript = meeting.transcript;
            this.updateTranscriptDisplay();
        }
        
        // Load action items
        if (meeting.actionItems) {
            this.actionItems = meeting.actionItems;
            this.updateActionItems();
        }
        
        // Load participants
        if (meeting.participants) {
            meeting.participants.forEach(p => this.participants.add(p));
            this.updateParticipantsList();
        }
    }

    showNotification(message, type = 'info') {
        // Implement notification display
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Speech recognition handling
    handleSpeechResult(event) {
        const results = event.results;
        const latestResult = results[results.length - 1];
        const transcript = latestResult[0].transcript;
        const isFinal = latestResult.isFinal;

        if (isFinal) {
            this.addTranscriptEntry(transcript);
            this.conversationContext.push(transcript);
            
            // Keep context manageable
            if (this.conversationContext.length > 20) {
                this.conversationContext.shift();
            }
            
            // Auto-detect action items
            this.detectActionItems(transcript);
            
            // Generate suggestions periodically
            const now = Date.now();
            if (now - this.lastSuggestionTime > 30000) { // Every 30 seconds
                this.generateSuggestions();
                this.lastSuggestionTime = now;
            }
        }
    }

    addTranscriptEntry(text, speaker = 'Unknown') {
        const timestamp = new Date().toISOString();
        const entry = { text, speaker, timestamp };
        this.transcript.push(entry);
        
        const transcriptDiv = document.getElementById('transcriptEnhanced');
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.innerHTML = `
            <strong>${speaker}:</strong> ${text}
            <span class="transcript-time">${new Date(timestamp).toLocaleTimeString()}</span>
        `;
        
        transcriptDiv.appendChild(entryDiv);
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        
        // Update transcript count
        document.getElementById('transcriptLength').textContent = `${this.transcript.length} entries`;
        
        // Remove empty state if present
        const emptyState = transcriptDiv.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Save to server if authenticated
        if (this.currentMeetingId && !this.isGuest()) {
            this.saveTranscriptEntry(entry);
        }
    }

    async saveTranscriptEntry(entry) {
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(entry)
            });
        } catch (error) {
            console.error('Failed to save transcript entry:', error);
        }
    }

    detectActionItems(text) {
        const actionKeywords = [
            'will do', 'I\'ll', 'we\'ll', 'need to', 'should', 'must',
            'action item', 'follow up', 'by next', 'deadline', 'deliver',
            'responsible for', 'assigned to', 'take care of'
        ];
        
        const lowerText = text.toLowerCase();
        const hasActionKeyword = actionKeywords.some(keyword => lowerText.includes(keyword));
        
        if (hasActionKeyword && !this.autoDetectedActions.has(text)) {
            this.autoDetectedActions.add(text);
            this.addActionItem(text, 'auto');
        }
    }

    addActionItem(description, type = 'manual') {
        const item = {
            id: Date.now(),
            description,
            type,
            timestamp: new Date().toISOString()
        };
        
        this.actionItems.push(item);
        this.updateActionItems();
        
        // Save to server if authenticated
        if (this.currentMeetingId && !this.isGuest()) {
            this.saveActionItem(item);
        }
    }

    async saveActionItem(item) {
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    description: item.description,
                    assigned_to: item.assigned_to || null,
                    due_date: item.due_date || null
                })
            });
        } catch (error) {
            console.error('Failed to save action item:', error);
        }
    }

    updateActionItems() {
        const container = document.getElementById('actionItemsEnhanced');
        const countBadge = document.getElementById('actionCount');
        
        countBadge.textContent = this.actionItems.length;
        
        if (this.actionItems.length === 0) {
            container.innerHTML = '<p class="empty-state">Action items will be automatically detected...</p>';
            return;
        }
        
        container.innerHTML = this.actionItems.map(item => `
            <div class="action-item ${item.type}">
                <div class="action-content">${item.description}</div>
                <div class="action-meta">
                    <span class="action-type">${item.type === 'auto' ? '🤖 Auto-detected' : '✋ Manual'}</span>
                    <button onclick="meetingMentorEnhanced.removeActionItem(${item.id})" class="remove-btn">×</button>
                </div>
            </div>
        `).join('');
    }

    removeActionItem(id) {
        this.actionItems = this.actionItems.filter(item => item.id !== id);
        this.updateActionItems();
    }

    async generateSuggestions(force = false) {
        if (!this.transcript.length || (!force && this.transcript.length < 3)) return;
        
        try {
            const context = {
                transcript: this.transcript.slice(-10), // Last 10 entries
                meetingTitle: document.getElementById('meetingTitleEnhanced').value,
                meetingDescription: document.getElementById('meetingDescriptionEnhanced').value,
                userProfile: this.userProfile
            };
            
            const response = await fetch('/api/meetings/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ context, model: window.selectedModel || 'jaahas' })
            });
            
            if (response.ok) {
                const suggestions = await response.json();
                this.displaySuggestions(suggestions);
            }
        } catch (error) {
            console.error('Failed to generate suggestions:', error);
        }
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestionsEnhanced');
        container.innerHTML = suggestions.map(s => `
            <div class="suggestion-item">
                <div class="suggestion-text">${s.text}</div>
                <button onclick="meetingMentorEnhanced.useSuggestion('${s.text}')" class="use-btn">Use</button>
            </div>
        `).join('');
    }

    useSuggestion(text) {
        // Could add to transcript or show as a prompt
        alert(`Consider saying: "${text}"`);
    }

    async generateSummary() {
        if (!this.transcript.length) {
            alert('No transcript to summarize');
            return;
        }
        
        try {
            const response = await fetch('/api/meetings/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    meetingId: this.currentMeetingId,
                    transcript: this.transcript,
                    actionItems: this.actionItems,
                    model: window.selectedModel || 'jaahas'
                })
            });
            
            if (response.ok) {
                const summary = await response.json();
                this.displaySummary(summary);
            }
        } catch (error) {
            console.error('Failed to generate summary:', error);
            alert('Failed to generate summary');
        }
    }

    displaySummary(summary) {
        // Create and show summary modal
        const modal = document.createElement('div');
        modal.className = 'summary-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Meeting Summary</h2>
                <div class="summary-content">
                    <h3>Overview</h3>
                    <p>${summary.overview}</p>
                    
                    <h3>Key Points</h3>
                    <ul>${summary.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>
                    
                    <h3>Action Items</h3>
                    <ul>${summary.actionItems.map(a => `<li>${a}</li>`).join('')}</ul>
                    
                    <h3>Next Steps</h3>
                    <p>${summary.nextSteps}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="close-btn">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async exportMeeting() {
        const data = {
            title: document.getElementById('meetingTitleEnhanced').value || 'Untitled Meeting',
            description: document.getElementById('meetingDescriptionEnhanced').value,
            date: new Date().toISOString(),
            duration: this.meetingStartTime ? Date.now() - this.meetingStartTime : 0,
            participants: Array.from(this.participants),
            transcript: this.transcript,
            actionItems: this.actionItems,
            keyPoints: this.extractKeyPoints()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    extractKeyPoints() {
        // Simple extraction - in production, use AI
        return this.transcript
            .filter(entry => entry.text.length > 50)
            .slice(0, 5)
            .map(entry => entry.text);
    }

    toggleMeeting() {
        if (this.isListening) {
            this.stopMeeting();
        } else {
            this.startMeeting();
        }
    }

    async startMeeting() {
        try {
            // Create meeting record
            const response = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: document.getElementById('meetingTitleEnhanced').value || 'Untitled Meeting',
                    description: document.getElementById('meetingDescriptionEnhanced').value
                })
            });
            
            if (response.ok) {
                const meeting = await response.json();
                this.currentMeetingId = meeting.id;
            }
        } catch (error) {
            console.error('Failed to create meeting:', error);
        }
        
        this.isListening = true;
        this.meetingStartTime = Date.now();
        this.recognition.start();
        
        const btn = document.getElementById('startMeetingEnhanced');
        btn.innerHTML = '<span class="rec-icon recording">⬤</span> Stop Recording';
        btn.classList.add('recording');
        
        // Enable controls
        document.getElementById('addManualAction').disabled = false;
        document.getElementById('generateSummaryEnhanced').disabled = false;
        document.getElementById('exportMeetingEnhanced').disabled = false;
        
        // Start timer
        this.startTimer();
    }

    stopMeeting() {
        this.isListening = false;
        this.recognition.stop();
        
        const btn = document.getElementById('startMeetingEnhanced');
        btn.innerHTML = '<span class="rec-icon">⬤</span> Start Recording';
        btn.classList.remove('recording');
        
        this.updateStatus('Recording stopped', 'stopped');
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Save meeting end time
        if (this.currentMeetingId) {
            this.saveMeetingEnd();
        }
    }

    async saveMeetingEnd() {
        const duration = Date.now() - this.meetingStartTime;
        
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    actual_end: new Date().toISOString(),
                    duration: Math.round(duration / 1000) // in seconds
                })
            });
        } catch (error) {
            console.error('Failed to save meeting end:', error);
        }
    }

    startTimer() {
        const timerElement = document.getElementById('meetingTimer');
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.meetingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    updateStatus(message, type) {
        const statusElement = document.getElementById('meetingStatusEnhanced');
        statusElement.textContent = message;
        statusElement.className = `meeting-status-indicator ${type}`;
    }

    addParticipant() {
        const name = prompt('Enter participant name:');
        if (name) {
            this.participants.add(name);
            this.updateParticipantsList();
        }
    }

    updateParticipantsList() {
        const container = document.getElementById('participantsListEnhanced');
        container.innerHTML = Array.from(this.participants).map(p => 
            `<span class="participant-tag">${p}</span>`
        ).join('');
    }

    addManualActionItem() {
        const description = prompt('Enter action item:');
        if (description) {
            this.addActionItem(description, 'manual');
        }
    }

    showProfileModal() {
        document.getElementById('profileModalEnhanced').style.display = 'block';
    }

    closeProfileModal() {
        document.getElementById('profileModalEnhanced').style.display = 'none';
    }

    async saveProfile(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profile = Object.fromEntries(formData);
        
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(profile)
            });
            
            if (response.ok) {
                this.userProfile = profile;
                this.closeProfileModal();
                this.showNotification('Profile saved successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            this.showNotification('Failed to save profile', 'error');
        }
    }

    isGuest() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.isGuest === true;
    }

    updateTranscriptDisplay(showCompacted = false) {
        const transcriptDiv = document.getElementById('transcriptEnhanced');
        
        if (showCompacted && this.compactedTranscript) {
            transcriptDiv.innerHTML = `<div class="transcript-entry compacted">${this.compactedTranscript}</div>`;
        } else {
            transcriptDiv.innerHTML = this.transcript.map(entry => `
                <div class="transcript-entry">
                    <strong>${entry.speaker}:</strong> ${entry.text}
                    <span class="transcript-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
            `).join('');
        }
        
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }
    
    show() {
        const container = document.getElementById('meeting-mentor-enhanced');
        container.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        const container = document.getElementById('meeting-mentor-enhanced');
        container.style.display = 'none';
        document.body.style.overflow = '';
        
        if (this.isListening) {
            this.stopMeeting();
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.meetingMentorEnhanced = new MeetingMentorEnhanced();
    });
} else {
    window.meetingMentorEnhanced = new MeetingMentorEnhanced();
}