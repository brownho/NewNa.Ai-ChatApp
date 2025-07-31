// Chat History and Session Management

class ChatHistory {
    constructor() {
        this.currentSessionId = null;
        this.sessions = this.loadSessions();
        this.initUI();
    }
    
    // Load sessions from localStorage
    loadSessions() {
        const saved = localStorage.getItem('chatSessions');
        return saved ? JSON.parse(saved) : {};
    }
    
    // Save sessions to localStorage
    saveSessions() {
        localStorage.setItem('chatSessions', JSON.stringify(this.sessions));
    }
    
    // Generate session ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Create new session
    createSession(title = null) {
        const id = this.generateId();
        const session = {
            id,
            title: title || `Chat ${new Date().toLocaleString()}`,
            messages: [],
            model: selectedModel,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        this.sessions[id] = session;
        this.currentSessionId = id;
        this.saveSessions();
        this.updateUI();
        
        return session;
    }
    
    // Load session
    loadSession(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return;
        
        this.currentSessionId = sessionId;
        messages = [...session.messages];
        
        // Clear chat and reload messages
        messagesDiv.innerHTML = '';
        messages.forEach(msg => {
            const div = addMessage(msg.role, msg.content);
            setTimeout(() => {
                addMessageActions(div, msg.role, msg.content);
                if (msg.role === 'assistant') {
                    addCopyButtons();
                }
            }, 100);
        });
        
        // Update model selection
        if (session.model && modelSelect.querySelector(`option[value="${session.model}"]`)) {
            modelSelect.value = session.model;
            selectedModel = session.model;
        }
        
        this.updateUI();
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // Save current chat to session
    saveCurrentSession() {
        if (!this.currentSessionId) {
            this.createSession();
        }
        
        const session = this.sessions[this.currentSessionId];
        session.messages = [...messages];
        session.model = selectedModel;
        session.updated = new Date().toISOString();
        
        // Auto-generate title from first message if still default
        if (session.title.startsWith('Chat ') && messages.length > 0) {
            const firstMsg = messages[0].content;
            session.title = firstMsg.substring(0, 50) + (firstMsg.length > 50 ? '...' : '');
        }
        
        this.saveSessions();
        this.updateUI();
    }
    
    // Delete session
    deleteSession(sessionId) {
        if (!confirm('Delete this chat session?')) return;
        
        delete this.sessions[sessionId];
        this.saveSessions();
        
        if (sessionId === this.currentSessionId) {
            this.newChat();
        } else {
            this.updateUI();
        }
    }
    
    // Start new chat
    newChat() {
        messages = [];
        messagesDiv.innerHTML = '';
        this.currentSessionId = null;
        this.updateUI();
    }
    
    // Search sessions
    searchSessions(query) {
        const results = {};
        const searchTerm = query.toLowerCase();
        
        Object.entries(this.sessions).forEach(([id, session]) => {
            const inTitle = session.title.toLowerCase().includes(searchTerm);
            const inMessages = session.messages.some(msg => 
                msg.content.toLowerCase().includes(searchTerm)
            );
            
            if (inTitle || inMessages) {
                results[id] = session;
            }
        });
        
        return results;
    }
    
    // Export session
    exportSession(sessionId, format = 'markdown') {
        const session = this.sessions[sessionId];
        if (!session) return;
        
        let content = '';
        
        if (format === 'markdown') {
            content = `# ${session.title}\n\n`;
            content += `**Model:** ${session.model}\n`;
            content += `**Date:** ${new Date(session.created).toLocaleString()}\n\n`;
            
            session.messages.forEach(msg => {
                content += `## ${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n`;
                content += `${msg.content}\n\n`;
            });
        } else if (format === 'json') {
            content = JSON.stringify(session, null, 2);
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.${format === 'markdown' ? 'md' : 'json'}`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // Initialize UI
    initUI() {
        // Add history sidebar toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'history-toggle';
        toggleBtn.className = 'history-toggle-btn';
        toggleBtn.innerHTML = '📚';
        toggleBtn.title = 'Chat History';
        toggleBtn.onclick = () => this.toggleSidebar();
        document.querySelector('.container').appendChild(toggleBtn);
        
        // Create sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'history-sidebar';
        sidebar.className = 'history-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>Chat History</h3>
                <button class="close-sidebar" onclick="chatHistory.toggleSidebar()">✕</button>
            </div>
            <div class="sidebar-controls">
                <button class="new-chat-btn" onclick="chatHistory.newChat()">➕ New Chat</button>
                <input type="text" id="search-sessions" placeholder="Search chats..." 
                       oninput="chatHistory.handleSearch(this.value)">
            </div>
            <div id="sessions-list" class="sessions-list"></div>
        `;
        document.body.appendChild(sidebar);
        
        // Add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
        
        this.updateUI();
    }
    
    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('history-sidebar');
        sidebar.classList.toggle('open');
    }
    
    // Handle search
    handleSearch(query) {
        const results = query ? this.searchSessions(query) : this.sessions;
        this.displaySessions(results);
    }
    
    // Update UI
    updateUI() {
        this.displaySessions(this.sessions);
    }
    
    // Display sessions in sidebar
    displaySessions(sessions) {
        const listEl = document.getElementById('sessions-list');
        const sortedSessions = Object.values(sessions).sort((a, b) => 
            new Date(b.updated) - new Date(a.updated)
        );
        
        if (sortedSessions.length === 0) {
            listEl.innerHTML = '<div class="no-sessions">No chat history yet</div>';
            return;
        }
        
        listEl.innerHTML = sortedSessions.map(session => {
            const isActive = session.id === this.currentSessionId;
            const date = new Date(session.updated);
            const dateStr = this.formatDate(date);
            
            return `
                <div class="session-item ${isActive ? 'active' : ''}" data-id="${session.id}">
                    <div class="session-info" onclick="chatHistory.loadSession('${session.id}')">
                        <div class="session-title">${this.escapeHtml(session.title)}</div>
                        <div class="session-meta">
                            <span class="session-model">${session.model}</span>
                            <span class="session-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="session-actions">
                        <button class="session-action" onclick="chatHistory.exportSession('${session.id}', 'markdown')" title="Export as Markdown">📄</button>
                        <button class="session-action" onclick="chatHistory.deleteSession('${session.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
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
}

// Initialize chat history
const chatHistory = new ChatHistory();

// Auto-save on new messages
const originalSendMessage2 = window.sendMessage;
window.sendMessage = async function(...args) {
    await originalSendMessage2(...args);
    setTimeout(() => chatHistory.saveCurrentSession(), 1000);
};

// Save on page unload
window.addEventListener('beforeunload', () => {
    if (messages.length > 0) {
        chatHistory.saveCurrentSession();
    }
});