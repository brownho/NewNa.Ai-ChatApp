// Meeting Mentor Configuration
const MeetingMentorConfig = {
    // Speech Recognition Settings
    speechRecognition: {
        language: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 1,
        profanityFilter: false
    },
    
    // AI Suggestion Settings
    suggestions: {
        autoGenerateInterval: 15000, // 15 seconds
        minContextLength: 3, // Minimum conversation entries before generating suggestions
        maxSuggestions: 3,
        suggestionLength: 50, // Max words per suggestion
        usePersonalization: true
    },
    
    // Transcript Settings
    transcript: {
        autoSaveInterval: 5000, // 5 seconds
        maxContextHistory: 10, // Number of entries to keep in context
        exportFormats: ['txt', 'pdf', 'docx'],
        enableSpeakerIdentification: true
    },
    
    // Meeting Settings
    meeting: {
        defaultTitle: 'Meeting {date}',
        enableActionItems: true,
        enableSummary: true,
        enableParticipants: true,
        summaryModel: 'llama2' // Model to use for summary generation
    },
    
    // UI Settings
    ui: {
        enableDiscreetMode: true,
        discreetModeOpacity: 0.3,
        showAudioVisualizer: true,
        theme: 'light' // 'light' or 'dark'
    },
    
    // Integration Settings
    integrations: {
        calendar: {
            enabled: false, // Set to true when calendar integration is implemented
            providers: ['google', 'outlook', 'ical']
        },
        export: {
            cloudStorage: false, // Set to true to enable cloud storage export
            providers: ['drive', 'dropbox', 'onedrive']
        }
    },
    
    // Advanced Settings
    advanced: {
        voiceFingerprinting: false, // Enable voice-based speaker identification
        realtimeCollaboration: true, // Enable multi-user meeting support
        encryptTranscripts: false, // Enable transcript encryption
        offlineMode: false // Enable offline transcript storage
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetingMentorConfig;
}