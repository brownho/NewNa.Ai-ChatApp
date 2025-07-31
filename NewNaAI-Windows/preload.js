const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  receive: (channel, func) => {
    const validChannels = ['new-chat', 'open-settings'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Secure fetch that runs in main process
  secureFetch: async (url, options = {}) => {
    const result = await ipcRenderer.invoke('secure-fetch', url, options);
    if (result.error) {
      throw new Error(result.error);
    }
    return {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      json: async () => JSON.parse(result.data),
      text: async () => result.data
    };
  }
});

console.log('Preload script loaded, electronAPI exposed');