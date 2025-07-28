// Meeting Mentor - Full Screen Version with Auto Action Items and Summary
class MeetingMentorFullscreen {
    constructor() {
        console.log('MeetingMentorFullscreen constructor called');
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
        
        try {
            this.initializeSpeechRecognition();
            this.loadUserProfile();
            this.createFullscreenUI();
            console.log('MeetingMentorFullscreen initialized successfully');
        } catch (error) {
            console.error('Error initializing MeetingMentorFullscreen:', error);
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

    createFullscreenUI() {
        // Create fullscreen container
        const container = document.createElement('div');
        container.id = 'meeting-mentor-fullscreen';
        container.className = 'meeting-fullscreen-container';
        container.style.display = 'none';
        container.innerHTML = `
            <div class="meeting-fullscreen-header">
                <div class="meeting-header-left">
                    <button id="backToChat" class="back-to-chat-btn">
                        ← Back to Chat
                    </button>
                    <h2>Meeting Assistant</h2>
                    <span id="meetingTimer" class="meeting-timer">00:00</span>
                </div>
                <div class="meeting-header-right">
                    <span id="meetingStatusFS" class="meeting-status-indicator">Ready</span>
                    <button id="startMeetingFS" class="start-meeting-btn">
                        <span class="rec-icon">⬤</span> Start Recording
                    </button>
                </div>
            </div>

            <div class="meeting-fullscreen-content">
                <div class="meeting-main-panel">
                    <div class="meeting-info-bar">
                        <input type="text" id="meetingTitleFS" placeholder="Meeting Title..." class="meeting-title-input-fs">
                        <div class="participants-section">
                            <span>Participants: </span>
                            <div id="participantsListFS" class="participants-list-fs"></div>
                            <button id="addParticipant" class="add-participant-btn">+ Add</button>
                        </div>
                    </div>
                    
                    <div class="meeting-description-section">
                        <textarea id="meetingDescriptionFS" placeholder="Meeting description and context... (e.g., Sprint planning for Q1 2024, discussing budget allocation and timeline)" class="meeting-description-input"></textarea>
                    </div>

                    <div class="transcript-section">
                        <h3>Live Transcript</h3>
                        <div id="transcriptFS" class="transcript-fullscreen">
                            <p class="empty-state">Click "Start Recording" to begin transcription...</p>
                        </div>
                    </div>
                </div>

                <div class="meeting-side-panel">
                    <div class="ai-suggestions-section">
                        <h3>AI Suggestions 
                            <button id="refreshSuggestionsFS" class="refresh-suggestions-btn" title="Refresh">🔄</button>
                            <button id="profileSettingsFS" class="profile-settings-btn" title="Profile Settings">⚙️</button>
                        </h3>
                        <div id="suggestionsFS" class="suggestions-fullscreen">
                            <p class="empty-state">Start recording to get coaching tips on what to bring up next...</p>
                        </div>
                    </div>

                    <div class="action-items-section">
                        <h3>Action Items 
                            <span id="actionCount" class="count-badge">0</span>
                        </h3>
                        <div id="actionItemsFS" class="action-items-fullscreen">
                            <p class="empty-state">Action items will be automatically detected...</p>
                        </div>
                        <button id="addManualAction" class="add-manual-action-btn" disabled>
                            + Add Action Item
                        </button>
                    </div>

                    <div class="key-points-section">
                        <h3>Key Points</h3>
                        <div id="keyPointsFS" class="key-points-fullscreen">
                            <p class="empty-state">Important points will appear here...</p>
                        </div>
                    </div>

                    <div class="meeting-controls-section">
                        <button id="generateSummaryFS" class="generate-summary-btn" disabled>
                            Generate Summary
                        </button>
                        <button id="exportMeetingFS" class="export-meeting-btn" disabled>
                            Export Meeting
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Profile Settings Modal -->
            <div id="profileModalFS" class="profile-modal-fs" style="display: none;">
                <div class="modal-content-fs">
                    <h3>Profile Settings</h3>
                    <p class="modal-description">Set your role and goals to get personalized meeting suggestions</p>
                    <form id="profileFormFS">
                        <div class="form-group">
                            <label>Job Title</label>
                            <input type="text" id="jobTitleFS" name="job_title" placeholder="e.g., Product Manager, Software Engineer">
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <input type="text" id="departmentFS" name="department" placeholder="e.g., Engineering, Sales, Marketing">
                        </div>
                        <div class="form-group">
                            <label>Current Goals & Responsibilities</label>
                            <textarea id="responsibilitiesFS" name="responsibilities" placeholder="What are your main goals and responsibilities? What do you want to achieve in meetings?"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Communication Style</label>
                            <select id="communicationStyleFS" name="communication_style">
                                <option value="assertive">Assertive - Direct and confident</option>
                                <option value="collaborative">Collaborative - Team-focused</option>
                                <option value="analytical">Analytical - Data-driven</option>
                                <option value="diplomatic">Diplomatic - Tactful and considerate</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Meeting Preferences</label>
                            <textarea id="meetingPrefsFS" name="meeting_preferences" placeholder="e.g., I prefer to ask clarifying questions, I like to summarize action items"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="save-profile-btn">Save Profile</button>
                            <button type="button" class="cancel-btn" onclick="meetingMentorFS.closeProfileModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.addFullscreenStyles();
        this.setupEventListeners();
    }

    addFullscreenStyles() {
        if (document.getElementById('meeting-fullscreen-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'meeting-fullscreen-styles';
        styles.textContent = `
            .meeting-fullscreen-container {
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

            .meeting-fullscreen-header {
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

            .back-to-chat-btn {
                background: #333333;
                color: #e0e0e0;
                border: 1px solid #555555;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .back-to-chat-btn:hover {
                background: #444444;
                transform: translateX(-2px);
            }

            .meeting-timer {
                font-family: monospace;
                font-size: 1.2rem;
                color: #9F7AEA;
            }

            .meeting-status-indicator {
                padding: 0.5rem 1rem;
                border-radius: 20px;
                background: #333333;
                font-size: 0.9rem;
            }

            .meeting-status-indicator.active {
                background: #48bb78;
                color: white;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            .start-meeting-btn {
                background: #6B46C1;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .start-meeting-btn:hover {
                background: #9F7AEA;
                transform: translateY(-2px);
            }

            .start-meeting-btn.recording {
                background: #e53e3e;
            }

            .rec-icon {
                font-size: 0.8rem;
            }

            .meeting-fullscreen-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                padding: 2rem;
                gap: 2rem;
            }

            .meeting-main-panel {
                flex: 2;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .meeting-info-bar {
                background: #1a1a1a;
                border: 1px solid #333333;
                border-radius: 8px;
                padding: 1rem;
                display: flex;
                gap: 2rem;
                align-items: center;
            }

            .meeting-title-input-fs {
                flex: 1;
                background: #0d0d0d;
                border: 1px solid #6B46C1;
                border-radius: 6px;
                padding: 0.75rem;
                color: #e0e0e0;
                font-size: 1.1rem;
            }
            
            .meeting-description-section {
                background: #1a1a1a;
                border: 1px solid #333333;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;
            }
            
            .meeting-description-input {
                width: 100%;
                background: #0d0d0d;
                border: 1px solid #6B46C1;
                border-radius: 6px;
                padding: 0.75rem;
                color: #e0e0e0;
                font-size: 1rem;
                font-family: inherit;
                min-height: 80px;
                resize: vertical;
            }
            
            .meeting-description-input::placeholder {
                color: #666666;
            }
            
            .meeting-description-input:focus {
                outline: none;
                border-color: #9F7AEA;
                box-shadow: 0 0 0 2px rgba(159, 122, 234, 0.2);
            }

            .participants-section {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .participants-list-fs {
                display: flex;
                gap: 0.5rem;
            }

            .participant-chip {
                background: #6B46C1;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.9rem;
            }

            .add-participant-btn {
                background: transparent;
                border: 1px solid #6B46C1;
                color: #6B46C1;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.9rem;
            }

            .transcript-section {
                flex: 1;
                background: #1a1a1a;
                border: 1px solid #333333;
                border-radius: 8px;
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
            }

            .transcript-fullscreen {
                flex: 1;
                overflow-y: auto;
                background: #0d0d0d;
                border-radius: 6px;
                padding: 1rem;
                margin-top: 1rem;
            }

            .transcript-entry-fs {
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: #1a1a1a;
                border-left: 3px solid #6B46C1;
                border-radius: 6px;
            }

            .transcript-speaker {
                font-weight: bold;
                color: #9F7AEA;
                margin-bottom: 0.25rem;
            }

            .transcript-text {
                color: #e0e0e0;
                line-height: 1.5;
            }

            .transcript-time {
                font-size: 0.8rem;
                color: #666666;
                margin-top: 0.25rem;
            }

            .meeting-side-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .ai-suggestions-section,
            .action-items-section,
            .key-points-section {
                background: #1a1a1a;
                border: 1px solid #333333;
                border-radius: 8px;
                padding: 1.5rem;
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .ai-suggestions-section {
                flex: 1.5; /* Make suggestions section larger */
                border-color: #6B46C1;
            }
            
            .refresh-suggestions-btn,
            .profile-settings-btn {
                background: transparent;
                border: none;
                color: #9F7AEA;
                cursor: pointer;
                padding: 0.25rem;
                margin-left: 0.5rem;
                font-size: 1rem;
                transition: transform 0.3s ease;
            }
            
            .refresh-suggestions-btn:hover {
                transform: rotate(180deg);
            }
            
            .profile-settings-btn:hover {
                transform: scale(1.2);
            }

            .count-badge {
                background: #48bb78;
                color: white;
                padding: 0.1rem 0.5rem;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-left: 0.5rem;
            }

            .suggestions-fullscreen,
            .action-items-fullscreen,
            .key-points-fullscreen {
                flex: 1;
                overflow-y: auto;
                background: #0d0d0d;
                border-radius: 6px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            .suggestion-item-fs {
                background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
                border: 2px solid #6B46C1;
                border-radius: 8px;
                padding: 1.2rem;
                margin-bottom: 1rem;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(107, 70, 193, 0.2);
            }
            
            .suggestion-item-fs:hover {
                border-color: #9F7AEA;
                transform: translateX(4px);
                box-shadow: 0 4px 12px rgba(107, 70, 193, 0.3);
            }
            
            .suggestion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
            }
            
            .suggestion-text {
                flex: 1;
                color: #ffffff;
                font-size: 1.1rem;
                font-weight: 500;
                line-height: 1.4;
            }
            
            .use-suggestion-btn {
                background: rgba(107, 70, 193, 0.2);
                color: #9F7AEA;
                border: 1px solid #6B46C1;
                padding: 0.4rem 0.8rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .use-suggestion-btn:hover {
                background: #6B46C1;
                color: white;
            }
            
            .suggestion-context {
                font-size: 0.8rem;
                color: #999999;
                margin-top: 0.5rem;
                font-style: italic;
            }

            .action-item-fs {
                background: #1a1a1a;
                border: 1px solid #48bb78;
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 0.75rem;
            }

            .action-item-fs.auto-detected {
                border-color: #ed8936;
            }

            .action-item-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
            }

            .action-item-text {
                flex: 1;
                color: #e0e0e0;
            }

            .auto-detected-badge {
                background: #ed8936;
                color: white;
                padding: 0.1rem 0.5rem;
                border-radius: 4px;
                font-size: 0.7rem;
            }

            .action-item-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.9rem;
                color: #999999;
                margin-top: 0.5rem;
            }

            .key-point-fs {
                background: #1a1a1a;
                border-left: 3px solid #9F7AEA;
                padding: 0.75rem;
                margin-bottom: 0.75rem;
                border-radius: 6px;
            }

            .add-manual-action-btn {
                background: #48bb78;
                color: white;
                border: none;
                padding: 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
                transition: all 0.3s ease;
            }

            .add-manual-action-btn:hover:not(:disabled) {
                background: #38a169;
            }

            .add-manual-action-btn:disabled {
                background: #333333;
                cursor: not-allowed;
            }

            .meeting-controls-section {
                display: flex;
                gap: 1rem;
            }

            .generate-summary-btn,
            .export-meeting-btn {
                flex: 1;
                background: #6B46C1;
                color: white;
                border: none;
                padding: 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .generate-summary-btn:hover:not(:disabled),
            .export-meeting-btn:hover:not(:disabled) {
                background: #9F7AEA;
            }

            .generate-summary-btn:disabled,
            .export-meeting-btn:disabled {
                background: #333333;
                cursor: not-allowed;
            }

            .empty-state {
                text-align: center;
                color: #666666;
                font-style: italic;
                padding: 2rem;
            }

            .meeting-summary-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #1a1a1a;
                border: 2px solid #6B46C1;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 2100;
            }

            .summary-content {
                color: #e0e0e0;
                line-height: 1.6;
            }

            .summary-section {
                margin-bottom: 1.5rem;
            }

            .summary-section h4 {
                color: #9F7AEA;
                margin-bottom: 0.5rem;
            }

            .close-summary-btn {
                background: #6B46C1;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 1.5rem;
            }
            
            .profile-modal-fs {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2100;
            }
            
            .modal-content-fs {
                background: #1a1a1a;
                border: 2px solid #6B46C1;
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .modal-description {
                color: #999999;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: block;
                color: #9F7AEA;
                margin-bottom: 0.5rem;
                font-weight: 500;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                background: #0d0d0d;
                border: 1px solid #333333;
                border-radius: 6px;
                padding: 0.75rem;
                color: #e0e0e0;
                font-size: 1rem;
            }
            
            .form-group textarea {
                min-height: 100px;
                resize: vertical;
            }
            
            .form-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 2rem;
            }
            
            .save-profile-btn {
                background: #6B46C1;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .save-profile-btn:hover {
                background: #9F7AEA;
            }
            
            .cancel-btn {
                background: #333333;
                color: #e0e0e0;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
            }
            
            /* Mobile responsive styles */
            @media screen and (max-width: 768px) {
                .meeting-fullscreen-container {
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
                }
                
                .meeting-fullscreen-header {
                    padding: 0.75rem 1rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .meeting-header-left {
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }
                
                .meeting-fullscreen-content {
                    flex-direction: column;
                    padding: 1rem;
                    gap: 1rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                }
                
                .meeting-main-panel,
                .meeting-side-panel {
                    width: 100%;
                    max-width: 100%;
                }
                
                .meeting-info-bar {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: stretch;
                }
                
                .meeting-description-section {
                    padding: 0.75rem;
                }
                
                .meeting-description-input {
                    min-height: 60px;
                    font-size: 0.9rem;
                }
                
                .participants-section {
                    flex-wrap: wrap;
                }
                
                .transcript-fullscreen,
                .suggestions-fullscreen,
                .action-items-fullscreen,
                .key-points-fullscreen {
                    max-height: 300px;
                    min-height: 200px;
                }
                
                .ai-suggestions-section {
                    flex: none;
                    min-height: 250px;
                }
                
                .suggestion-item-fs {
                    padding: 0.8rem;
                    margin-bottom: 0.75rem;
                }
                
                .suggestion-text {
                    font-size: 1rem;
                }
                
                .action-item-fs {
                    padding: 0.8rem;
                }
                
                .modal-content {
                    width: 95%;
                    max-width: none;
                    margin: 10px;
                    max-height: 90vh;
                }
                
                .back-to-chat-btn {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.9rem;
                }
                
                .start-meeting-btn {
                    padding: 0.6rem 1rem;
                    font-size: 0.9rem;
                }
                
                /* Ensure body doesn't scroll when fullscreen is open */
                body.meeting-fullscreen-open {
                    overflow: hidden;
                    position: fixed;
                    width: 100%;
                }
            }
            
            @media screen and (max-width: 480px) {
                .meeting-fullscreen-header h2 {
                    font-size: 1.2rem;
                }
                
                .meeting-timer {
                    font-size: 0.9rem;
                }
                
                .transcript-fullscreen,
                .suggestions-fullscreen,
                .action-items-fullscreen {
                    max-height: 250px;
                    font-size: 0.9rem;
                }
                
                .meeting-fullscreen-content {
                    padding: 0.5rem;
                }
                
                .ai-suggestions-section,
                .action-items-section,
                .key-points-section {
                    padding: 1rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Back to chat button
        document.getElementById('backToChat').addEventListener('click', () => {
            this.hide();
        });

        // Start/Stop meeting button
        document.getElementById('startMeetingFS').addEventListener('click', () => {
            this.toggleMeeting();
        });

        // Add participant button
        document.getElementById('addParticipant').addEventListener('click', () => {
            const name = prompt('Enter participant name:');
            if (name) {
                this.addParticipant(name);
            }
        });

        // Add manual action item
        document.getElementById('addManualAction').addEventListener('click', () => {
            this.addManualActionItem();
        });

        // Generate summary button
        document.getElementById('generateSummaryFS').addEventListener('click', () => {
            this.generateMeetingSummary();
        });

        // Export meeting button
        document.getElementById('exportMeetingFS').addEventListener('click', () => {
            this.exportMeeting();
        });

        // Meeting title blur
        document.getElementById('meetingTitleFS').addEventListener('blur', (e) => {
            if (this.currentMeetingId && e.target.value) {
                this.updateMeetingTitle(e.target.value);
            }
        });
        
        // Refresh suggestions button
        document.getElementById('refreshSuggestionsFS').addEventListener('click', () => {
            if (this.isListening) {
                this.generateSuggestions(true);
            }
        });
        
        // Profile settings button
        document.getElementById('profileSettingsFS').addEventListener('click', () => {
            this.showProfileModal();
        });
        
        // Profile form submission
        document.getElementById('profileFormFS').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });
    }

    show() {
        // Hide chat container
        document.querySelector('.container').style.display = 'none';
        
        // Show fullscreen meeting interface
        document.getElementById('meeting-mentor-fullscreen').style.display = 'flex';
        
        // Prevent body scrolling on mobile
        document.body.classList.add('meeting-fullscreen-open');
        
        // Check authentication
        this.checkAuthentication();
        
        // Load profile for guests from localStorage
        setTimeout(() => {
            if (this.isGuest || window.isGuest) {
                const savedProfile = localStorage.getItem('meetingProfile');
                if (savedProfile) {
                    this.userProfile = JSON.parse(savedProfile);
                }
            }
        }, 100);
    }

    hide() {
        // Show chat container
        document.querySelector('.container').style.display = 'flex';
        
        // Hide fullscreen meeting interface
        document.getElementById('meeting-mentor-fullscreen').style.display = 'none';
        
        // Restore body scrolling
        document.body.classList.remove('meeting-fullscreen-open');
        
        // Stop meeting if running
        if (this.isListening) {
            this.toggleMeeting();
        }
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/auth/user', {
                credentials: 'include'
            });
            this.isAuthenticated = response.ok;
        } catch (error) {
            this.isAuthenticated = false;
        }
        
        // Check if user is in guest mode
        this.isGuest = window.isGuest || localStorage.getItem('isGuest') === 'true';
        
        // Allow both authenticated users and guests
        if (!this.isAuthenticated && !this.isGuest) {
            this.showAuthWarning();
        }
    }

    showAuthWarning() {
        alert('Meeting Assistant requires you to be logged in or in guest mode.');
        this.hide();
        window.location.href = '/login.html';
    }

    async toggleMeeting() {
        const btn = document.getElementById('startMeetingFS');
        const btnText = btn.querySelector('span:last-child');
        
        if (!this.isListening) {
            // Start meeting
            try {
                // Request microphone permission
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Create meeting in database (only for authenticated users)
                if (!this.isGuest) {
                    try {
                        const meeting = await this.createMeeting();
                        this.currentMeetingId = meeting.id;
                    } catch (error) {
                        console.log('Guest mode: Meeting not saved to database');
                        this.currentMeetingId = 'guest-' + Date.now();
                    }
                } else {
                    this.currentMeetingId = 'guest-' + Date.now();
                }
                
                // Start recording
                this.isListening = true;
                this.recognition.start();
                this.meetingStartTime = Date.now();
                
                // Update UI
                btn.classList.add('recording');
                btnText.textContent = ' Stop Recording';
                document.getElementById('meetingStatusFS').textContent = 'Recording...';
                document.getElementById('meetingStatusFS').classList.add('active');
                
                // Enable controls
                document.getElementById('addManualAction').disabled = false;
                document.getElementById('generateSummaryFS').disabled = false;
                document.getElementById('exportMeetingFS').disabled = false;
                
                // Clear empty states
                document.getElementById('transcriptFS').innerHTML = '';
                document.getElementById('actionItemsFS').innerHTML = '';
                document.getElementById('keyPointsFS').innerHTML = '';
                
                // Start timer
                this.startTimer();
                
                // Start auto-detection interval
                this.actionDetectionInterval = setInterval(() => {
                    this.detectActionItems();
                }, 5000);
                
                // Start suggestion generation interval
                this.suggestionInterval = setInterval(() => {
                    this.generateSuggestions();
                }, 15000); // Generate suggestions every 15 seconds
                
            } catch (error) {
                console.error('Failed to start meeting:', error);
                alert('Failed to start meeting. Please check microphone permissions.');
            }
        } else {
            // Stop meeting
            this.isListening = false;
            this.recognition.stop();
            
            // Update UI
            btn.classList.remove('recording');
            btnText.textContent = ' Start Recording';
            document.getElementById('meetingStatusFS').textContent = 'Meeting ended';
            document.getElementById('meetingStatusFS').classList.remove('active');
            
            // Stop timer
            this.stopTimer();
            
            // Clear intervals
            if (this.actionDetectionInterval) {
                clearInterval(this.actionDetectionInterval);
            }
            
            if (this.suggestionInterval) {
                clearInterval(this.suggestionInterval);
            }
            
            // End meeting in database
            if (this.currentMeetingId) {
                await this.endMeeting();
                
                // Auto-generate summary
                setTimeout(() => {
                    this.generateMeetingSummary();
                }, 1000);
            }
        }
    }

    async createMeeting() {
        const response = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                title: document.getElementById('meetingTitleFS').value || 'Meeting ' + new Date().toLocaleString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create meeting');
        }
        
        return await response.json();
    }

    async endMeeting() {
        // Skip ending meeting for guest users
        if (this.isGuest) return;
        
        await fetch(`/api/meetings/${this.currentMeetingId}/end`, {
            method: 'POST',
            credentials: 'include'
        });
    }

    handleSpeechResult(event) {
        const results = event.results;
        const currentIndex = results.length - 1;
        const transcript = results[currentIndex][0].transcript;
        const isFinal = results[currentIndex].isFinal;

        if (isFinal) {
            this.addToTranscript(transcript);
        }
    }

    async addToTranscript(text) {
        const entry = {
            text: text.trim(),
            speaker: this.detectSpeaker(text),
            timestamp: new Date().toISOString()
        };
        
        this.transcript.push(entry);
        this.conversationContext.push(`${entry.speaker}: ${entry.text}`);
        
        // Keep full conversation context - no limit
        
        // Update UI
        const transcriptDiv = document.getElementById('transcriptFS');
        const entryElement = document.createElement('div');
        entryElement.className = 'transcript-entry-fs';
        entryElement.innerHTML = `
            <div class="transcript-speaker">${entry.speaker}</div>
            <div class="transcript-text">${entry.text}</div>
            <div class="transcript-time">${new Date(entry.timestamp).toLocaleTimeString()}</div>
        `;
        transcriptDiv.appendChild(entryElement);
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        
        // Save to database
        if (this.currentMeetingId) {
            await this.saveTranscriptEntry(entry);
        }
        
        // Detect key points
        this.detectKeyPoints(text);
        
        // Check if we should generate suggestions
        const now = Date.now();
        if (now - this.lastSuggestionTime > 10000) { // 10 seconds since last suggestion
            this.generateSuggestions();
        }
    }

    detectSpeaker(text) {
        // Simple speaker detection - could be enhanced
        // For now, check if it starts with a name pattern
        const namePattern = /^([A-Z][a-z]+):/;
        const match = text.match(namePattern);
        
        if (match) {
            const speaker = match[1];
            this.participants.add(speaker);
            this.updateParticipantsList();
            return speaker;
        }
        
        return 'Speaker';
    }

    detectActionItems() {
        // Action item patterns
        const actionPatterns = [
            /\b(will|going to|need to|should|must|have to)\s+(\w+\s+){1,10}/gi,
            /\b(action item|todo|task):\s*(.+)/gi,
            /\b(assign|assigned to)\s+(\w+)\s*:?\s*(.+)/gi,
            /\b(follow up|follow-up)\s+(on|with|about)\s+(.+)/gi,
            /\b(deadline|due|by)\s+(date|tomorrow|next week|monday|tuesday|wednesday|thursday|friday)\s*:?\s*(.+)/gi
        ];
        
        // Check recent transcript entries
        const recentEntries = this.transcript.slice(-5);
        
        for (const entry of recentEntries) {
            for (const pattern of actionPatterns) {
                const matches = entry.text.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        // Check if already detected
                        if (!this.autoDetectedActions.has(match)) {
                            this.autoDetectedActions.add(match);
                            this.addActionItem(match, entry.speaker, true);
                        }
                    }
                }
            }
        }
    }

    detectKeyPoints(text) {
        // Key point patterns
        const keyPatterns = [
            /\b(important|key|critical|essential|main point)\s*:?\s*(.+)/gi,
            /\b(decision|decided|agreed)\s*:?\s*(.+)/gi,
            /\b(conclusion|summary)\s*:?\s*(.+)/gi
        ];
        
        for (const pattern of keyPatterns) {
            const match = text.match(pattern);
            if (match) {
                this.addKeyPoint(text);
                break;
            }
        }
    }

    addActionItem(text, assignedTo = '', autoDetected = false) {
        const actionItem = {
            id: Date.now(),
            text: text,
            assignedTo: assignedTo,
            autoDetected: autoDetected,
            timestamp: new Date().toISOString()
        };
        
        this.actionItems.push(actionItem);
        
        // Update UI
        const actionItemsDiv = document.getElementById('actionItemsFS');
        const itemElement = document.createElement('div');
        itemElement.className = `action-item-fs ${autoDetected ? 'auto-detected' : ''}`;
        itemElement.innerHTML = `
            <div class="action-item-header">
                <div class="action-item-text">${text}</div>
                ${autoDetected ? '<span class="auto-detected-badge">Auto</span>' : ''}
            </div>
            <div class="action-item-meta">
                ${assignedTo ? `<span>Assigned to: ${assignedTo}</span>` : ''}
                <span>${new Date(actionItem.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
        actionItemsDiv.appendChild(itemElement);
        
        // Update count
        document.getElementById('actionCount').textContent = this.actionItems.length;
        
        // Save to database
        if (this.currentMeetingId) {
            this.saveActionItem(actionItem);
        }
    }

    addKeyPoint(text) {
        const keyPointsDiv = document.getElementById('keyPointsFS');
        const pointElement = document.createElement('div');
        pointElement.className = 'key-point-fs';
        pointElement.textContent = text;
        keyPointsDiv.appendChild(pointElement);
    }

    addManualActionItem() {
        const text = prompt('Enter action item:');
        if (!text) return;
        
        const assignedTo = prompt('Assigned to (optional):');
        this.addActionItem(text, assignedTo || '', false);
    }

    addParticipant(name) {
        this.participants.add(name);
        this.updateParticipantsList();
    }

    updateParticipantsList() {
        const listDiv = document.getElementById('participantsListFS');
        listDiv.innerHTML = Array.from(this.participants)
            .map(p => `<span class="participant-chip">${p}</span>`)
            .join('');
    }

    async generateSuggestions(force = false) {
        if (!this.isListening || this.conversationContext.length === 0) return;
        
        if (!force) {
            const now = Date.now();
            if (now - this.lastSuggestionTime < 10000) return; // Avoid too frequent suggestions
        }
        
        this.lastSuggestionTime = Date.now();
        
        // Show loading state
        const suggestionsDiv = document.getElementById('suggestionsFS');
        suggestionsDiv.innerHTML = '<p class="empty-state">🤔 Generating personalized suggestions...</p>';
        
        // Check guest status first
        const isGuestCheck = this.isGuest || window.isGuest || localStorage.getItem('isGuest') === 'true';
        
        // Ensure we have a chat session if needed (only for authenticated users)
        if (!isGuestCheck && !window.currentSessionId) {
            try {
                // Create a temporary chat session for meeting suggestions
                const response = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ session_name: 'Meeting Assistant Session' })
                });
                
                if (response.ok) {
                    const session = await response.json();
                    window.currentSessionId = session.id;
                }
            } catch (error) {
                console.error('Failed to create chat session:', error);
            }
        }
        
        // Prepare context - use entire meeting transcript
        const context = this.conversationContext.join('\n');
        
        // Get meeting description
        const meetingDescription = document.getElementById('meetingDescriptionFS').value;
        const meetingContext = meetingDescription ? `
Meeting Context:
${meetingDescription}

` : '';
        
        const profileContext = this.userProfile ? `
My Profile:
- Job Title: ${this.userProfile.job_title || 'Not specified'}
- Department: ${this.userProfile.department || 'Not specified'}
- Goals & Responsibilities: ${this.userProfile.responsibilities || 'Not specified'}
- Communication Style: ${this.userProfile.communication_style || 'Not specified'}
- Meeting Preferences: ${this.userProfile.meeting_preferences || 'Not specified'}
` : '';
        
        const prompt = `${profileContext}${meetingContext}
Full meeting transcript so far:
"${context}"

As my meeting coach who has heard the entire conversation, tell me 3 specific things I should bring up or mention next. Consider my role, the meeting's purpose and context, what has already been discussed, and any unresolved topics from earlier in the meeting.

Format each suggestion as a brief coaching tip that tells me WHAT to bring up (not exact words to say).
Examples of good format:
- Mention the budget constraints you discovered last week
- Ask about the timeline for the deliverables
- Bring up the need for additional resources
- Suggest breaking this into smaller milestones
- Point out the risk with the current approach

Keep each suggestion under 15 words and make them scannable at a glance.`;
        
        try {
            // Check if user is guest (from meeting mentor's perspective)
            const isGuestUser = this.isGuest || window.isGuest || localStorage.getItem('isGuest') === 'true';
            
            // Use the same endpoint as the main chat
            const endpoint = isGuestUser ? '/api/guest/chat' : '/api/chat';
            
            console.log('Guest status:', isGuestUser, 'Using endpoint:', endpoint);
            
            // Get the selected model from the main chat (using the global variable)
            const selectedModel = window.selectedModel || 'llama3.2:latest';
            
            console.log('Generating suggestions with model:', selectedModel);
            
            const body = {
                model: selectedModel,
                messages: [{
                    role: 'system',
                    content: 'You are a meeting coach with access to the entire meeting transcript and the meeting\'s purpose/context. You can see everything that has been discussed from the beginning. Provide quick, scannable advice on what topics or points to bring up next, considering the meeting\'s goals, recent discussion, and earlier unresolved topics. Give brief tips, not scripts to read. Focus on strategic guidance that helps the user contribute effectively based on their role and the meeting\'s objectives.'
                }, {
                    role: 'user',
                    content: prompt
                }]
            };
            
            // Add session ID if not guest
            if (!isGuestUser && window.currentSessionId) {
                body.sessionId = window.currentSessionId;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displaySuggestions(data.message.content);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Suggestion generation failed:', response.status, errorData);
                suggestionsDiv.innerHTML = `<p class="empty-state">Failed to generate suggestions: ${errorData.error || response.statusText}</p>`;
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
            suggestionsDiv.innerHTML = `<p class="empty-state">Error: ${error.message}</p>`;
        }
    }
    
    displaySuggestions(suggestionsText) {
        const suggestionsDiv = document.getElementById('suggestionsFS');
        suggestionsDiv.innerHTML = '';
        
        // Parse suggestions
        const lines = suggestionsText.split('\n').filter(line => line.trim());
        let suggestionCount = 0;
        
        for (const line of lines) {
            // Look for numbered items or bullet points
            if (line.match(/^[0-9]+\.|^[-•*]/)) {
                suggestionCount++;
                const suggestionText = line.replace(/^[0-9]+\.\s*|^[-•*]\s*/, '').trim();
                
                const suggestionElement = document.createElement('div');
                suggestionElement.className = 'suggestion-item-fs';
                suggestionElement.innerHTML = `
                    <div class="suggestion-header">
                        <div class="suggestion-text">💡 ${suggestionText}</div>
                    </div>
                    <button class="use-suggestion-btn" onclick="meetingMentorFS.noteSuggestion('${suggestionText.replace(/'/g, "\\'")}')">
                        <span style="font-size: 0.8rem;">📝</span> Note
                    </button>
                `;
                suggestionsDiv.appendChild(suggestionElement);
            }
        }
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.style.fontSize = '0.8rem';
        timestamp.style.color = '#666666';
        timestamp.style.textAlign = 'center';
        timestamp.style.marginTop = '1rem';
        timestamp.textContent = `Updated ${new Date().toLocaleTimeString()}`;
        suggestionsDiv.appendChild(timestamp);
    }
    
    noteSuggestion(text) {
        // Add to action items as a note
        this.addActionItem(`Note to self: ${text}`, 'Me', false);
        
        // Show feedback
        const btn = event.target;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓ Noted!';
        btn.style.background = '#48bb78';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 2000);
    }

    async generateMeetingSummary() {
        if (!this.currentMeetingId || this.transcript.length === 0) {
            alert('No meeting data to summarize');
            return;
        }
        
        this.updateStatus('Generating summary...', 'active');
        
        try {
            // Prepare transcript text
            const transcriptText = this.transcript
                .map(e => `${e.speaker}: ${e.text}`)
                .join('\n');
            
            // Get meeting description
            const meetingDescription = document.getElementById('meetingDescriptionFS').value;
            const meetingContextForSummary = meetingDescription ? `\nMeeting Context: ${meetingDescription}\n` : '';
            
            // Check if user is guest
            const isGuestUser = this.isGuest || window.isGuest || localStorage.getItem('isGuest') === 'true';
            const endpoint = isGuestUser ? '/api/guest/chat' : '/api/chat';
            
            // Generate summary using AI
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    model: window.selectedModel || 'llama3.2:latest',
                    messages: [{
                        role: 'system',
                        content: 'You are a meeting assistant. Provide a concise, well-structured meeting summary.'
                    }, {
                        role: 'user',
                        content: `Please provide a comprehensive meeting summary for the following:
${meetingContextForSummary}
Transcript:
${transcriptText}

Include:
1. Meeting Overview (2-3 sentences)
2. Key Discussion Points (bullet points)
3. Decisions Made
4. Action Items (with assignees if mentioned)
5. Next Steps

Format the response in clear sections with markdown.`
                    }]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const summary = data.message.content;
                
                // Save summary to database
                await this.saveMeetingSummary(summary);
                
                // Display summary
                this.displaySummary(summary);
            }
        } catch (error) {
            console.error('Failed to generate summary:', error);
            alert('Failed to generate meeting summary');
        }
    }

    displaySummary(summary) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'meeting-summary-modal';
        modal.innerHTML = `
            <h3>Meeting Summary</h3>
            <div class="summary-content">${marked.parse(summary)}</div>
            <button class="close-summary-btn" onclick="this.parentElement.remove()">Close</button>
        `;
        document.body.appendChild(modal);
    }

    async exportMeeting() {
        if (!this.currentMeetingId) return;
        
        const title = document.getElementById('meetingTitleFS').value || 'Meeting';
        const date = new Date().toLocaleDateString();
        const meetingDescription = document.getElementById('meetingDescriptionFS').value;
        
        let content = `# ${title}\n`;
        content += `Date: ${date}\n`;
        content += `Duration: ${document.getElementById('meetingTimer').textContent}\n\n`;
        
        if (meetingDescription) {
            content += `## Meeting Context\n`;
            content += `${meetingDescription}\n\n`;
        }
        
        content += `## Participants\n`;
        content += Array.from(this.participants).join(', ') + '\n\n';
        
        content += `## Transcript\n`;
        this.transcript.forEach(entry => {
            content += `**${entry.speaker}** (${new Date(entry.timestamp).toLocaleTimeString()}): ${entry.text}\n\n`;
        });
        
        content += `## Action Items\n`;
        this.actionItems.forEach((item, index) => {
            content += `${index + 1}. ${item.text}`;
            if (item.assignedTo) content += ` (Assigned to: ${item.assignedTo})`;
            content += '\n';
        });
        
        // Download file
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '-')}-${date}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.meetingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('meetingTimer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateStatus(text, type) {
        const status = document.getElementById('meetingStatusFS');
        status.textContent = text;
        status.className = `meeting-status-indicator ${type}`;
    }

    async saveTranscriptEntry(entry) {
        // Skip saving for guest users
        if (this.isGuest) return;
        
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    speaker_name: entry.speaker,
                    text: entry.text,
                    timestamp: entry.timestamp
                })
            });
        } catch (error) {
            console.error('Failed to save transcript:', error);
        }
    }

    async saveActionItem(item) {
        // Skip saving for guest users
        if (this.isGuest) return;
        
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/action-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    description: item.text,
                    assigned_to: item.assignedTo || null,
                    is_completed: false
                })
            });
        } catch (error) {
            console.error('Failed to save action item:', error);
        }
    }

    async saveMeetingSummary(summary) {
        // Skip saving for guest users
        if (this.isGuest) return;
        
        try {
            await fetch(`/api/meetings/${this.currentMeetingId}/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ summary })
            });
        } catch (error) {
            console.error('Failed to save summary:', error);
        }
    }

    async updateMeetingTitle(title) {
        // This would need a new API endpoint
        console.log('Update meeting title:', title);
    }
    
    showProfileModal() {
        const modal = document.getElementById('profileModalFS');
        modal.style.display = 'flex';
        
        // Load existing profile if available
        if (this.userProfile) {
            document.getElementById('jobTitleFS').value = this.userProfile.job_title || '';
            document.getElementById('departmentFS').value = this.userProfile.department || '';
            document.getElementById('responsibilitiesFS').value = this.userProfile.responsibilities || '';
            document.getElementById('communicationStyleFS').value = this.userProfile.communication_style || 'collaborative';
            document.getElementById('meetingPrefsFS').value = this.userProfile.meeting_preferences || '';
        }
    }
    
    closeProfileModal() {
        document.getElementById('profileModalFS').style.display = 'none';
    }
    
    async saveProfile() {
        const formData = new FormData(document.getElementById('profileFormFS'));
        const profileData = Object.fromEntries(formData);
        
        try {
            if (this.isGuest) {
                // For guests, save profile to localStorage
                localStorage.setItem('meetingProfile', JSON.stringify(profileData));
                this.userProfile = profileData;
                this.closeProfileModal();
                
                // Show success feedback
                const suggestionsDiv = document.getElementById('suggestionsFS');
                const originalContent = suggestionsDiv.innerHTML;
                suggestionsDiv.innerHTML = '<p style="color: #48bb78; text-align: center; padding: 2rem;">✓ Profile saved locally!</p>';
                
                setTimeout(() => {
                    suggestionsDiv.innerHTML = originalContent;
                    // Generate new suggestions with updated profile
                    if (this.isListening) {
                        this.generateSuggestions(true);
                    }
                }, 2000);
            } else {
                // For authenticated users, save to server
                const response = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(profileData)
                });
                
                if (response.ok) {
                    this.userProfile = profileData;
                    this.closeProfileModal();
                    
                    // Show success feedback
                    const suggestionsDiv = document.getElementById('suggestionsFS');
                    const originalContent = suggestionsDiv.innerHTML;
                    suggestionsDiv.innerHTML = '<p style="color: #48bb78; text-align: center; padding: 2rem;">✓ Profile saved successfully!</p>';
                    
                    setTimeout(() => {
                        suggestionsDiv.innerHTML = originalContent;
                        // Generate new suggestions with updated profile
                        if (this.isListening) {
                            this.generateSuggestions(true);
                        }
                    }, 2000);
                } else {
                    alert('Failed to save profile');
                    return;
                }
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save profile');
        }
    }
}

// Initialize the fullscreen meeting mentor
let meetingMentorFS;

// Initialize immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Initializing Meeting Mentor Fullscreen...');
        meetingMentorFS = new MeetingMentorFullscreen();
        window.meetingMentorFS = meetingMentorFS;
        console.log('Meeting Mentor Fullscreen initialized:', window.meetingMentorFS);
    });
} else {
    // DOM is already loaded
    console.log('Initializing Meeting Mentor Fullscreen (immediate)...');
    meetingMentorFS = new MeetingMentorFullscreen();
    window.meetingMentorFS = meetingMentorFS;
    console.log('Meeting Mentor Fullscreen initialized:', window.meetingMentorFS);
}