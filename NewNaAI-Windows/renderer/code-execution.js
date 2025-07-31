// Code Execution Feature for BrownFi Local LLMs

class CodeExecutor {
    constructor() {
        this.initCodeBlocks();
        this.setupEventListeners();
    }
    
    initCodeBlocks() {
        // Override the copy button function to add run buttons
        const originalAddCopyButtons = window.addCopyButtons;
        window.addCopyButtons = () => {
            originalAddCopyButtons();
            this.addRunButtons();
        };
    }
    
    addRunButtons() {
        document.querySelectorAll('.message.assistant pre').forEach(pre => {
            if (pre.querySelector('.run-button')) return; // Already has button
            
            const codeBlock = pre.querySelector('code');
            if (!codeBlock) return;
            
            // Get language from class name
            const language = this.detectLanguage(codeBlock);
            if (!this.isExecutable(language)) return;
            
            // Add run button
            const runBtn = document.createElement('button');
            runBtn.className = 'run-button';
            runBtn.innerHTML = '▶ Run';
            runBtn.onclick = () => this.executeCode(codeBlock.textContent, language, pre);
            
            pre.appendChild(runBtn);
        });
    }
    
    detectLanguage(codeBlock) {
        const classes = codeBlock.className.split(' ');
        for (const cls of classes) {
            if (cls.startsWith('language-')) {
                const lang = cls.replace('language-', '');
                // Map common language names
                if (lang === 'js' || lang === 'javascript') return 'javascript';
                if (lang === 'py' || lang === 'python') return 'python';
                if (lang === 'sh' || lang === 'bash' || lang === 'shell') return 'bash';
                return lang;
            }
        }
        return null;
    }
    
    isExecutable(language) {
        return ['javascript', 'python', 'bash'].includes(language);
    }
    
    async executeCode(code, language, preElement) {
        // Show execution state
        const runBtn = preElement.querySelector('.run-button');
        const originalText = runBtn.innerHTML;
        runBtn.innerHTML = '⏳ Running...';
        runBtn.disabled = true;
        
        // Remove previous output if exists
        const existingOutput = preElement.parentElement.querySelector('.code-output');
        if (existingOutput) {
            existingOutput.remove();
        }
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, language })
            });
            
            if (!response.ok) {
                throw new Error('Execution failed');
            }
            
            const result = await response.json();
            this.displayOutput(result, preElement.parentElement);
            
        } catch (error) {
            console.error('Execution error:', error);
            this.displayOutput({
                output: '',
                error: `Failed to execute: ${error.message}`,
                executionTime: 0
            }, preElement.parentElement);
        } finally {
            runBtn.innerHTML = originalText;
            runBtn.disabled = false;
        }
    }
    
    displayOutput(result, container) {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'code-output';
        
        const header = document.createElement('div');
        header.className = 'output-header';
        header.innerHTML = `
            <span class="output-label">Output</span>
            <span class="execution-time">${result.executionTime}ms</span>
        `;
        outputDiv.appendChild(header);
        
        if (result.output) {
            const stdout = document.createElement('pre');
            stdout.className = 'output-content stdout';
            stdout.textContent = result.output;
            outputDiv.appendChild(stdout);
        }
        
        if (result.error) {
            const stderr = document.createElement('pre');
            stderr.className = 'output-content stderr';
            stderr.textContent = result.error;
            outputDiv.appendChild(stderr);
        }
        
        if (!result.output && !result.error) {
            const noOutput = document.createElement('div');
            noOutput.className = 'output-content no-output';
            noOutput.textContent = 'No output';
            outputDiv.appendChild(noOutput);
        }
        
        container.appendChild(outputDiv);
    }
    
    setupEventListeners() {
        // Watch for new messages to add run buttons
        const observer = new MutationObserver(() => {
            setTimeout(() => this.addRunButtons(), 100);
        });
        
        observer.observe(document.getElementById('messages'), {
            childList: true,
            subtree: true
        });
    }
    
    // Create a code runner interface
    createCodeRunner() {
        const runner = document.createElement('div');
        runner.className = 'code-runner-panel';
        runner.innerHTML = `
            <div class="runner-header">
                <h3>Code Runner</h3>
                <select id="runner-language" class="runner-language">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                </select>
                <button class="close-runner" onclick="codeExecutor.toggleRunner()">✕</button>
            </div>
            <div class="runner-editor">
                <textarea id="runner-code" class="runner-code" placeholder="Enter your code here..."></textarea>
            </div>
            <div class="runner-controls">
                <button class="run-code-btn" onclick="codeExecutor.runFromEditor()">▶ Run</button>
                <button class="clear-code-btn" onclick="codeExecutor.clearEditor()">Clear</button>
            </div>
            <div id="runner-output" class="runner-output"></div>
        `;
        
        document.body.appendChild(runner);
        this.runnerPanel = runner;
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'code-runner-toggle';
        toggleBtn.innerHTML = '🖥️';
        toggleBtn.title = 'Code Runner (Ctrl+R)';
        toggleBtn.onclick = () => this.toggleRunner();
        document.querySelector('.container').appendChild(toggleBtn);
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.toggleRunner();
            }
        });
    }
    
    toggleRunner() {
        if (!this.runnerPanel) {
            this.createCodeRunner();
        }
        this.runnerPanel.classList.toggle('open');
        
        if (this.runnerPanel.classList.contains('open')) {
            document.getElementById('runner-code').focus();
        }
    }
    
    async runFromEditor() {
        const code = document.getElementById('runner-code').value;
        const language = document.getElementById('runner-language').value;
        const outputDiv = document.getElementById('runner-output');
        
        if (!code.trim()) return;
        
        outputDiv.innerHTML = '<div class="loading">Running...</div>';
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, language })
            });
            
            if (!response.ok) {
                throw new Error('Execution failed');
            }
            
            const result = await response.json();
            outputDiv.innerHTML = '';
            this.displayOutput(result, outputDiv);
            
        } catch (error) {
            outputDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }
    
    clearEditor() {
        document.getElementById('runner-code').value = '';
        document.getElementById('runner-output').innerHTML = '';
    }
}

// Initialize code executor
const codeExecutor = new CodeExecutor();
codeExecutor.createCodeRunner();

// Add CSS for code execution
const codeExecStyles = document.createElement('style');
codeExecStyles.textContent = `
/* Run button in code blocks */
.run-button {
    position: absolute;
    top: 0.5rem;
    right: 7rem;
    background: #238636;
    border: 1px solid #2ea043;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
}

.run-button:hover {
    background: #2ea043;
}

.run-button:disabled {
    background: #484f58;
    cursor: not-allowed;
}

/* Code output */
.code-output {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 0.375rem;
    margin-top: 0.5rem;
    overflow: hidden;
}

.output-header {
    background: #161b22;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #30363d;
}

.output-label {
    font-weight: 600;
    color: #c9d1d9;
}

.execution-time {
    font-size: 0.75rem;
    color: #8b949e;
}

.output-content {
    padding: 1rem;
    margin: 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.output-content.stdout {
    color: #3fb950;
}

.output-content.stderr {
    color: #f85149;
}

.output-content.no-output {
    color: #8b949e;
    font-style: italic;
}

/* Code Runner Panel */
.code-runner-toggle {
    position: fixed;
    right: 1rem;
    bottom: 2rem;
    width: 40px;
    height: 40px;
    background: #238636;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.25rem;
    z-index: 97;
    transition: all 0.3s;
}

.code-runner-toggle:hover {
    background: #2ea043;
}

.code-runner-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 400px;
    background: #0d1117;
    border-left: 1px solid #30363d;
    transform: translateX(100%);
    transition: transform 0.3s;
    z-index: 200;
    display: flex;
    flex-direction: column;
}

.code-runner-panel.open {
    transform: translateX(0);
}

.runner-header {
    background: #161b22;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #30363d;
}

.runner-header h3 {
    margin: 0;
    flex: 1;
}

.runner-language {
    background: #0d1117;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
}

.close-runner {
    background: none;
    border: none;
    color: #8b949e;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
}

.close-runner:hover {
    color: #c9d1d9;
}

.runner-editor {
    flex: 1;
    display: flex;
    padding: 1rem;
}

.runner-code {
    width: 100%;
    background: #161b22;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    resize: none;
    border-radius: 0.375rem;
}

.runner-code:focus {
    outline: none;
    border-color: #58a6ff;
}

.runner-controls {
    padding: 0 1rem;
    display: flex;
    gap: 0.5rem;
}

.run-code-btn, .clear-code-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
}

.run-code-btn {
    background: #238636;
    color: white;
}

.run-code-btn:hover {
    background: #2ea043;
}

.clear-code-btn {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
}

.clear-code-btn:hover {
    background: #30363d;
}

.runner-output {
    max-height: 300px;
    overflow-y: auto;
    margin: 1rem;
}

.runner-output .loading {
    text-align: center;
    color: #8b949e;
    padding: 2rem;
}

.runner-output .error {
    color: #f85149;
    padding: 1rem;
}

@media (max-width: 768px) {
    .code-runner-panel {
        width: 100%;
    }
    
    .code-runner-toggle {
        bottom: 1rem;
        right: 4rem;
        width: 35px;
        height: 35px;
        font-size: 1rem;
    }
}
`;
document.head.appendChild(codeExecStyles);