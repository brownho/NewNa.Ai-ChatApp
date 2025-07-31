// Advanced Model Parameters for BrownFi Local LLMs

class ModelParameters {
    constructor() {
        this.parameters = this.loadParameters();
        this.presets = {
            'Creative': {
                temperature: 0.9,
                top_p: 0.95,
                top_k: 100,
                repeat_penalty: 1.2
            },
            'Balanced': {
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                repeat_penalty: 1.1
            },
            'Precise': {
                temperature: 0.3,
                top_p: 0.85,
                top_k: 20,
                repeat_penalty: 1.0
            },
            'Deterministic': {
                temperature: 0.1,
                top_p: 0.5,
                top_k: 10,
                repeat_penalty: 1.0
            }
        };
        
        this.initUI();
        this.applyParameters();
    }
    
    loadParameters() {
        const saved = localStorage.getItem('modelParameters');
        return saved ? JSON.parse(saved) : {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: 2048,
            repeat_penalty: 1.1,
            seed: null,
            num_ctx: 2048,
            mirostat: 0,
            mirostat_tau: 5.0,
            mirostat_eta: 0.1
        };
    }
    
    saveParameters() {
        localStorage.setItem('modelParameters', JSON.stringify(this.parameters));
    }
    
    initUI() {
        // Create parameters panel
        const panel = document.createElement('div');
        panel.className = 'parameters-panel';
        panel.innerHTML = `
            <button class="parameters-toggle" onclick="modelParameters.togglePanel()" title="Model Parameters (Ctrl+P)">
                ⚙️
            </button>
            <div class="parameters-content" style="display: none;">
                <div class="parameters-header">
                    <h3>Model Parameters</h3>
                    <button class="close-parameters" onclick="modelParameters.togglePanel()">✕</button>
                </div>
                
                <div class="parameters-presets">
                    <label>Presets:</label>
                    <div class="preset-buttons">
                        <button class="preset-btn" onclick="modelParameters.applyPreset('Creative')">🎨 Creative</button>
                        <button class="preset-btn" onclick="modelParameters.applyPreset('Balanced')">⚖️ Balanced</button>
                        <button class="preset-btn" onclick="modelParameters.applyPreset('Precise')">🎯 Precise</button>
                        <button class="preset-btn" onclick="modelParameters.applyPreset('Deterministic')">🔒 Deterministic</button>
                    </div>
                </div>
                
                <div class="parameters-grid">
                    <div class="param-group">
                        <label for="param-temperature">
                            Temperature
                            <span class="param-info" title="Controls randomness. Higher = more creative, lower = more focused">ⓘ</span>
                        </label>
                        <input type="range" id="param-temperature" min="0" max="2" step="0.1" value="${this.parameters.temperature}">
                        <span class="param-value">${this.parameters.temperature}</span>
                    </div>
                    
                    <div class="param-group">
                        <label for="param-top-p">
                            Top P
                            <span class="param-info" title="Nucleus sampling. Controls diversity of word choices">ⓘ</span>
                        </label>
                        <input type="range" id="param-top-p" min="0" max="1" step="0.05" value="${this.parameters.top_p}">
                        <span class="param-value">${this.parameters.top_p}</span>
                    </div>
                    
                    <div class="param-group">
                        <label for="param-top-k">
                            Top K
                            <span class="param-info" title="Limits vocabulary. Lower = more focused">ⓘ</span>
                        </label>
                        <input type="range" id="param-top-k" min="1" max="100" step="1" value="${this.parameters.top_k}">
                        <span class="param-value">${this.parameters.top_k}</span>
                    </div>
                    
                    <div class="param-group">
                        <label for="param-repeat-penalty">
                            Repeat Penalty
                            <span class="param-info" title="Penalizes repetition. Higher = less repetitive">ⓘ</span>
                        </label>
                        <input type="range" id="param-repeat-penalty" min="0.5" max="2" step="0.1" value="${this.parameters.repeat_penalty}">
                        <span class="param-value">${this.parameters.repeat_penalty}</span>
                    </div>
                    
                    <div class="param-group">
                        <label for="param-num-predict">
                            Max Tokens
                            <span class="param-info" title="Maximum response length in tokens">ⓘ</span>
                        </label>
                        <input type="number" id="param-num-predict" min="128" max="8192" step="128" value="${this.parameters.num_predict}">
                    </div>
                    
                    <div class="param-group">
                        <label for="param-seed">
                            Seed
                            <span class="param-info" title="Random seed for reproducible outputs. -1 for random">ⓘ</span>
                        </label>
                        <input type="number" id="param-seed" min="-1" value="${this.parameters.seed || -1}">
                    </div>
                    
                    <div class="param-group">
                        <label for="param-num-ctx">
                            Context Window
                            <span class="param-info" title="Size of context window in tokens">ⓘ</span>
                        </label>
                        <input type="number" id="param-num-ctx" min="512" max="32768" step="512" value="${this.parameters.num_ctx}">
                    </div>
                    
                    <div class="param-group">
                        <label for="param-mirostat">
                            Mirostat
                            <span class="param-info" title="Alternative sampling. 0=disabled, 1=v1, 2=v2">ⓘ</span>
                        </label>
                        <select id="param-mirostat">
                            <option value="0" ${this.parameters.mirostat === 0 ? 'selected' : ''}>Disabled</option>
                            <option value="1" ${this.parameters.mirostat === 1 ? 'selected' : ''}>Version 1</option>
                            <option value="2" ${this.parameters.mirostat === 2 ? 'selected' : ''}>Version 2</option>
                        </select>
                    </div>
                </div>
                
                <div class="parameters-actions">
                    <button class="reset-params-btn" onclick="modelParameters.resetDefaults()">Reset to Defaults</button>
                    <button class="save-params-btn" onclick="modelParameters.saveAndClose()">Save & Apply</button>
                </div>
                
                <div class="parameters-info">
                    <p>Changes apply to new messages only. Hover over ⓘ for parameter descriptions.</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // Add event listeners
        this.setupEventListeners();
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.togglePanel();
            }
        });
    }
    
    setupEventListeners() {
        // Range inputs
        ['temperature', 'top-p', 'top-k', 'repeat-penalty'].forEach(param => {
            const input = document.getElementById(`param-${param}`);
            const valueSpan = input.nextElementSibling;
            
            input.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
                const paramName = param.replace('-', '_');
                this.parameters[paramName] = parseFloat(e.target.value);
            });
        });
        
        // Number inputs
        ['num-predict', 'seed', 'num-ctx'].forEach(param => {
            const input = document.getElementById(`param-${param}`);
            
            input.addEventListener('change', (e) => {
                const paramName = param.replace('-', '_');
                this.parameters[paramName] = parseInt(e.target.value) || null;
            });
        });
        
        // Mirostat select
        document.getElementById('param-mirostat').addEventListener('change', (e) => {
            this.parameters.mirostat = parseInt(e.target.value);
        });
    }
    
    togglePanel() {
        const content = this.panel.querySelector('.parameters-content');
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
    }
    
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        // Apply preset values
        Object.entries(preset).forEach(([key, value]) => {
            this.parameters[key] = value;
            
            // Update UI
            const param = key.replace('_', '-');
            const input = document.getElementById(`param-${param}`);
            if (input) {
                input.value = value;
                if (input.type === 'range') {
                    input.nextElementSibling.textContent = value;
                }
            }
        });
        
        // Visual feedback
        const btn = event.target;
        btn.style.background = '#238636';
        setTimeout(() => btn.style.background = '', 300);
    }
    
    resetDefaults() {
        this.parameters = {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: 2048,
            repeat_penalty: 1.1,
            seed: null,
            num_ctx: 2048,
            mirostat: 0,
            mirostat_tau: 5.0,
            mirostat_eta: 0.1
        };
        
        // Update UI
        this.updateUI();
        this.saveParameters();
    }
    
    updateUI() {
        Object.entries(this.parameters).forEach(([key, value]) => {
            const param = key.replace('_', '-');
            const input = document.getElementById(`param-${param}`);
            if (input) {
                input.value = value || (key === 'seed' ? -1 : 0);
                if (input.type === 'range') {
                    input.nextElementSibling.textContent = value;
                }
            }
        });
    }
    
    saveAndClose() {
        this.saveParameters();
        this.togglePanel();
        
        // Show confirmation
        setStatus('ready', 'Parameters saved');
    }
    
    getOptions() {
        const options = { ...this.parameters };
        
        // Convert seed -1 to null for random
        if (options.seed === -1) {
            options.seed = null;
        }
        
        // Remove null/undefined values
        Object.keys(options).forEach(key => {
            if (options[key] === null || options[key] === undefined) {
                delete options[key];
            }
        });
        
        return options;
    }
    
    applyParameters() {
        // Override sendMessage to include parameters
        const originalSendMessage5 = window.sendMessage;
        window.sendMessage = async function(contentOverride, isRegeneration = false) {
            const message = contentOverride || messageInput.value.trim();
            if (!message) return;

            const filesContext = fileUploadManager.getFilesContext();
            const fullMessage = filesContext && !isRegeneration ? message + filesContext : message;

            if (!isRegeneration) {
                addMessage('user', fullMessage);
                messages.push({ role: 'user', content: fullMessage });
            }

            messageInput.value = '';
            messageInput.style.height = 'auto';
            messageInput.disabled = true;
            sendButton.disabled = true;
            setStatus('loading', 'Thinking...');

            performanceMetrics.startTracking();
            currentMessageDiv = addMessage('assistant', '', true);

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        messages, 
                        model: selectedModel,
                        options: modelParameters.getOptions()
                    }),
                    signal: performanceMetrics.getAbortSignal()
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
                                performanceMetrics.stopTracking();
                                setTimeout(() => {
                                    addMessageActions(currentMessageDiv, 'assistant', assistantMessage);
                                    addCopyButtons();
                                }, 100);
                                break;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.content) {
                                    assistantMessage += parsed.content;
                                    performanceMetrics.updateTokenCount(assistantMessage);
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
                if (error.name === 'AbortError') {
                    console.log('Generation stopped by user');
                    setStatus('ready', 'Ready');
                } else {
                    console.error('Error:', error);
                    currentMessageDiv.innerHTML = '<em>Error: Failed to get response from Ollama.</em>';
                    currentMessageDiv.classList.remove('streaming');
                    setStatus('error', 'Error');
                }
                performanceMetrics.stopTracking();
            } finally {
                messageInput.disabled = false;
                sendButton.disabled = false;
                messageInput.focus();
                currentMessageDiv = null;
                
                if (!isRegeneration) {
                    fileUploadManager.clearFiles();
                }
                
                setTimeout(() => chatHistory.saveCurrentSession(), 1000);
            }
        };
    }
}

// Initialize model parameters
const modelParameters = new ModelParameters();

// Add CSS
const paramStyles = document.createElement('style');
paramStyles.textContent = `
/* Model Parameters Panel */
.parameters-panel {
    position: fixed;
    top: 4rem;
    right: 1rem;
    z-index: 99;
}

.parameters-toggle {
    width: 40px;
    height: 40px;
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.25rem;
    transition: all 0.2s;
}

.parameters-toggle:hover {
    background: #30363d;
    border-color: #58a6ff;
}

.parameters-content {
    position: absolute;
    top: 50px;
    right: 0;
    width: 420px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.parameters-header {
    background: #161b22;
    padding: 1rem;
    border-bottom: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0.5rem 0.5rem 0 0;
}

.parameters-header h3 {
    margin: 0;
    font-size: 1.1rem;
}

.close-parameters {
    background: none;
    border: none;
    color: #8b949e;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
}

.close-parameters:hover {
    color: #c9d1d9;
}

.parameters-presets {
    padding: 1rem;
    border-bottom: 1px solid #30363d;
}

.parameters-presets label {
    display: block;
    margin-bottom: 0.5rem;
    color: #8b949e;
    font-size: 0.875rem;
}

.preset-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}

.preset-btn {
    padding: 0.5rem;
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.preset-btn:hover {
    background: #30363d;
    border-color: #58a6ff;
}

.parameters-grid {
    padding: 1rem;
    display: grid;
    gap: 1rem;
}

.param-group {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.5rem;
}

.param-group label {
    color: #c9d1d9;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.param-info {
    color: #8b949e;
    font-size: 0.75rem;
    cursor: help;
}

.param-group input[type="range"] {
    grid-column: 1 / -1;
    width: 100%;
    height: 6px;
    background: #21262d;
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
}

.param-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #238636;
    border-radius: 50%;
    cursor: pointer;
}

.param-group input[type="range"]::-webkit-slider-thumb:hover {
    background: #2ea043;
}

.param-value {
    grid-column: 2;
    text-align: right;
    color: #58a6ff;
    font-family: monospace;
    font-size: 0.875rem;
}

.param-group input[type="number"],
.param-group select {
    grid-column: 2;
    width: 100px;
    padding: 0.25rem 0.5rem;
    background: #161b22;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.param-group input[type="number"]:focus,
.param-group select:focus {
    outline: none;
    border-color: #58a6ff;
}

.parameters-actions {
    padding: 1rem;
    display: flex;
    gap: 0.5rem;
    border-top: 1px solid #30363d;
}

.reset-params-btn,
.save-params-btn {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
}

.reset-params-btn {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
}

.reset-params-btn:hover {
    background: #30363d;
}

.save-params-btn {
    background: #238636;
    color: white;
}

.save-params-btn:hover {
    background: #2ea043;
}

.parameters-info {
    padding: 0.75rem 1rem;
    background: #161b22;
    border-top: 1px solid #30363d;
    border-radius: 0 0 0.5rem 0.5rem;
}

.parameters-info p {
    margin: 0;
    font-size: 0.75rem;
    color: #8b949e;
}

@media (max-width: 768px) {
    .parameters-panel {
        top: 3rem;
        right: 0.5rem;
    }
    
    .parameters-toggle {
        width: 35px;
        height: 35px;
        font-size: 1rem;
    }
    
    .parameters-content {
        width: calc(100vw - 1rem);
        max-width: 420px;
    }
}
`;
document.head.appendChild(paramStyles);