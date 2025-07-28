// Unified Meeting Assistant UI Controller
class MeetingUIController {
    constructor() {
        this.currentMode = null; // 'basic' or 'mentor'
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Get the header button
        const headerButton = document.getElementById('showMeetingAssistantHeader');
        if (!headerButton) {
            console.error('Meeting assistant header button not found');
            return;
        }

        // Add click handler
        headerButton.addEventListener('click', () => this.toggleMeetingAssistant());

        // Check if user is authenticated
        this.checkAuthentication();
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/auth/user', {
                credentials: 'include'
            });
            this.isAuthenticated = response.ok;
        } catch (error) {
            this.isAuthenticated = false;
        }
    }

    toggleMeetingAssistant() {
        console.log('toggleMeetingAssistant called');
        // Always use fullscreen version for all users
        // Wait for initialization if needed
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkAndShow = () => {
            attempts++;
            console.log(`Checking for meetingMentorFS (attempt ${attempts})...`);
            
            if (window.meetingMentorFS) {
                console.log('Found meetingMentorFS, calling show()');
                // Use fullscreen version
                window.meetingMentorFS.show();
            } else if (attempts < maxAttempts) {
                // Try again in a moment
                console.log('meetingMentorFS not ready yet, waiting...');
                setTimeout(checkAndShow, 100);
            } else {
                console.error('Meeting Mentor Fullscreen failed to initialize after 5 seconds');
                alert('Meeting Assistant is not available. Please refresh the page and try again.');
            }
        };
        
        checkAndShow();
    }

    showBasicAssistant() {
        this.hideAll();
        const basicContainer = document.getElementById('meeting-assistant');
        if (basicContainer) {
            basicContainer.classList.add('visible');
            this.currentMode = 'basic';
            document.getElementById('showMeetingAssistantHeader').classList.add('active');
        }
    }

    showMeetingMentor() {
        this.hideAll();
        const mentorContainer = document.getElementById('meeting-mentor');
        if (mentorContainer) {
            mentorContainer.classList.add('visible');
            this.currentMode = 'mentor';
            document.getElementById('showMeetingAssistantHeader').classList.add('active');
        }
    }

    hideAll() {
        // Hide basic assistant
        const basicContainer = document.getElementById('meeting-assistant');
        if (basicContainer) {
            basicContainer.classList.remove('visible');
        }

        // Hide meeting mentor
        const mentorContainer = document.getElementById('meeting-mentor');
        if (mentorContainer) {
            mentorContainer.classList.remove('visible');
        }

        // Remove active state from button
        document.getElementById('showMeetingAssistantHeader').classList.remove('active');
    }
}

// Initialize the controller
const meetingUIController = new MeetingUIController();