// Main application module
class ChatApp {
  constructor() {
    this.messages = [];
    this.currentMessageDiv = null;
    this.selectedModel = utils.storage.get('defaultModel', 'jaahas');
    this.currentSessionId = null;
    this.currentUser = null;
    this.isGuest = false;
    this.guestMessageCount = 0;
    
    // Expose selectedModel globally for other modules
    window.selectedModel = this.selectedModel;
    
    this.init();
  }
  
  async init() {
    try {
      await this.checkAuthentication();
      this.setupEventListeners();
      await this.loadModels();
      this.updateUserInterface();
      
      if (this.isGuest) {
        this.initGuestMode();
      } else {
        await this.initAuthenticatedMode();
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this.handleAuthError();
    }
  }
  
  async checkAuthentication() {
    const userStr = utils.storage.get('user');
    
    if (!userStr) {
      throw new Error('No user data found');
    }
    
    this.currentUser = userStr;
    this.isGuest = this.currentUser.isGuest === true;
    
    if (this.isGuest) {
      this.guestMessageCount = utils.storage.get('guestMessageCount', 0);
      this.currentUser.daily_message_count = this.guestMessageCount;
    } else {
      // Verify session for authenticated users
      try {
        const userData = await utils.apiRequest('/api/auth/user');
        this.currentUser = userData;
        
        // Show admin features if applicable
        if (userData.isAdmin) {
          utils.dom.show('#dashboardLink');
        }
      } catch (error) {
        if (error.status === 401) {
          throw error;
        }
        console.error('Session verification failed:', error);
      }
    }
  }
  
  handleAuthError() {
    utils.storage.remove('user');
    utils.storage.remove('authToken');
    window.location.href = '/login.html';
  }
  
  setupEventListeners() {
    // Message form
    const messageForm = utils.dom.$('#messageForm');
    if (messageForm) {
      messageForm.addEventListener('submit', (e) => this.handleSendMessage(e));
    }
    
    // Model selector
    const modelSelect = utils.dom.$('#modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => this.handleModelChange(e));
    }
    
    // Logout button
    const logoutBtn = utils.dom.$('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    // Enter key handling
    const messageInput = utils.dom.$('#messageInput');
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          messageForm.dispatchEvent(new Event('submit'));
        }
      });
    }
  }
  
  async handleSendMessage(e) {
    e.preventDefault();
    
    const messageInput = utils.dom.$('#messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Check limits for guests
    if (this.isGuest && this.guestMessageCount >= 10) {
      utils.showNotification('Message limit reached. Please sign up for unlimited messages.', 'error');
      return;
    }
    
    // Disable input
    messageInput.disabled = true;
    const sendButton = utils.dom.$('#sendButton');
    if (sendButton) sendButton.disabled = true;
    
    // Add user message to UI
    this.addMessage('user', message);
    messageInput.value = '';
    
    try {
      // Get model parameters
      const modelParams = window.modelParametersModule?.getParameters() || {};
      
      // Prepare request
      const endpoint = this.isGuest ? '/api/guest/chat' : '/api/chat';
      const requestData = {
        message,
        model: this.selectedModel,
        modelParameters: modelParams
      };
      
      if (this.isGuest) {
        requestData.messageCount = this.guestMessageCount;
      } else {
        requestData.sessionId = this.currentSessionId;
      }
      
      // Send request
      const response = await utils.apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      // Add assistant message
      this.addMessage('assistant', response.message);
      
      // Update guest message count
      if (this.isGuest) {
        this.guestMessageCount++;
        utils.storage.set('guestMessageCount', this.guestMessageCount);
        this.updateMessageCounter();
      }
      
      // Update performance metrics if available
      if (window.performanceMetrics && response.tokensUsed) {
        window.performanceMetrics.updateTokens(response.tokensUsed);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      utils.showNotification(error.message || 'Failed to send message', 'error');
      
      // Remove the loading message
      if (this.currentMessageDiv) {
        this.currentMessageDiv.remove();
      }
    } finally {
      messageInput.disabled = false;
      if (sendButton) sendButton.disabled = false;
      messageInput.focus();
    }
  }
  
  addMessage(role, content) {
    const messagesContainer = utils.dom.$('#messages');
    if (!messagesContainer) return;
    
    const messageDiv = utils.dom.create('div', {
      className: `message ${role}-message`
    });
    
    const roleLabel = utils.dom.create('strong', {}, [role === 'user' ? 'You: ' : 'Assistant: ']);
    messageDiv.appendChild(roleLabel);
    
    if (role === 'assistant') {
      this.currentMessageDiv = messageDiv;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Render markdown content
      this.renderAssistantMessage(messageDiv, content);
    } else {
      const contentSpan = utils.dom.create('span', {}, [content]);
      messageDiv.appendChild(contentSpan);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Store message
    this.messages.push({ role, content });
  }
  
  renderAssistantMessage(messageDiv, content) {
    // Use marked.js if available, otherwise plain text
    if (window.marked) {
      const contentHtml = window.marked.parse(content);
      const contentDiv = utils.dom.create('div');
      contentDiv.innerHTML = contentHtml;
      messageDiv.appendChild(contentDiv);
      
      // Highlight code blocks if highlight.js is available
      if (window.hljs) {
        contentDiv.querySelectorAll('pre code').forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
    } else {
      const contentSpan = utils.dom.create('span', {}, [content]);
      messageDiv.appendChild(contentSpan);
    }
  }
  
  async loadModels() {
    try {
      const models = await utils.apiRequest('/api/models');
      const modelSelect = utils.dom.$('#modelSelect');
      
      if (modelSelect && models.length > 0) {
        modelSelect.innerHTML = models.map(model => 
          `<option value="${model.name}" ${model.name === this.selectedModel ? 'selected' : ''}>
            ${model.name}
          </option>`
        ).join('');
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      utils.showNotification('Failed to load models', 'error');
    }
  }
  
  handleModelChange(e) {
    this.selectedModel = e.target.value;
    window.selectedModel = this.selectedModel;
    utils.storage.set('defaultModel', this.selectedModel);
  }
  
  async handleLogout() {
    if (this.isGuest) {
      utils.storage.remove('user');
      utils.storage.remove('isGuest');
      utils.storage.remove('guestMessageCount');
      window.location.href = '/login.html';
      return;
    }
    
    try {
      await utils.apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      utils.storage.remove('user');
      utils.storage.remove('authToken');
      window.location.href = '/login.html';
    }
  }
  
  updateUserInterface() {
    const userInfo = utils.dom.$('#userInfo');
    if (userInfo) {
      userInfo.textContent = this.isGuest ? 'Guest User' : this.currentUser.username;
    }
    
    if (this.isGuest) {
      utils.dom.hide('#newSessionBtn');
      utils.dom.hide('#shareButton');
      this.updateMessageCounter();
    }
  }
  
  updateMessageCounter() {
    const counterDiv = utils.dom.$('#messageCounter');
    if (counterDiv) {
      counterDiv.innerHTML = `Messages: ${this.guestMessageCount}/10`;
      counterDiv.style.color = this.guestMessageCount >= 8 ? '#ff9800' : '#666';
    }
  }
  
  initGuestMode() {
    this.currentSessionId = 'guest-session';
    this.showGuestWelcome();
  }
  
  showGuestWelcome() {
    const messagesContainer = utils.dom.$('#messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="message assistant-message">
          <strong>Assistant:</strong>
          <div>Welcome! You're using the chat as a guest. You can send up to 10 messages. 
          <a href="/login.html">Sign up</a> for unlimited messages and to save your conversations.</div>
        </div>
      `;
    }
  }
  
  async initAuthenticatedMode() {
    // Initialize chat history sidebar
    if (window.chatHistorySidebar) {
      window.chatHistorySidebar.setUser(this.currentUser, false);
    }
    
    // Load initial session
    if (!this.currentSessionId) {
      try {
        const sessions = await utils.apiRequest('/api/sessions');
        if (sessions.length > 0) {
          this.currentSessionId = sessions[0].id;
          if (window.chatHistorySidebar) {
            window.chatHistorySidebar.setCurrentSession(this.currentSessionId);
          }
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApp();
});