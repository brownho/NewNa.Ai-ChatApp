// Speech Recognition Proxy for Electron App
// This module provides an alternative to Web Speech API for the desktop app

class SpeechRecognitionProxy {
    constructor() {
        this.isListening = false;
        this.onResult = null;
        this.onError = null;
        this.onEnd = null;
        this.continuous = true;
        this.interimResults = true;
        this.lang = 'en-US';
        
        // Check if we're in Electron
        this.isElectron = window.electronAPI !== undefined;
        
        // If in Electron, we'll use alternative methods
        if (this.isElectron) {
            this.initializeElectronSpeech();
        }
    }
    
    initializeElectronSpeech() {
        // For Electron, we can use:
        // 1. Local Whisper model via Ollama
        // 2. Server-side speech recognition relay
        // 3. Native Node.js speech recognition libraries
        
        this.useLocalWhisper = true; // Flag to use local processing
    }
    
    start() {
        this.isListening = true;
        
        if (this.onstart) {
            this.onstart();
        }
        
        // For Electron app, use alternative approach
        if (this.isElectron && this.useLocalWhisper) {
            this.startLocalRecognition();
        } else {
            // Fallback to Web Speech API if available
            this.startWebSpeechRecognition();
        }
    }
    
    stop() {
        this.isListening = false;
        
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
        
        if (this.onend) {
            this.onend();
        }
    }
    
    async startLocalRecognition() {
        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create MediaRecorder to capture audio chunks
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            
            const audioChunks = [];
            let chunkTimer = null;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                // Process the audio chunk
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks.length = 0; // Clear chunks
                
                // Convert to base64 for sending
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    
                    try {
                        // Send to local Whisper model or server relay
                        const transcript = await this.processAudioLocally(base64Audio);
                        
                        if (transcript && this.onresult) {
                            // Simulate Web Speech API result format
                            const event = {
                                results: [{
                                    0: { transcript: transcript },
                                    isFinal: true
                                }]
                            };
                            this.onresult(event);
                        }
                    } catch (error) {
                        console.error('Local speech recognition error:', error);
                        if (this.onerror) {
                            this.onerror({ error: 'network' });
                        }
                    }
                };
                reader.readAsDataURL(audioBlob);
                
                // Continue recording if still listening
                if (this.isListening) {
                    this.mediaRecorder.start();
                    
                    // Stop and process every 3 seconds
                    chunkTimer = setTimeout(() => {
                        if (this.mediaRecorder.state === 'recording') {
                            this.mediaRecorder.stop();
                        }
                    }, 3000);
                }
            };
            
            // Start recording
            this.mediaRecorder.start();
            
            // Process audio chunks every 3 seconds
            chunkTimer = setTimeout(() => {
                if (this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                }
            }, 3000);
            
        } catch (error) {
            console.error('Failed to start local recognition:', error);
            if (this.onerror) {
                this.onerror({ error: 'not-allowed' });
            }
        }
    }
    
    async processAudioLocally(base64Audio) {
        // Option 1: Use local Whisper model via Ollama (if available)
        // This would require Ollama to have a Whisper model installed
        
        // Option 2: Send to our server's speech recognition relay
        try {
            const response = await fetch('/api/speech-recognition/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio: base64Audio,
                    config: {
                        language: this.lang,
                        continuous: this.continuous
                    }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.transcript;
            }
        } catch (error) {
            console.error('Server relay failed:', error);
        }
        
        // Fallback: Return a message about the limitation
        return "Speech recognition requires internet connection. Please check your connection.";
    }
    
    startWebSpeechRecognition() {
        // Fallback to standard Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.webSpeechRecognition = new SpeechRecognition();
            
            this.webSpeechRecognition.continuous = this.continuous;
            this.webSpeechRecognition.interimResults = this.interimResults;
            this.webSpeechRecognition.lang = this.lang;
            
            // Forward events
            this.webSpeechRecognition.onstart = this.onstart;
            this.webSpeechRecognition.onresult = this.onresult;
            this.webSpeechRecognition.onerror = this.onerror;
            this.webSpeechRecognition.onend = this.onend;
            
            this.webSpeechRecognition.start();
        } else {
            if (this.onerror) {
                this.onerror({ error: 'not-supported' });
            }
        }
    }
}

// Export as a Web Speech API compatible interface
window.SpeechRecognitionProxy = SpeechRecognitionProxy;

// Override the native SpeechRecognition if in Electron
if (window.electronAPI) {
    window.SpeechRecognition = SpeechRecognitionProxy;
    window.webkitSpeechRecognition = SpeechRecognitionProxy;
}