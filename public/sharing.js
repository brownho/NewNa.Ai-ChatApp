// Sharing and Collaboration Features for BrownFi Local LLMs

class SharingManager {
    constructor() {
        this.ws = null;
        this.collaborationRoom = null;
        this.isCollaborating = false;
        this.initUI();
    }
    
    initUI() {
        // Add share button to header
        const headerActions = document.createElement('div');
        headerActions.className = 'header-actions';
        headerActions.innerHTML = `
            <button id="share-btn" class="header-btn" onclick="sharingManager.showShareDialog()" title="Share Chat">
                🔗
            </button>
            <button id="collab-btn" class="header-btn" onclick="sharingManager.toggleCollaboration()" title="Collaborate">
                👥
            </button>
        `;
        
        const header = document.querySelector('header');
        header.insertBefore(headerActions, header.querySelector('.model-info'));
        
        // Create share dialog
        const shareDialog = document.createElement('div');
        shareDialog.className = 'share-dialog';
        shareDialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>Share Chat</h3>
                    <button class="close-dialog" onclick="sharingManager.closeShareDialog()">✕</button>
                </div>
                
                <div class="share-options">
                    <div class="share-option">
                        <h4>📋 Export Chat</h4>
                        <div class="export-buttons">
                            <button onclick="sharingManager.exportChat('markdown')">Markdown</button>
                            <button onclick="sharingManager.exportChat('json')">JSON</button>
                            <button onclick="sharingManager.exportChat('pdf')">PDF</button>
                            <button onclick="sharingManager.copyChat()">Copy All</button>
                        </div>
                    </div>
                    
                    <div class="share-option">
                        <h4>🔗 Create Share Link</h4>
                        <div class="share-settings">
                            <label>
                                Title:
                                <input type="text" id="share-title" placeholder="My Chat Session">
                            </label>
                            <label>
                                Expires in:
                                <select id="share-expires">
                                    <option value="3600000">1 hour</option>
                                    <option value="86400000">24 hours</option>
                                    <option value="604800000">7 days</option>
                                    <option value="0">Never</option>
                                </select>
                            </label>
                        </div>
                        <button class="create-share-btn" onclick="sharingManager.createShareLink()">
                            Generate Link
                        </button>
                        <div id="share-result" class="share-result" style="display: none;">
                            <input type="text" id="share-url" readonly>
                            <button onclick="sharingManager.copyShareLink()">Copy</button>
                        </div>
                    </div>
                    
                    <div class="share-option">
                        <h4>👥 Real-time Collaboration</h4>
                        <p class="share-description">
                            Share this room code with others to collaborate in real-time
                        </p>
                        <div class="collab-code">
                            <span id="collab-room-code">----</span>
                            <button onclick="sharingManager.generateRoomCode()">New Room</button>
                        </div>
                        <div class="collab-join">
                            <input type="text" id="join-room-input" placeholder="Enter room code">
                            <button onclick="sharingManager.joinRoom()">Join Room</button>
                        </div>
                        <div id="collab-status" class="collab-status"></div>
                    </div>
                </div>
            </div>
        `;
        shareDialog.style.display = 'none';
        document.body.appendChild(shareDialog);
        this.shareDialog = shareDialog;
        
        // Add collaboration indicator
        const collabIndicator = document.createElement('div');
        collabIndicator.className = 'collab-indicator';
        collabIndicator.style.display = 'none';
        document.body.appendChild(collabIndicator);
        this.collabIndicator = collabIndicator;
    }
    
    showShareDialog() {
        this.shareDialog.style.display = 'flex';
        
        // Set default title
        const titleInput = document.getElementById('share-title');
        if (messages.length > 0) {
            titleInput.value = messages[0].content.substring(0, 50) + '...';
        }
    }
    
    closeShareDialog() {
        this.shareDialog.style.display = 'none';
    }
    
    async exportChat(format) {
        let content = '';
        const title = chatHistory.sessions[chatHistory.currentSessionId]?.title || 'Chat Export';
        
        switch (format) {
            case 'markdown':
                content = `# ${title}\n\n`;
                content += `**Date:** ${new Date().toLocaleString()}\n\n`;
                messages.forEach(msg => {
                    content += `## ${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n`;
                    content += `${msg.content}\n\n`;
                });
                this.downloadFile(content, 'chat-export.md', 'text/markdown');
                break;
                
            case 'json':
                content = JSON.stringify({
                    title: title,
                    date: new Date().toISOString(),
                    messages: messages,
                    model: selectedModel
                }, null, 2);
                this.downloadFile(content, 'chat-export.json', 'application/json');
                break;
                
            case 'pdf':
                // Simple HTML to PDF approach
                const pdfWindow = window.open('', '_blank');
                pdfWindow.document.write(`
                    <html>
                    <head>
                        <title>${title}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            .message { margin-bottom: 20px; }
                            .user { background: #f0f0f0; padding: 10px; border-radius: 5px; }
                            .assistant { background: #e0f0ff; padding: 10px; border-radius: 5px; }
                            pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
                        </style>
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <p>Date: ${new Date().toLocaleString()}</p>
                        ${messages.map(msg => `
                            <div class="message ${msg.role}">
                                <strong>${msg.role === 'user' ? 'User' : 'Assistant'}:</strong><br>
                                ${msg.content.replace(/\n/g, '<br>')}
                            </div>
                        `).join('')}
                    </body>
                    </html>
                `);
                pdfWindow.document.close();
                pdfWindow.print();
                break;
        }
    }
    
    copyChat() {
        let text = '';
        messages.forEach(msg => {
            text += `${msg.role === 'user' ? 'User' : 'Assistant'}:\n${msg.content}\n\n`;
        });
        navigator.clipboard.writeText(text);
        alert('Chat copied to clipboard!');
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async createShareLink() {
        const title = document.getElementById('share-title').value || 'Shared Chat';
        const expiresIn = parseInt(document.getElementById('share-expires').value);
        
        try {
            const response = await fetch('/api/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    title: title,
                    expiresIn: expiresIn || null
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create share link');
            }
            
            const data = await response.json();
            
            // Show result
            document.getElementById('share-url').value = data.shareUrl;
            document.getElementById('share-result').style.display = 'flex';
            
        } catch (error) {
            console.error('Share error:', error);
            alert('Failed to create share link');
        }
    }
    
    copyShareLink() {
        const urlInput = document.getElementById('share-url');
        urlInput.select();
        navigator.clipboard.writeText(urlInput.value);
        alert('Share link copied to clipboard!');
    }
    
    generateRoomCode() {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('collab-room-code').textContent = code;
        this.startCollaboration(code);
    }
    
    joinRoom() {
        const code = document.getElementById('join-room-input').value.trim().toUpperCase();
        if (code) {
            this.startCollaboration(code);
        }
    }
    
    startCollaboration(roomCode) {
        if (this.ws) {
            this.ws.close();
        }
        
        this.collaborationRoom = roomCode;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
        
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({
                type: 'join',
                room: roomCode
            }));
            
            this.isCollaborating = true;
            document.getElementById('collab-btn').classList.add('active');
            this.updateCollabStatus('Connected to room: ' + roomCode);
            this.showCollabIndicator();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'participants':
                    this.updateCollabStatus(`Connected: ${data.count} participant(s)`);
                    break;
                    
                case 'message':
                    // Add message from collaborator
                    addMessage(data.role, data.message);
                    messages.push({ role: data.role, content: data.message });
                    if (data.role === 'assistant') {
                        setTimeout(() => {
                            addCopyButtons();
                        }, 100);
                    }
                    break;
                    
                case 'typing':
                    this.showTypingIndicator(data.user);
                    break;
            }
        };
        
        this.ws.onclose = () => {
            this.isCollaborating = false;
            document.getElementById('collab-btn').classList.remove('active');
            this.updateCollabStatus('Disconnected');
            this.hideCollabIndicator();
        };
        
        // Override sendMessage to broadcast
        this.overrideSendMessage();
    }
    
    overrideSendMessage() {
        const originalSend = window.sendMessage;
        window.sendMessage = async (...args) => {
            await originalSend(...args);
            
            // Broadcast to collaborators
            if (this.isCollaborating && this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Get the last user and assistant messages
                const lastUserMsg = messages[messages.length - 2];
                const lastAssistantMsg = messages[messages.length - 1];
                
                if (lastUserMsg) {
                    this.ws.send(JSON.stringify({
                        type: 'message',
                        role: 'user',
                        message: lastUserMsg.content
                    }));
                }
                
                if (lastAssistantMsg) {
                    this.ws.send(JSON.stringify({
                        type: 'message',
                        role: 'assistant',
                        message: lastAssistantMsg.content
                    }));
                }
            }
        };
    }
    
    toggleCollaboration() {
        if (this.isCollaborating) {
            this.ws.close();
        } else {
            this.showShareDialog();
        }
    }
    
    updateCollabStatus(status) {
        document.getElementById('collab-status').textContent = status;
    }
    
    showCollabIndicator() {
        this.collabIndicator.innerHTML = `
            <span class="collab-room">Room: ${this.collaborationRoom}</span>
            <span class="collab-participants" id="collab-participants">1 participant</span>
        `;
        this.collabIndicator.style.display = 'flex';
    }
    
    hideCollabIndicator() {
        this.collabIndicator.style.display = 'none';
    }
    
    showTypingIndicator(user) {
        // Show typing indicator for 3 seconds
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.textContent = `${user} is typing...`;
        messagesDiv.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 3000);
    }
}

// Initialize sharing manager
const sharingManager = new SharingManager();

// Add CSS
const sharingStyles = document.createElement('style');
sharingStyles.textContent = `
/* Header Actions */
.header-actions {
    display: flex;
    gap: 0.5rem;
    margin-right: auto;
    padding-left: 1rem;
}

.header-btn {
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
}

.header-btn:hover {
    background: #30363d;
    border-color: #58a6ff;
}

.header-btn.active {
    background: #238636;
    color: white;
}

/* Share Dialog */
.share-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.dialog-content {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 0.5rem;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
}

.dialog-header {
    background: #161b22;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #30363d;
}

.dialog-header h3 {
    margin: 0;
}

.close-dialog {
    background: none;
    border: none;
    color: #8b949e;
    font-size: 1.5rem;
    cursor: pointer;
}

.close-dialog:hover {
    color: #c9d1d9;
}

.share-options {
    padding: 1.5rem;
}

.share-option {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #30363d;
}

.share-option:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.share-option h4 {
    margin: 0 0 1rem 0;
    color: #c9d1d9;
}

.share-description {
    color: #8b949e;
    font-size: 0.875rem;
    margin: 0.5rem 0 1rem 0;
}

.export-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
}

.export-buttons button,
.create-share-btn {
    padding: 0.5rem;
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 0.375rem;
    cursor: pointer;
}

.export-buttons button:hover,
.create-share-btn:hover {
    background: #30363d;
    border-color: #58a6ff;
}

.share-settings {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
}

.share-settings label {
    display: grid;
    gap: 0.5rem;
    color: #c9d1d9;
    font-size: 0.875rem;
}

.share-settings input,
.share-settings select {
    background: #161b22;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 0.5rem;
    border-radius: 0.375rem;
}

.create-share-btn {
    width: 100%;
    background: #238636;
    color: white;
}

.create-share-btn:hover {
    background: #2ea043;
}

.share-result {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.share-result input {
    flex: 1;
    background: #161b22;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 0.5rem;
    border-radius: 0.375rem;
}

.collab-code {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #161b22;
    border-radius: 0.375rem;
}

.collab-code span {
    font-size: 1.5rem;
    font-family: monospace;
    color: #58a6ff;
}

.collab-join {
    display: flex;
    gap: 0.5rem;
}

.collab-join input {
    flex: 1;
    background: #161b22;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 0.5rem;
    border-radius: 0.375rem;
}

.collab-status {
    margin-top: 1rem;
    color: #8b949e;
    font-size: 0.875rem;
}

/* Collaboration Indicator */
.collab-indicator {
    position: fixed;
    top: 4rem;
    left: 50%;
    transform: translateX(-50%);
    background: #238636;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 100;
}

.typing-indicator {
    color: #8b949e;
    font-style: italic;
    padding: 0.5rem 1rem;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@media (max-width: 768px) {
    .export-buttons {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .header-actions {
        padding-left: 0.5rem;
    }
}
`;
document.head.appendChild(sharingStyles);