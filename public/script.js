let messages = [];
let currentMessageDiv = null;
let selectedModel = localStorage.getItem('defaultModel') || 'jaahas';
window.selectedModel = selectedModel; // Expose to global scope
let currentSessionId = null;
let currentUser = null;
let isGuest = false;
let guestMessageCount = 0;

// Check authentication on load
window.addEventListener('load', async () => {
    // Detect if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        document.body.classList.add('ios-standalone');
        console.log('Running as installed PWA');
    }
    
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        if (confirm('New version available! Reload to update?')) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            window.location.reload();
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    const guestMode = localStorage.getItem('isGuest');
    
    if (!userStr) {
        window.location.href = '/login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    isGuest = currentUser.isGuest === true;
    
    // Clear guest mode flag if user is not a guest
    if (!isGuest && guestMode === 'true') {
        localStorage.removeItem('isGuest');
    }
    
    // Load guest message count
    if (isGuest) {
        guestMessageCount = parseInt(localStorage.getItem('guestMessageCount') || '0');
        currentUser.daily_message_count = guestMessageCount;
    }
    
    // Verify session is still valid (skip for guests)
    if (!isGuest) {
        try {
            const response = await fetch('/api/auth/user', {
                credentials: 'include' // Include cookies for session authentication
            });
            if (!response.ok) {
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            
            const userData = await response.json();
            currentUser = userData;
            
            // Show dashboard link based on server-side admin flag
            if (userData.isAdmin) {
                document.getElementById('dashboardLink').style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login.html';
            return;
        }
    }
    
    // Update UI with user info
    updateUserInterface();
    
    // Initialize chat history sidebar with user info
    if (window.chatHistorySidebar) {
        window.chatHistorySidebar.setUser(currentUser, isGuest);
    }
    
    // Load sessions (skip for guests)
    if (!isGuest) {
        // Set a default session if needed
        if (!currentSessionId) {
            try {
                const response = await fetch('/api/sessions', {
                    credentials: 'include'
                });
                const sessions = await response.json();
                if (sessions.length > 0) {
                    currentSessionId = sessions[0].id;
                    if (window.chatHistorySidebar) {
                        window.chatHistorySidebar.setCurrentSession(currentSessionId);
                    }
                }
            } catch (error) {
                console.error('Failed to load initial session:', error);
            }
        }
    } else {
        // For guests, create a temporary session
        currentSessionId = 'guest-session';
        showGuestWelcome();
    }
    
    // Load models
    await loadModels();
});

// Show guest welcome message
function showGuestWelcome() {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'guest-welcome';
    welcomeMessage.innerHTML = `
        <h3>Welcome, Guest!</h3>
        <p>You have ${10 - guestMessageCount} messages remaining. <a href="/login.html">Sign up</a> for 50 daily messages and chat history.</p>
    `;
    messagesDiv.appendChild(welcomeMessage);
}

// Update user interface with user info
function updateUserInterface() {
    // Add user info to header
    const header = document.querySelector('header');
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    const messageLimit = isGuest ? 10 : 50;
    const messageCount = isGuest ? guestMessageCount : currentUser.daily_message_count;
    
    userInfo.innerHTML = `
        <span class="username">${currentUser.username}${isGuest ? ' (Guest)' : ''}</span>
        <span class="message-count">${messageCount}/${messageLimit} today</span>
        ${isGuest ? '<a href="/login.html" class="signup-link">Sign Up</a>' : ''}
        <button id="logoutButton" class="logout-button">${isGuest ? 'Exit' : 'Logout'}</button>
    `;
    
    // Insert before model info
    const modelInfo = document.querySelector('.model-info');
    header.insertBefore(userInfo, modelInfo);
    
    // Add logout functionality
    document.getElementById('logoutButton').addEventListener('click', logout);
}

// Configure marked options
marked.setOptions({
    highlight: function(code, lang) {
        if (Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    },
    breaks: true,
    gfm: true
});

// DOM elements
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusSpan = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');
const setDefaultButton = document.getElementById('setDefaultButton');
const gpuTempSpan = document.getElementById('gpu-temp');
const gpuMemorySpan = document.getElementById('gpu-memory');

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Model selection
modelSelect.addEventListener('change', (e) => {
    selectedModel = e.target.value;
    window.selectedModel = selectedModel; // Update global reference
    localStorage.setItem('selectedModel', selectedModel);
});

// Set default model button
setDefaultButton.addEventListener('click', () => {
    if (selectedModel) {
        localStorage.setItem('defaultModel', selectedModel);
        setDefaultButton.classList.add('success');
        setDefaultButton.textContent = 'Default Set!';
        
        setTimeout(() => {
            setDefaultButton.classList.remove('success');
            setDefaultButton.textContent = 'Set Default';
        }, 2000);
        
        setStatus('success', `Default model set to: ${selectedModel}`);
        setTimeout(() => {
            setStatus('ready', 'Ready');
        }, 3000);
    }
});

// Load user's chat sessions - DEPRECATED - Using sidebar instead
/*
async function loadSessions() {
    try {
        const response = await fetch('/api/sessions', {
            credentials: 'include' // Include cookies for session authentication
        });
        const sessions = await response.json();
        
        // Add session selector to UI
        const sessionContainer = document.createElement('div');
        sessionContainer.className = 'session-container';
        sessionContainer.innerHTML = `
            <select id="sessionSelect" class="session-select">
                <option value="">Select a session...</option>
            </select>
            <button id="newSessionButton" class="new-session-button">New Session</button>
        `;
        
        // Insert after header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(sessionContainer, header.nextSibling);
        
        const sessionSelect = document.getElementById('sessionSelect');
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${session.session_name} (${session.message_count} messages)`;
            sessionSelect.appendChild(option);
        });
        
        // Load first session if available
        if (sessions.length > 0) {
            currentSessionId = sessions[0].id;
            sessionSelect.value = currentSessionId;
            await loadSessionMessages(currentSessionId);
        }
        
        // Session change handler
        sessionSelect.addEventListener('change', async (e) => {
            currentSessionId = e.target.value;
            if (currentSessionId) {
                await loadSessionMessages(currentSessionId);
            }
        });
        
        // New session button
        document.getElementById('newSessionButton').addEventListener('click', createNewSession);
        
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

// Load messages for a session
async function loadSessionMessages(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`);
        const sessionMessages = await response.json();
        
        // Clear current messages
        messagesDiv.innerHTML = '';
        messages = [];
        
        // Display messages
        sessionMessages.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
            addMessageToUI(msg.content, msg.role);
        });
        
    } catch (error) {
        console.error('Failed to load session messages:', error);
    }
}

// Create new session
async function createNewSession() {
    const sessionName = prompt('Enter session name:');
    if (!sessionName) return;
    
    try {
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_name: sessionName })
        });
        
        const newSession = await response.json();
        currentSessionId = newSession.id;
        
        // Reload sessions
        await loadSessions();
        
        // Clear messages
        messagesDiv.innerHTML = '';
        messages = [];
        
    } catch (error) {
        console.error('Failed to create session:', error);
    }
}
*/

// Logout function
async function logout() {
    if (!isGuest) {
        try {
            await fetch('/api/auth/logout', { 
                method: 'POST',
                credentials: 'include' // Include cookies for session authentication
            });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestMessageCount');
    window.location.href = '/login.html';
}

// Header show/hide on scroll
let lastScrollTop = 0;
const header = document.querySelector('header');
const scrollToTopBtn = document.getElementById('scrollToTop');

messagesDiv.addEventListener('scroll', () => {
    const scrollTop = messagesDiv.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    
    if (scrollTop > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
    
    lastScrollTop = scrollTop;
});

// Scroll to top functionality
scrollToTopBtn.addEventListener('click', () => {
    messagesDiv.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Send message function
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !selectedModel) return;
    
    // Check guest message limit
    if (isGuest && guestMessageCount >= 10) {
        setStatus('error', 'Guest limit reached! Please sign up for more messages.');
        alert('You have reached the 10 message limit for guests. Please sign up for 50 daily messages and chat history!');
        return;
    }
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    messages.push({ role: 'user', content: message });
    
    // Show loading status
    setStatus('loading', 'Thinking...');
    sendButton.disabled = true;
    
    // Create assistant message div for streaming
    currentMessageDiv = addMessageToUI('', 'assistant');
    currentMessageDiv.classList.add('streaming');
    
    try {
        const endpoint = isGuest ? '/api/guest/chat' : '/api/chat';
        const body = {
            model: selectedModel,
            messages: messages
        };
        
        if (!isGuest) {
            body.sessionId = currentSessionId;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 429) {
                throw new Error(`Daily limit reached! ${error.limit} messages per day. Resets at ${error.resetTime}`);
            }
            throw new Error(error.error || 'Failed to get response');
        }
        
        const data = await response.json();
        
        // Update the message content
        currentMessageDiv.classList.remove('streaming');
        const content = data.message.content;
        currentMessageDiv.innerHTML = marked.parse(content);
        messages.push({ role: 'assistant', content: content });
        
        // Update message count
        if (isGuest) {
            guestMessageCount++;
            localStorage.setItem('guestMessageCount', guestMessageCount.toString());
            document.querySelector('.message-count').textContent = `${guestMessageCount}/10 today`;
            
            // Show warning if near limit
            if (guestMessageCount >= 8) {
                setStatus('warning', `Only ${10 - guestMessageCount} messages left!`);
            }
        } else {
            currentUser.daily_message_count++;
            document.querySelector('.message-count').textContent = `${currentUser.daily_message_count}/50 today`;
            
            // Reload sessions in sidebar to update message count
            if (window.chatHistorySidebar) {
                window.chatHistorySidebar.loadSessions();
            }
        }
        
        // Highlight code blocks
        currentMessageDiv.querySelectorAll('pre code').forEach((block) => {
            addCodeControls(block);
            Prism.highlightElement(block);
        });
        
        if (!isGuest || guestMessageCount < 8) {
            setStatus('ready', 'Ready');
        }
        
    } catch (error) {
        console.error('Error:', error);
        currentMessageDiv.classList.remove('streaming');
        currentMessageDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        setStatus('error', error.message);
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
        scrollToBottom();
    }
}

// Add message to UI
function addMessageToUI(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    if (role === 'user') {
        messageDiv.textContent = content;
    } else {
        messageDiv.innerHTML = marked.parse(content);
        
        // Highlight code blocks
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            addCodeControls(block);
            Prism.highlightElement(block);
        });
    }
    
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

// Add code controls (copy and execute buttons)
function addCodeControls(codeBlock) {
    const pre = codeBlock.parentElement;
    const container = document.createElement('div');
    container.className = 'code-block-container';
    
    pre.parentNode.insertBefore(container, pre);
    container.appendChild(pre);
    
    // Copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.textContent);
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');
        setTimeout(() => {
            copyButton.textContent = 'Copy';
            copyButton.classList.remove('copied');
        }, 2000);
    });
    container.appendChild(copyButton);
    
    // Execute button for supported languages (not for guests)
    if (!isGuest) {
        const language = codeBlock.className.match(/language-(\w+)/)?.[1];
        if (['javascript', 'python', 'bash'].includes(language)) {
            const executeButton = document.createElement('button');
            executeButton.className = 'execute-button';
            executeButton.textContent = 'Run';
            executeButton.addEventListener('click', () => executeCode(codeBlock.textContent, language));
            container.appendChild(executeButton);
        }
    }
}

// Execute code
async function executeCode(code, language) {
    try {
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language })
        });
        
        const result = await response.json();
        
        // Display result
        const outputDiv = document.createElement('div');
        outputDiv.className = 'code-output';
        outputDiv.innerHTML = `
            <div class="output-header">Output:</div>
            <pre>${result.error ? `<span class="error">${result.error}</span>` : result.output || '<em>No output</em>'}</pre>
        `;
        
        // Insert after the code block
        const codeContainer = event.target.parentElement;
        codeContainer.appendChild(outputDiv);
        
    } catch (error) {
        console.error('Execution error:', error);
        alert('Failed to execute code: ' + error.message);
    }
}

// Set status
function setStatus(type, message) {
    statusSpan.textContent = message;
    statusSpan.className = `status ${type}`;
}

// Scroll to bottom
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Load available models
async function loadModels() {
    try {
        const response = await fetch('/api/models');
        const data = await response.json();
        
        modelSelect.innerHTML = '';
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = `${model.name} (${formatSize(model.size)})`;
            modelSelect.appendChild(option);
        });
        
        // Set selected model
        if (localStorage.getItem('selectedModel')) {
            modelSelect.value = localStorage.getItem('selectedModel');
            selectedModel = localStorage.getItem('selectedModel');
        } else if (localStorage.getItem('defaultModel')) {
            modelSelect.value = localStorage.getItem('defaultModel');
            selectedModel = localStorage.getItem('defaultModel');
        } else if (data.models.length > 0) {
            selectedModel = data.models[0].name;
            modelSelect.value = selectedModel;
        }
        window.selectedModel = selectedModel; // Update global reference
        
    } catch (error) {
        console.error('Failed to load models:', error);
        setStatus('error', 'Failed to load models');
    }
}

// Format file size
function formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Update GPU stats
async function updateGPUStats() {
    try {
        const response = await fetch('/api/gpu-stats');
        const stats = await response.json();
        
        if (stats.temperature !== null) {
            gpuTempSpan.textContent = `${stats.temperature}°C`;
            gpuMemorySpan.textContent = `${(stats.memoryUsed / 1024).toFixed(1)}/${(stats.memoryTotal / 1024).toFixed(1)}GB`;
        } else {
            gpuTempSpan.textContent = '--°C';
            gpuMemorySpan.textContent = '--GB';
        }
    } catch (error) {
        console.error('Failed to fetch GPU stats:', error);
    }
}

// Update GPU stats every 5 seconds
setInterval(updateGPUStats, 5000);
updateGPUStats();