// Electron adapter for the web app - Fixed version with better network handling
// This file bridges the web app with Electron-specific features

// Debug: Check if electronAPI is available
console.log('ElectronAPI available:', typeof window.electronAPI !== 'undefined');
if (window.electronAPI) {
    console.log('ElectronAPI methods:', Object.keys(window.electronAPI));
    console.log('secureFetch available:', typeof window.electronAPI.secureFetch === 'function');
}

// Set default server URL - always use public URL
window.API_BASE_URL = 'https://brownfi.tplinkdns.com:3000';

// Override API base URL with Electron settings
(async function() {
    if (window.electronAPI) {
        // Get server URL from Electron store
        const serverUrl = await window.electronAPI.getServerUrl();
        // Force use of public URL
        window.API_BASE_URL = 'https://brownfi.tplinkdns.com:3000';
        console.log('ElectronAPI detected, server URL:', window.API_BASE_URL);
        
        // Listen for IPC messages
        window.electronAPI.receive('new-chat', () => {
            // Trigger new chat
            if (window.createNewSession) {
                window.createNewSession();
            }
        });
        
        window.electronAPI.receive('open-settings', () => {
            // Open settings modal
            if (window.openSettings) {
                window.openSettings();
            }
        });
        
        // Add settings UI for server URL
        window.updateServerUrl = async (newUrl) => {
            await window.electronAPI.setServerUrl(newUrl);
            window.API_BASE_URL = newUrl;
            // Reload to apply changes
            window.location.reload();
        };
        
        // Desktop notifications
        window.showDesktopNotification = (message) => {
            const notification = document.createElement('div');
            notification.className = 'desktop-notification';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        };
        
        // Update app version in UI
        const version = await window.electronAPI.getAppVersion();
        const versionElement = document.createElement('div');
        versionElement.style.cssText = 'position: fixed; bottom: 10px; right: 10px; font-size: 12px; color: #666; z-index: 9999;';
        versionElement.textContent = `v${version}`;
        document.body.appendChild(versionElement);
    }
})();

// Modify fetch to use configured server URL and handle certificates
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    // If URL starts with /api or /, prepend the server URL
    if (typeof url === 'string') {
        if (url.startsWith('/api') || (url.startsWith('/') && !url.startsWith('//'))) {
            url = (window.API_BASE_URL || 'https://brownfi.tplinkdns.com:3000') + url;
        }
    }
    
    // Add credentials for all API calls
    if (typeof url === 'string' && (url.includes('/api/') || url.includes('brownfi.tplinkdns.com'))) {
        options.credentials = 'include';
        
        // Also add auth token if available
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
    }
    
    // Log the request for debugging
    console.log('Fetching:', url);
    
    // If we have electronAPI with secureFetch, use it for HTTPS requests
    if (window.electronAPI && window.electronAPI.secureFetch && url.startsWith('https://')) {
        try {
            console.log('Using secureFetch for:', url);
            const response = await window.electronAPI.secureFetch(url, options);
            console.log('SecureFetch response:', response.status, response.statusText);
            return response;
        } catch (error) {
            console.error('SecureFetch error:', error);
            // Fall back to regular fetch
        }
    }
    
    // Use original fetch
    try {
        const response = await originalFetch(url, options);
        console.log('Response:', response.status, response.statusText);
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

// Also override XMLHttpRequest for compatibility
const originalXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    
    xhr.open = function(method, url, ...args) {
        // If URL starts with /api or /, prepend the server URL
        if (typeof url === 'string') {
            if (url.startsWith('/api') || (url.startsWith('/') && !url.startsWith('//'))) {
                url = (window.API_BASE_URL || 'https://brownfi.tplinkdns.com:3000') + url;
            }
        }
        
        console.log('XHR Request:', method, url);
        return originalOpen.call(this, method, url, ...args);
    };
    
    return xhr;
};

// Desktop app authentication handling
window.addEventListener('DOMContentLoaded', () => {
    // Don't auto-login - let user choose to login or use as guest
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        // No auto-login - the app will redirect to login page
        console.log('No user found, redirecting to login will happen');
    }
    
    // Add a debug panel if in Electron
    if (window.electronAPI) {
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Network Debug';
        debugButton.style.cssText = 'position: fixed; bottom: 10px; left: 10px; padding: 5px 10px; background: #333; color: #fff; border: none; border-radius: 3px; cursor: pointer; z-index: 9999;';
        debugButton.onclick = () => {
            window.location.href = 'network-debug.html';
        };
        document.body.appendChild(debugButton);
    }
});