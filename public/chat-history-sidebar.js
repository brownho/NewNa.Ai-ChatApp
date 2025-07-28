// Chat History Sidebar - Server-side Sessions Integration

class ChatHistorySidebar {
    constructor() {
        this.sessions = [];
        this.currentSessionId = null;
        this.isGuest = false;
        this.initUI();
    }
    
    // Initialize UI
    initUI() {
        // Check if elements already exist
        if (document.getElementById('history-toggle')) return;
        
        // Add history sidebar toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'history-toggle';
        toggleBtn.className = 'history-toggle-btn';
        toggleBtn.innerHTML = '📚';
        toggleBtn.title = 'Chat History (Ctrl+H)';
        toggleBtn.onclick = () => this.toggleSidebar();
        document.body.appendChild(toggleBtn);
        
        // Create sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'history-sidebar';
        sidebar.className = 'history-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>Chat History</h3>
                <button class="close-sidebar" onclick="chatHistorySidebar.toggleSidebar()">✕</button>
            </div>
            <div class="sidebar-controls">
                <button class="new-chat-btn" onclick="chatHistorySidebar.createNewSession()">➕ New Chat</button>
                <input type="text" id="search-sessions" placeholder="Search chats..." 
                       oninput="chatHistorySidebar.handleSearch(this.value)">
            </div>
            <div id="sessions-list" class="sessions-list">
                <div class="no-sessions">Loading sessions...</div>
            </div>
        `;
        document.body.appendChild(sidebar);
        
        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }
    
    // Set current user and guest status
    setUser(user, isGuest) {
        this.isGuest = isGuest;
        if (!isGuest) {
            this.loadSessions();
        } else {
            this.displayGuestMessage();
        }
    }
    
    // Load sessions from server
    async loadSessions() {
        try {
            const response = await fetch('/api/sessions', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load sessions');
            }
            
            this.sessions = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.displayError('Failed to load sessions');
        }
    }
    
    // Create new session
    async createNewSession() {
        if (this.isGuest) {
            alert('Please sign up to save chat history');
            return;
        }
        
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ session_name: 'New Chat' })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create session');
            }
            
            const newSession = await response.json();
            
            // Clear current chat
            if (window.messagesDiv) {
                window.messagesDiv.innerHTML = '';
                window.messages = [];
            }
            
            // Set as current session
            this.currentSessionId = newSession.id;
            if (window.currentSessionId !== undefined) {
                window.currentSessionId = newSession.id;
            }
            
            // Reload sessions
            await this.loadSessions();
            
            // Close sidebar
            this.toggleSidebar();
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Failed to create new session');
        }
    }
    
    // Load a specific session
    async loadSession(sessionId) {
        if (this.isGuest) return;
        
        try {
            const response = await fetch(`/api/sessions/${sessionId}/messages`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load session messages');
            }
            
            const messages = await response.json();
            
            // Clear current chat
            if (window.messagesDiv) {
                window.messagesDiv.innerHTML = '';
                window.messages = [];
            }
            
            // Set current session
            this.currentSessionId = sessionId;
            if (window.currentSessionId !== undefined) {
                window.currentSessionId = sessionId;
            }
            
            // Load messages
            if (window.messages !== undefined) {
                window.messages = messages;
            }
            
            // Render messages
            messages.forEach(msg => {
                if (window.addMessage) {
                    const div = window.addMessage(msg.sender === 'user' ? 'user' : 'assistant', msg.content);
                    if (msg.sender === 'assistant' && window.addCopyButtons) {
                        setTimeout(() => window.addCopyButtons(), 100);
                    }
                }
            });
            
            // Update UI
            this.updateUI();
            
            // Scroll to bottom
            if (window.messagesDiv) {
                window.messagesDiv.scrollTop = window.messagesDiv.scrollHeight;
            }
            
            // Close sidebar
            this.toggleSidebar();
        } catch (error) {
            console.error('Error loading session:', error);
            alert('Failed to load session');
        }
    }
    
    // Delete session
    async deleteSession(sessionId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        if (!confirm('Delete this chat session?')) return;
        
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete session');
            }
            
            // If deleting current session, clear chat
            if (sessionId === this.currentSessionId) {
                if (window.messagesDiv) {
                    window.messagesDiv.innerHTML = '';
                    window.messages = [];
                }
                this.currentSessionId = null;
                if (window.currentSessionId !== undefined) {
                    window.currentSessionId = null;
                }
            }
            
            // Reload sessions
            await this.loadSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Failed to delete session');
        }
    }
    
    // Rename session
    async renameSession(sessionId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        const newName = prompt('Enter new name:', session.session_name);
        if (!newName || newName === session.session_name) return;
        
        try {
            const response = await fetch(`/api/sessions/${sessionId}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ session_name: newName })
            });
            
            if (!response.ok) {
                throw new Error('Failed to rename session');
            }
            
            // Reload sessions
            await this.loadSessions();
        } catch (error) {
            console.error('Error renaming session:', error);
            alert('Failed to rename session');
        }
    }
    
    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('history-sidebar');
        const toggleBtn = document.getElementById('history-toggle');
        
        sidebar.classList.toggle('open');
        
        // Move toggle button with sidebar
        if (sidebar.classList.contains('open')) {
            toggleBtn.classList.add('sidebar-open');
        } else {
            toggleBtn.classList.remove('sidebar-open');
        }
    }
    
    // Handle search
    handleSearch(query) {
        const filteredSessions = query 
            ? this.sessions.filter(session => 
                session.session_name.toLowerCase().includes(query.toLowerCase()))
            : this.sessions;
        this.displaySessions(filteredSessions);
    }
    
    // Update UI
    updateUI() {
        this.displaySessions(this.sessions);
    }
    
    // Display sessions in sidebar
    displaySessions(sessions) {
        const listEl = document.getElementById('sessions-list');
        
        if (!sessions || sessions.length === 0) {
            listEl.innerHTML = '<div class="no-sessions">No chat history yet</div>';
            return;
        }
        
        // Sort by updated_at
        const sortedSessions = [...sessions].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );
        
        listEl.innerHTML = sortedSessions.map(session => {
            const isActive = session.id === this.currentSessionId;
            const date = new Date(session.updated_at);
            const dateStr = this.formatDate(date);
            const messageCount = session.message_count || 0;
            
            return `
                <div class="session-item ${isActive ? 'active' : ''}" data-id="${session.id}">
                    <div class="session-info" onclick="chatHistorySidebar.loadSession(${session.id})">
                        <div class="session-title">${this.escapeHtml(session.session_name)}</div>
                        <div class="session-meta">
                            <span class="session-messages">${messageCount} messages</span>
                            <span class="session-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="session-actions">
                        <button class="session-action" onclick="chatHistorySidebar.renameSession(${session.id}, event)" title="Rename">✏️</button>
                        <button class="session-action" onclick="chatHistorySidebar.deleteSession(${session.id}, event)" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Display guest message
    displayGuestMessage() {
        const listEl = document.getElementById('sessions-list');
        listEl.innerHTML = `
            <div class="no-sessions">
                <p>Chat history is not available for guests.</p>
                <p><a href="/login.html" style="color: #4CAF50;">Sign up</a> to save your conversations!</p>
            </div>
        `;
    }
    
    // Display error message
    displayError(message) {
        const listEl = document.getElementById('sessions-list');
        listEl.innerHTML = `<div class="no-sessions error">${message}</div>`;
    }
    
    // Format date
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const mins = Math.floor(diff / (1000 * 60));
                return mins <= 1 ? 'Just now' : `${mins}m ago`;
            }
            return hours === 1 ? '1h ago' : `${hours}h ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Set current session ID (called from main app)
    setCurrentSession(sessionId) {
        this.currentSessionId = sessionId;
        this.updateUI();
    }
}

// Initialize chat history sidebar
const chatHistorySidebar = new ChatHistorySidebar();

// Export for use in other scripts
window.chatHistorySidebar = chatHistorySidebar;