let messages = [];
let currentMessageDiv = null;
let selectedModel = localStorage.getItem('defaultModel') || 'jaahas';

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
    localStorage.setItem('selectedModel', selectedModel);
});

// Set default model button
setDefaultButton.addEventListener('click', () => {
    if (selectedModel) {
        localStorage.setItem('defaultModel', selectedModel);
        setDefaultButton.classList.add('success');
        setDefaultButton.textContent = 'Default Set!';
        
        // Reset button after 2 seconds
        setTimeout(() => {
            setDefaultButton.classList.remove('success');
            setDefaultButton.textContent = 'Set Default';
        }, 2000);
        
        // Show status message
        setStatus('success', `Default model set to: ${selectedModel}`);
        setTimeout(() => {
            setStatus('ready', 'Ready');
        }, 3000);
    }
});

// Header show/hide on scroll
let lastScrollTop = 0;
const header = document.querySelector('header');
const scrollToTopBtn = document.getElementById('scrollToTop');

messagesDiv.addEventListener('scroll', () => {
    const scrollTop = messagesDiv.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down - hide header
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up - show header
        header.style.transform = 'translateY(0)';
    }
    
    // Show/hide scroll to top button
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

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage('user', message);
    messages.push({ role: 'user', content: message });

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Disable input while processing
    messageInput.disabled = true;
    sendButton.disabled = true;
    setStatus('loading', 'Thinking...');

    // Create assistant message div
    currentMessageDiv = addMessage('assistant', '', true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages, model: selectedModel })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        currentMessageDiv.classList.remove('streaming');
                        messages.push({ role: 'assistant', content: assistantMessage });
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            assistantMessage += parsed.content;
                            updateStreamingMessage(assistantMessage);
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                }
            }
        }

        setStatus('ready', 'Ready');
    } catch (error) {
        console.error('Error:', error);
        currentMessageDiv.innerHTML = '<em>Error: Failed to get response from Ollama. Make sure Ollama is running with the selected model.</em>';
        currentMessageDiv.classList.remove('streaming');
        setStatus('error', 'Error');
    } finally {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
        currentMessageDiv = null;
    }
}

function addMessage(role, content, streaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}${streaming ? ' streaming' : ''}`;
    
    if (role === 'user') {
        messageDiv.textContent = content;
    } else {
        messageDiv.innerHTML = marked.parse(content || '');
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    return messageDiv;
}

function updateStreamingMessage(content) {
    if (currentMessageDiv) {
        currentMessageDiv.innerHTML = marked.parse(content);
        // Re-highlight code blocks
        currentMessageDiv.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function setStatus(type, text) {
    statusSpan.textContent = text;
    statusSpan.className = `status ${type}`;
}

// Load available models
async function loadModels() {
    try {
        const response = await fetch('/api/models');
        if (response.ok) {
            const data = await response.json();
            modelSelect.innerHTML = '';
            
            if (data.length === 0) {
                modelSelect.innerHTML = '<option value="">No models found</option>';
                setStatus('error', 'No models');
                return;
            }
            
            // Get saved model or use stored default model
            const savedModel = localStorage.getItem('selectedModel');
            const defaultModel = localStorage.getItem('defaultModel') || 'jaahas';
            let modelFound = false;
            let defaultModelFound = false;
            let defaultModelIndex = -1;
            
            data.forEach((model, index) => {
                const option = document.createElement('option');
                option.value = model.name;
                // Rename models to show as uncensored where appropriate
                if (model.name.includes('dolphin-mixtral')) {
                    option.textContent = model.name.replace('dolphin-mixtral', 'dolphin-mixtral-uncensored');
                } else {
                    option.textContent = model.name;
                }
                
                // Check if this is the saved model
                if (model.name === savedModel) {
                    option.selected = true;
                    selectedModel = model.name;
                    modelFound = true;
                }
                
                // Check if this is the stored default model
                if (model.name === defaultModel || 
                    (defaultModel === 'jaahas' && model.name.toLowerCase().startsWith('jaahas'))) {
                    defaultModelFound = true;
                    defaultModelIndex = index;
                }
                
                modelSelect.appendChild(option);
            });
            
            // If saved model not found, try to select default model
            if (!modelFound && data.length > 0) {
                if (savedModel === null && defaultModelFound) {
                    // No saved selection, use default model
                    modelSelect.selectedIndex = defaultModelIndex;
                    selectedModel = data[defaultModelIndex].name;
                } else if (!savedModel) {
                    // No saved model and no default found, use first model
                    modelSelect.selectedIndex = 0;
                    selectedModel = data[0].name;
                }
            }
            
            setStatus('ready', 'Ready');
        }
    } catch (error) {
        setStatus('error', 'Ollama offline');
        modelSelect.innerHTML = '<option value="">Ollama offline</option>';
        console.error('Failed to load models:', error);
    }
}

// Load GPU stats
async function loadGPUStats() {
    try {
        const response = await fetch('/api/gpu-stats');
        if (response.ok) {
            const stats = await response.json();
            
            // Update temperature with color coding
            const temp = stats.temperature;
            gpuTempSpan.textContent = `${temp}°C`;
            
            if (temp > 80) {
                gpuTempSpan.style.color = '#f85149'; // Red for hot
            } else if (temp > 70) {
                gpuTempSpan.style.color = '#fb8500'; // Orange for warm
            } else {
                gpuTempSpan.style.color = '#3fb950'; // Green for cool
            }
            
            // Update memory usage
            const memUsage = ((stats.memoryUsed / stats.memoryTotal) * 100).toFixed(0);
            gpuMemorySpan.textContent = `${(stats.memoryUsed / 1024).toFixed(1)}/${(stats.memoryTotal / 1024).toFixed(0)}GB`;
            gpuMemorySpan.title = `GPU Memory: ${memUsage}% used\nUtilization: ${stats.utilization}%`;
        }
    } catch (error) {
        console.error('Failed to load GPU stats:', error);
        gpuTempSpan.textContent = '--°C';
        gpuMemorySpan.textContent = '--GB';
    }
}

// Load models on startup
loadModels();
loadGPUStats();

// Refresh models every 30 seconds
setInterval(loadModels, 30000);

// Refresh GPU stats every 5 seconds
setInterval(loadGPUStats, 5000);