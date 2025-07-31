// File Upload Feature for BrownFi Local LLMs

class FileUploadManager {
    constructor() {
        this.attachedFiles = [];
        this.initUI();
    }
    
    initUI() {
        // Add file upload button to input area
        const inputContainer = document.querySelector('.input-container');
        
        // Create file upload wrapper
        const uploadWrapper = document.createElement('div');
        uploadWrapper.className = 'upload-wrapper';
        uploadWrapper.innerHTML = `
            <input type="file" id="file-input" multiple hidden>
            <button id="upload-btn" class="upload-btn" title="Attach files (Ctrl+U)">
                📎 <span class="file-count"></span>
            </button>
            <div id="attached-files" class="attached-files"></div>
        `;
        
        // Insert before the textarea
        inputContainer.insertBefore(uploadWrapper, messageInput);
        
        // Get elements
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.attachedFilesDiv = document.getElementById('attached-files');
        this.fileCountSpan = uploadWrapper.querySelector('.file-count');
        
        // Event listeners
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.body.classList.add('dragging');
        });
        
        document.addEventListener('dragleave', (e) => {
            if (e.clientX === 0 && e.clientY === 0) {
                document.body.classList.remove('dragging');
            }
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            document.body.classList.remove('dragging');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                this.fileInput.click();
            }
        });
        
        // Paste images
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    this.handleFiles([file]);
                }
            }
        });
    }
    
    async handleFileSelect(e) {
        this.handleFiles(e.target.files);
    }
    
    async handleFiles(files) {
        for (let file of files) {
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                continue;
            }
            
            await this.uploadFile(file);
        }
        
        this.updateUI();
    }
    
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const data = await response.json();
            
            this.attachedFiles.push({
                id: Date.now() + Math.random(),
                filename: data.filename,
                content: data.content,
                type: data.type,
                mimeType: data.mimeType,
                size: data.size
            });
            
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Failed to upload ${file.name}`);
        }
    }
    
    removeFile(fileId) {
        this.attachedFiles = this.attachedFiles.filter(f => f.id !== fileId);
        this.updateUI();
    }
    
    updateUI() {
        // Update file count
        if (this.attachedFiles.length > 0) {
            this.fileCountSpan.textContent = this.attachedFiles.length;
            this.fileCountSpan.style.display = 'inline';
        } else {
            this.fileCountSpan.style.display = 'none';
        }
        
        // Update attached files display
        this.attachedFilesDiv.innerHTML = this.attachedFiles.map(file => {
            const icon = file.type === 'image' ? '🖼️' : '📄';
            const sizeKB = (file.size / 1024).toFixed(1);
            
            return `
                <div class="attached-file" data-id="${file.id}">
                    <span class="file-icon">${icon}</span>
                    <span class="file-name">${file.filename}</span>
                    <span class="file-size">${sizeKB}KB</span>
                    <button class="remove-file" onclick="fileUploadManager.removeFile(${file.id})">✕</button>
                </div>
            `;
        }).join('');
        
        this.attachedFilesDiv.style.display = this.attachedFiles.length > 0 ? 'flex' : 'none';
    }
    
    getFilesContext() {
        if (this.attachedFiles.length === 0) return '';
        
        let context = '\n\n---ATTACHED FILES---\n';
        
        this.attachedFiles.forEach(file => {
            if (file.type === 'image') {
                context += `\n[Image: ${file.filename}]\n![${file.filename}](data:${file.mimeType};base64,${file.content})\n`;
            } else {
                context += `\n[File: ${file.filename}]\n\`\`\`\n${file.content}\n\`\`\`\n`;
            }
        });
        
        return context;
    }
    
    clearFiles() {
        this.attachedFiles = [];
        this.updateUI();
    }
}

// Initialize file upload manager
const fileUploadManager = new FileUploadManager();

// Override sendMessage to include files
const originalSendMessage3 = window.sendMessage;
window.sendMessage = async function(contentOverride, isRegeneration = false) {
    let message = contentOverride || messageInput.value.trim();
    
    // Add file context to message
    const filesContext = fileUploadManager.getFilesContext();
    if (filesContext && !isRegeneration) {
        message += filesContext;
    }
    
    // Call original sendMessage
    await originalSendMessage3(message, isRegeneration);
    
    // Clear files after sending
    if (!isRegeneration) {
        fileUploadManager.clearFiles();
    }
};

// Add drop zone indicator
const style = document.createElement('style');
style.textContent = `
    body.dragging::after {
        content: 'Drop files here';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(35, 134, 54, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        z-index: 1000;
        pointer-events: none;
    }
`;
document.head.appendChild(style);