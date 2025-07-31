// Enhanced Meeting Mentor with Drag & Drop and Collapsible Sections
class MeetingMentorDraggable {
    constructor() {
        console.log('MeetingMentorDraggable constructor called');
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
            meetingInfo: true,
            transcript: true,
            suggestions: true,
            actionItems: true,
            keyPoints: true,
            chat: true,
            history: false
        };
        this.layoutConfig = this.loadLayoutConfig();
        this.draggedElement = null;
        
        try {
            this.initializeSpeechRecognition();
            this.loadUserProfile();
            this.createEnhancedUI();
            this.loadMeetingHistory();
            this.initializeDragAndDrop();
            console.log('MeetingMentorDraggable initialized successfully');
        } catch (error) {
            console.error('Error initializing MeetingMentorDraggable:', error);
        }
    }
    
    loadLayoutConfig() {
        const saved = localStorage.getItem('meetingLayoutConfig');
        return saved ? JSON.parse(saved) : {
            leftPanel: ['meetingInfo', 'transcript', 'chat'],
            rightPanel: ['suggestions', 'actionItems', 'keyPoints']
        };
    }
    
    saveLayoutConfig() {
        localStorage.setItem('meetingLayoutConfig', JSON.stringify(this.layoutConfig));
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
        container.id = 'meeting-mentor-draggable';
        container.className = 'meeting-draggable-container';
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
                    <button id="resetLayout" class="reset-layout-btn" title="Reset Layout">🔄</button>
                    <button id="showHistoryBtn" class="history-toggle-btn" title="Meeting History">📋</button>
                    <span id="meetingStatusDraggable" class="meeting-status-indicator">Ready</span>
                    <button id="startMeetingDraggable" class="start-meeting-btn">
                        <span class="rec-icon">⬤</span> Start Recording
                    </button>
                </div>
            </div>

            <div class="meeting-draggable-content">
                <div class="meeting-main-panel drop-zone" id="leftDropZone">
                    <!-- Sections will be dynamically added here -->
                </div>

                <div class="meeting-side-panel drop-zone" id="rightDropZone">
                    <!-- Sections will be dynamically added here -->
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
            <div id="profileModalDraggable" class="profile-modal-enhanced" style="display: none;">
                <div class="modal-content-enhanced">
                    <h3>Profile Settings</h3>
                    <p class="modal-description">Set your role and goals to get personalized meeting suggestions</p>
                    <form id="profileFormDraggable">
                        <div class="form-group">
                            <label>Job Title</label>
                            <input type="text" id="jobTitleDraggable" name="job_title" placeholder="e.g., Product Manager, Software Engineer">
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <input type="text" id="departmentDraggable" name="department" placeholder="e.g., Engineering, Sales, Marketing">
                        </div>
                        <div class="form-group">
                            <label>Current Goals & Responsibilities</label>
                            <textarea id="responsibilitiesDraggable" name="responsibilities" placeholder="What are your main goals and responsibilities?"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Communication Style</label>
                            <select id="communicationStyleDraggable" name="communication_style">
                                <option value="assertive">Assertive - Direct and confident</option>
                                <option value="collaborative">Collaborative - Team-focused</option>
                                <option value="analytical">Analytical - Data-driven</option>
                                <option value="diplomatic">Diplomatic - Tactful and considerate</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="save-profile-btn">Save Profile</button>
                            <button type="button" class="cancel-btn" onclick="meetingMentorDraggable.closeProfileModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.addEnhancedStyles();
        this.createSections();
        this.setupEventListeners();
    }

    createSections() {
        const sections = {
            meetingInfo: {
                title: 'Meeting Information',
                content: `
                    <div class="meeting-info-content">
                        <input type="text" id="meetingTitleDraggable" placeholder="Meeting Title..." class="meeting-title-input-fs">
                        <div class="participants-section">
                            <span>Participants: </span>
                            <div id="participantsListDraggable" class="participants-list-fs"></div>
                            <button id="addParticipant" class="add-participant-btn">+ Add</button>
                        </div>
                        <textarea id="meetingDescriptionDraggable" placeholder="Meeting description and context..." class="meeting-description-input"></textarea>
                    </div>
                `
            },
            transcript: {
                title: 'Live Transcript',
                content: `
                    <div class="transcript-controls">
                        <button id="compactTranscript" class="compact-btn" title="Compact transcript for long meetings">
                            📝 Compact Transcript
                        </button>
                        <span id="transcriptLength" class="transcript-info">0 entries</span>
                    </div>
                    <div id="transcriptDraggable" class="transcript-enhanced">
                        <p class="empty-state">Click "Start Recording" to begin transcription...</p>
                    </div>
                `
            },
            chat: {
                title: 'Meeting Chat Assistant',
                content: `
                    <div class="meeting-chat-container">
                        <div id="meetingChatMessages" class="meeting-chat-messages">
                            <p class="empty-state">Ask questions about the meeting content...</p>
                        </div>
                        <div class="meeting-chat-input">
                            <textarea id="meetingChatInput" placeholder="Ask about the meeting content, get summaries, or clarify discussions..." rows="2"></textarea>
                            <button id="sendMeetingChat" class="send-chat-btn">Send</button>
                        </div>
                    </div>
                `
            },
            suggestions: {
                title: 'AI Suggestions',
                content: `
                    <div class="section-controls">
                        <button id="refreshSuggestionsDraggable" class="refresh-btn" title="Refresh">🔄</button>
                        <button id="profileSettingsDraggable" class="settings-btn" title="Profile Settings">⚙️</button>
                    </div>
                    <div id="suggestionsDraggable" class="suggestions-enhanced">
                        <p class="empty-state">Start recording to get coaching tips...</p>
                    </div>
                `
            },
            actionItems: {
                title: 'Action Items',
                badge: '<span id="actionCount" class="count-badge">0</span>',
                content: `
                    <div id="actionItemsDraggable" class="action-items-enhanced">
                        <p class="empty-state">Action items will be automatically detected...</p>
                    </div>
                    <button id="addManualAction" class="add-manual-action-btn" disabled>
                        + Add Action Item
                    </button>
                `
            },
            keyPoints: {
                title: 'Key Points',
                content: `
                    <div id="keyPointsDraggable" class="key-points-enhanced">
                        <p class="empty-state">Important points will appear here...</p>
                    </div>
                    <div class="meeting-controls-section">
                        <button id="generateSummaryDraggable" class="generate-summary-btn" disabled>
                            Generate Summary
                        </button>
                        <button id="exportMeetingDraggable" class="export-meeting-btn" disabled>
                            Export Meeting
                        </button>
                    </div>
                `
            }
        };

        // Create sections based on layout config
        this.layoutConfig.leftPanel.forEach(sectionId => {
            if (sections[sectionId]) {
                this.createSection(sectionId, sections[sectionId], 'leftDropZone');
            }
        });

        this.layoutConfig.rightPanel.forEach(sectionId => {
            if (sections[sectionId]) {
                this.createSection(sectionId, sections[sectionId], 'rightDropZone');
            }
        });
    }

    createSection(id, config, panelId) {
        const panel = document.getElementById(panelId);
        const section = document.createElement('div');
        section.className = 'collapsible-section draggable';
        section.setAttribute('data-section', id);
        section.setAttribute('draggable', 'true');
        
        section.innerHTML = `
            <div class="section-header" data-section-id="${id}">
                <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                <h3>${config.title} ${config.badge || ''}</h3>
                <span class="toggle-icon">${this.sectionVisibility[id] ? '▼' : '▶'}</span>
            </div>
            <div class="section-content ${this.sectionVisibility[id] ? '' : 'collapsed'}" id="${id}Section">
                ${config.content}
            </div>
        `;
        
        // Click handler will be added via event delegation in setupEventListeners
        
        panel.appendChild(section);
    }

    addEnhancedStyles() {
        if (document.getElementById('meeting-draggable-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'meeting-draggable-styles';
        styles.textContent = `
            .meeting-draggable-container {
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

            .reset-layout-btn {
                background: #2a2a2a;
                color: #fff;
                border: 1px solid #444;
                padding: 0.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.2rem;
            }

            .meeting-draggable-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                padding: 1.5rem;
                gap: 1.5rem;
            }

            .meeting-main-panel,
            .meeting-side-panel {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                overflow-y: auto;
                padding: 0.5rem;
                position: relative;
            }

            .meeting-main-panel {
                flex: 1.5;
            }

            .meeting-side-panel {
                flex: 1;
            }

            /* Drop zones */
            .drop-zone {
                min-height: 100px;
                border: 2px dashed transparent;
                border-radius: 12px;
                transition: all 0.3s ease;
            }

            .drop-zone.drag-over {
                border-color: #6B46C1;
                background: rgba(107, 70, 193, 0.1);
            }

            /* Draggable sections */
            .draggable {
                cursor: move;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            .draggable.dragging {
                opacity: 0.5;
                transform: scale(0.95);
            }

            .drag-handle {
                cursor: grab;
                padding: 0.5rem;
                margin-right: 0.5rem;
                user-select: none;
                font-size: 1.2rem;
                opacity: 0.5;
                transition: opacity 0.2s ease;
                pointer-events: auto !important;
                z-index: 1;
            }

            .drag-handle:hover {
                opacity: 1;
            }

            .draggable.dragging .drag-handle {
                cursor: grabbing;
            }

            /* Collapsible Sections */
            .collapsible-section {
                background: #1a1a1a;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #333;
                transition: box-shadow 0.3s ease;
            }

            .collapsible-section:hover {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            .section-header {
                background: #242424;
                padding: 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                user-select: none;
                position: relative;
            }

            .section-header:hover {
                background: #2a2a2a;
            }

            .section-header h3 {
                margin: 0;
                flex: 1;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                pointer-events: none;
            }
            
            .section-header h3 * {
                pointer-events: none;
            }

            .toggle-icon {
                transition: transform 0.3s ease;
                margin-left: auto;
                pointer-events: none;
            }

            .section-content {
                padding: 1rem;
                max-height: 1000px;
                overflow: hidden;
                transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
            }

            .section-content.collapsed {
                max-height: 0;
                padding: 0 1rem;
                opacity: 0;
            }

            /* Specific section styles */
            .meeting-info-content {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .meeting-title-input-fs {
                background: #0d0d0d;
                border: 1px solid #444;
                color: #fff;
                padding: 0.75rem;
                border-radius: 8px;
                font-size: 1.1rem;
            }

            .meeting-description-input {
                background: #0d0d0d;
                border: 1px solid #444;
                color: #fff;
                padding: 0.75rem;
                border-radius: 8px;
                resize: vertical;
                min-height: 80px;
            }

            .participants-section {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .participants-list-fs {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .participant-tag {
                background: #2a2a2a;
                padding: 0.3rem 0.8rem;
                border-radius: 16px;
                font-size: 0.9rem;
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

            /* Visual feedback during drag */
            .drag-preview {
                position: fixed;
                pointer-events: none;
                z-index: 3000;
                opacity: 0.8;
                transform: rotate(2deg);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            }

            /* Section controls */
            .section-controls {
                display: flex;
                justify-content: flex-end;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            /* Responsive adjustments */
            @media (max-width: 1024px) {
                .meeting-draggable-content {
                    flex-direction: column;
                }

                .meeting-main-panel,
                .meeting-side-panel {
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
                pointer-events: none;
            }

            /* Animations */
            @keyframes slideIn {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .section-drop-indicator {
                height: 4px;
                background: #6B46C1;
                margin: 0.5rem 0;
                border-radius: 2px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .section-drop-indicator.active {
                opacity: 1;
            }
        `;

        document.head.appendChild(styles);
    }

    initializeDragAndDrop() {
        // Initialize drag and drop for all draggable sections
        document.querySelectorAll('.draggable').forEach(section => {
            section.addEventListener('dragstart', this.handleDragStart.bind(this));
            section.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Initialize drop zones
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }

    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        
        // Remove any drag-over classes
        document.querySelectorAll('.drag-over').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        
        // Update layout configuration
        this.updateLayoutConfig();
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        const dropZone = e.currentTarget;
        dropZone.classList.add('drag-over');
        
        // Find the element we're hovering over
        const afterElement = this.getDragAfterElement(dropZone, e.clientY);
        
        if (afterElement == null) {
            dropZone.appendChild(this.draggedElement);
        } else {
            dropZone.insertBefore(this.draggedElement, afterElement);
        }
        
        return false;
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        const dropZone = e.currentTarget;
        dropZone.classList.remove('drag-over');
        
        return false;
    }

    handleDragLeave(e) {
        if (e.currentTarget.classList.contains('drop-zone')) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateLayoutConfig() {
        // Update the layout configuration based on current DOM state
        const leftPanel = document.getElementById('leftDropZone');
        const rightPanel = document.getElementById('rightDropZone');
        
        this.layoutConfig.leftPanel = [...leftPanel.querySelectorAll('.draggable')]
            .map(el => el.getAttribute('data-section'));
        
        this.layoutConfig.rightPanel = [...rightPanel.querySelectorAll('.draggable')]
            .map(el => el.getAttribute('data-section'));
        
        this.saveLayoutConfig();
    }

    resetLayout() {
        this.layoutConfig = {
            leftPanel: ['meetingInfo', 'transcript', 'chat'],
            rightPanel: ['suggestions', 'actionItems', 'keyPoints']
        };
        this.saveLayoutConfig();
        
        // Clear and recreate sections
        document.getElementById('leftDropZone').innerHTML = '';
        document.getElementById('rightDropZone').innerHTML = '';
        this.createSections();
        this.initializeDragAndDrop();
        
        // Re-attach event listeners for dynamic content
        this.setupDynamicEventListeners();
        
        this.showNotification('Layout reset to default', 'success');
    }

    setupEventListeners() {
        // Back to chat button
        document.getElementById('backToChat').addEventListener('click', () => this.hide());

        // Start/Stop meeting button
        document.getElementById('startMeetingDraggable').addEventListener('click', () => this.toggleMeeting());

        // History button
        document.getElementById('showHistoryBtn').addEventListener('click', () => this.toggleHistoryPanel());
        document.getElementById('closeHistory').addEventListener('click', () => this.toggleHistoryPanel());

        // Reset layout button
        document.getElementById('resetLayout').addEventListener('click', () => this.resetLayout());

        // Profile form
        document.getElementById('profileFormDraggable').addEventListener('submit', (e) => this.saveProfile(e));

        // History search
        document.getElementById('historySearch').addEventListener('input', (e) => this.filterHistory(e.target.value));
        
        // Event delegation for section headers (handles dynamically moved sections)
        const container = document.getElementById('meeting-mentor-draggable');
        container.addEventListener('click', (e) => {
            // Check if click is on section header or its children
            const header = e.target.closest('.section-header');
            if (header) {
                // Prevent toggle when clicking on drag handle
                if (e.target.classList.contains('drag-handle') || e.target.closest('.drag-handle')) {
                    return;
                }
                
                // Get the section id from the parent section element
                const section = header.closest('.collapsible-section');
                if (section) {
                    const sectionId = section.getAttribute('data-section');
                    if (sectionId) {
                        this.toggleSection(sectionId);
                    }
                }
            }
        });
        
        // Setup dynamic event listeners
        this.setupDynamicEventListeners();
    }

    setupDynamicEventListeners() {
        // Compact transcript button
        const compactBtn = document.getElementById('compactTranscript');
        if (compactBtn) {
            compactBtn.addEventListener('click', () => this.compactTranscript());
        }

        // Meeting chat
        const sendChatBtn = document.getElementById('sendMeetingChat');
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', () => this.sendMeetingChat());
        }
        
        const chatInput = document.getElementById('meetingChatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMeetingChat();
                }
            });
        }

        // Profile settings
        const profileBtn = document.getElementById('profileSettingsDraggable');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showProfileModal());
        }

        // Refresh suggestions
        const refreshBtn = document.getElementById('refreshSuggestionsDraggable');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.generateSuggestions(true));
        }

        // Generate summary
        const summaryBtn = document.getElementById('generateSummaryDraggable');
        if (summaryBtn) {
            summaryBtn.addEventListener('click', () => this.generateSummary());
        }

        // Export meeting
        const exportBtn = document.getElementById('exportMeetingDraggable');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportMeeting());
        }

        // Add participant
        const addParticipantBtn = document.getElementById('addParticipant');
        if (addParticipantBtn) {
            addParticipantBtn.addEventListener('click', () => this.addParticipant());
        }

        // Add manual action
        const addActionBtn = document.getElementById('addManualAction');
        if (addActionBtn) {
            addActionBtn.addEventListener('click', () => this.addManualActionItem());
        }
    }

    toggleSection(sectionName) {
        console.log('Toggling section:', sectionName);
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        if (!section) {
            console.error('Section not found:', sectionName);
            return;
        }
        
        const content = section.querySelector('.section-content');
        const icon = section.querySelector('.toggle-icon');
        
        if (!content || !icon) {
            console.error('Content or icon not found for section:', sectionName);
            return;
        }
        
        this.sectionVisibility[sectionName] = !this.sectionVisibility[sectionName];
        
        if (this.sectionVisibility[sectionName]) {
            content.classList.remove('collapsed');
            icon.textContent = '▼';
        } else {
            content.classList.add('collapsed');
            icon.textContent = '▶';
        }
        
        console.log('Section', sectionName, 'is now', this.sectionVisibility[sectionName] ? 'expanded' : 'collapsed');
    }

    // Include all the remaining methods from MeetingMentorEnhanced
    // (handleSpeechResult, generateSuggestions, etc.)
    // ... [Rest of the methods remain the same as in MeetingMentorEnhanced]

    show() {
        const container = document.getElementById('meeting-mentor-draggable');
        container.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        const container = document.getElementById('meeting-mentor-draggable');
        container.style.display = 'none';
        document.body.style.overflow = '';
        
        if (this.isListening) {
            this.stopMeeting();
        }
    }
    
    showNotification(message, type = 'info') {
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

    // Copy remaining methods from MeetingMentorEnhanced...
    handleSpeechResult(event) {
        const results = event.results;
        const latestResult = results[results.length - 1];
        const transcript = latestResult[0].transcript;
        const isFinal = latestResult.isFinal;

        if (isFinal) {
            this.addTranscriptEntry(transcript);
            this.conversationContext.push(transcript);
            
            if (this.conversationContext.length > 20) {
                this.conversationContext.shift();
            }
            
            this.detectActionItems(transcript);
            
            const now = Date.now();
            if (now - this.lastSuggestionTime > 30000) {
                this.generateSuggestions();
                this.lastSuggestionTime = now;
            }
        }
    }

    addTranscriptEntry(text, speaker = 'Unknown') {
        const timestamp = new Date().toISOString();
        const entry = { text, speaker, timestamp };
        this.transcript.push(entry);
        
        const transcriptDiv = document.getElementById('transcriptDraggable');
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.innerHTML = `
            <strong>${speaker}:</strong> ${text}
            <span class="transcript-time">${new Date(timestamp).toLocaleTimeString()}</span>
        `;
        
        transcriptDiv.appendChild(entryDiv);
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        
        document.getElementById('transcriptLength').textContent = `${this.transcript.length} entries`;
        
        const emptyState = transcriptDiv.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        if (this.currentMeetingId && !this.isGuest()) {
            this.saveTranscriptEntry(entry);
        }
    }

    // Additional methods continue...
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
                    meetingContext: document.getElementById('meetingDescriptionDraggable').value
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
        
        this.addChatMessage(message, 'user');
        input.value = '';
        
        try {
            const context = {
                transcript: this.compactedTranscript || this.transcript,
                meetingTitle: document.getElementById('meetingTitleDraggable').value,
                meetingDescription: document.getElementById('meetingDescriptionDraggable').value,
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
        
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    // Include remaining methods (same as MeetingMentorEnhanced)
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

    updateHistoryDisplay() {
        const listContainer = document.getElementById('meetingHistoryList');
        
        if (!this.meetingHistory.length) {
            listContainer.innerHTML = '<p class="empty-state">No previous meetings found</p>';
            return;
        }
        
        listContainer.innerHTML = this.meetingHistory.map(meeting => `
            <div class="history-item" onclick="meetingMentorDraggable.loadMeeting('${meeting.id}')">
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

    // Continue adding all other methods from MeetingMentorEnhanced...
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
        
        if (this.currentMeetingId && !this.isGuest()) {
            this.saveActionItem(item);
        }
    }

    updateActionItems() {
        const container = document.getElementById('actionItemsDraggable');
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
                    <button onclick="meetingMentorDraggable.removeActionItem(${item.id})" class="remove-btn">×</button>
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
                transcript: this.transcript.slice(-10),
                meetingTitle: document.getElementById('meetingTitleDraggable').value,
                meetingDescription: document.getElementById('meetingDescriptionDraggable').value,
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
        const container = document.getElementById('suggestionsDraggable');
        container.innerHTML = suggestions.map(s => `
            <div class="suggestion-item">
                <div class="suggestion-text">${s.text}</div>
                <button onclick="meetingMentorDraggable.useSuggestion('${s.text}')" class="use-btn">Use</button>
            </div>
        `).join('');
    }

    useSuggestion(text) {
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
            title: document.getElementById('meetingTitleDraggable').value || 'Untitled Meeting',
            description: document.getElementById('meetingDescriptionDraggable').value,
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
            const response = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: document.getElementById('meetingTitleDraggable').value || 'Untitled Meeting',
                    description: document.getElementById('meetingDescriptionDraggable').value
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
        
        const btn = document.getElementById('startMeetingDraggable');
        btn.innerHTML = '<span class="rec-icon recording">⬤</span> Stop Recording';
        btn.classList.add('recording');
        
        document.getElementById('addManualAction').disabled = false;
        document.getElementById('generateSummaryDraggable').disabled = false;
        document.getElementById('exportMeetingDraggable').disabled = false;
        
        this.startTimer();
    }

    stopMeeting() {
        this.isListening = false;
        this.recognition.stop();
        
        const btn = document.getElementById('startMeetingDraggable');
        btn.innerHTML = '<span class="rec-icon">⬤</span> Start Recording';
        btn.classList.remove('recording');
        
        this.updateStatus('Recording stopped', 'stopped');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
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
                    duration: Math.round(duration / 1000)
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
        const statusElement = document.getElementById('meetingStatusDraggable');
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
        const container = document.getElementById('participantsListDraggable');
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
        document.getElementById('profileModalDraggable').style.display = 'block';
    }

    closeProfileModal() {
        document.getElementById('profileModalDraggable').style.display = 'none';
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
        const transcriptDiv = document.getElementById('transcriptDraggable');
        
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
        document.getElementById('meetingTitleDraggable').value = meeting.title || '';
        document.getElementById('meetingDescriptionDraggable').value = meeting.description || '';
        
        if (meeting.transcript) {
            this.transcript = meeting.transcript;
            this.updateTranscriptDisplay();
        }
        
        if (meeting.actionItems) {
            this.actionItems = meeting.actionItems;
            this.updateActionItems();
        }
        
        if (meeting.participants) {
            meeting.participants.forEach(p => this.participants.add(p));
            this.updateParticipantsList();
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.meetingMentorDraggable = new MeetingMentorDraggable();
    });
} else {
    window.meetingMentorDraggable = new MeetingMentorDraggable();
}