// Enhanced features for BrownFi Local LLMs

// Helper function to add messages - wraps the main script's function
function addMessage(content, role) {
    if (typeof addMessageToUI === 'function') {
        return addMessageToUI(content, role);
    } else {
        console.warn('addMessageToUI not available yet');
        return null;
    }
}

// Add copy button to all code blocks
function addCopyButtons() {
    document.querySelectorAll('.message.assistant pre').forEach(pre => {
        if (pre.querySelector('.copy-button')) return; // Already has button
        
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = '📋 Copy';
        button.onclick = async () => {
            const code = pre.querySelector('code').textContent;
            await navigator.clipboard.writeText(code);
            button.innerHTML = '✓ Copied!';
            setTimeout(() => button.innerHTML = '📋 Copy', 2000);
        };
        pre.style.position = 'relative';
        pre.appendChild(button);
    });
}

// Add message actions (copy, regenerate, edit)
function addMessageActions(messageDiv, role, content) {
    if (messageDiv.querySelector('.message-actions')) return;
    
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    // Copy entire message
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = '📋';
    copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(content);
        copyBtn.innerHTML = '✓';
        setTimeout(() => copyBtn.innerHTML = '📋', 2000);
    };
    actions.appendChild(copyBtn);
    
    if (role === 'assistant') {
        // Regenerate response
        const regenBtn = document.createElement('button');
        regenBtn.className = 'action-btn';
        regenBtn.title = 'Regenerate response';
        regenBtn.innerHTML = '🔄';
        regenBtn.onclick = () => regenerateMessage(messageDiv);
        actions.appendChild(regenBtn);
    }
    
    // Edit message
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.title = 'Edit message';
    editBtn.innerHTML = '✏️';
    editBtn.onclick = () => editMessage(messageDiv, role);
    actions.appendChild(editBtn);
    
    // Delete message
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete';
    deleteBtn.title = 'Delete message';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => deleteMessage(messageDiv);
    actions.appendChild(deleteBtn);
    
    messageDiv.appendChild(actions);
}

// Regenerate assistant message
function regenerateMessage(messageDiv) {
    const index = Array.from(messagesDiv.children).indexOf(messageDiv);
    
    // Remove this message and all after it
    messages = messages.slice(0, index);
    while (messagesDiv.children.length > index) {
        messagesDiv.removeChild(messagesDiv.lastChild);
    }
    
    // Send the last user message again
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
        sendMessage(messages[messages.length - 1].content, true);
    }
}

// Edit message
function editMessage(messageDiv, role) {
    const index = Array.from(messagesDiv.children).indexOf(messageDiv);
    const content = messages[index].content;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = content;
    textarea.rows = content.split('\n').length + 1;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-edit-btn';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => {
        const newContent = textarea.value;
        messages[index].content = newContent;
        
        if (role === 'user') {
            messageDiv.textContent = newContent;
        } else {
            messageDiv.innerHTML = marked.parse(newContent);
            setTimeout(addCopyButtons, 100);
        }
        
        textarea.remove();
        saveBtn.remove();
        cancelBtn.remove();
        addMessageActions(messageDiv, role, newContent);
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-edit-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        textarea.remove();
        saveBtn.remove();
        cancelBtn.remove();
    };
    
    messageDiv.innerHTML = '';
    messageDiv.appendChild(textarea);
    messageDiv.appendChild(saveBtn);
    messageDiv.appendChild(cancelBtn);
    textarea.focus();
}

// Delete message
function deleteMessage(messageDiv) {
    if (!confirm('Delete this message?')) return;
    
    const index = Array.from(messagesDiv.children).indexOf(messageDiv);
    messages.splice(index, 1);
    messageDiv.remove();
}

// Override the original addMessage function to include actions
const originalAddMessage = addMessage;
window.addMessage = function(role, content, streaming = false) {
    const messageDiv = originalAddMessage(role, content, streaming);
    
    if (!streaming) {
        setTimeout(() => {
            addMessageActions(messageDiv, role, content);
            if (role === 'assistant') {
                addCopyButtons();
            }
        }, 100);
    }
    
    return messageDiv;
};

// Watch for streaming completion to add actions
const originalUpdateStreamingMessage = updateStreamingMessage;
window.updateStreamingMessage = function(content) {
    originalUpdateStreamingMessage(content);
    
    if (currentMessageDiv && !currentMessageDiv.classList.contains('streaming')) {
        setTimeout(() => {
            addMessageActions(currentMessageDiv, 'assistant', content);
            addCopyButtons();
        }, 100);
    }
};

// Custom sendMessage that accepts content override
const originalSendMessage = sendMessage;
window.sendMessage = async function(contentOverride, isRegeneration = false) {
    const message = contentOverride || messageInput.value.trim();
    if (!message) return;

    if (!isRegeneration) {
        addMessage('user', message);
        messages.push({ role: 'user', content: message });
    }

    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.disabled = true;
    sendButton.disabled = true;
    setStatus('loading', 'Thinking...');

    currentMessageDiv = addMessage('', 'assistant');

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
};