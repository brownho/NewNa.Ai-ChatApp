const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog, session, net } = require('electron');
const path = require('path');
const Store = require('electron-store');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';

// Initialize store for settings
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let tray;
let serverUrl = store.get('serverUrl', 'https://brownfi.tplinkdns.com:3000');

// Enable live reload for Electron
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

// Fix GPU issues on Windows
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Network configuration for HTTPS
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
app.commandLine.appendSwitch('disable-web-security');

// IPC handler for secure fetch using Electron's net module
ipcMain.handle('secure-fetch', async (event, url, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('SecureFetch request:', url);
      
      const request = net.request({
        method: options.method || 'GET',
        url: url,
        partition: 'persist:newnaai' // Use same partition as renderer
      });
      
      // Set headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value);
        });
      }
      
      // Handle credentials
      if (options.credentials === 'include') {
        request.setHeader('credentials', 'include');
      }
      
      let responseData = '';
      
      request.on('response', (response) => {
        console.log('SecureFetch response:', response.statusCode);
        
        response.on('data', (chunk) => {
          responseData += chunk;
        });
        
        response.on('end', () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: response.headers,
            data: responseData
          });
        });
      });
      
      request.on('error', (error) => {
        console.error('SecureFetch error:', error);
        reject({ error: error.message });
      });
      
      // Send body if present
      if (options.body) {
        const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        request.write(bodyString);
      }
      
      request.end();
    } catch (error) {
      console.error('SecureFetch exception:', error);
      reject({ error: error.message });
    }
  });
});

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Ensure localStorage works with file:// protocol
      partition: 'persist:newnaai'
    },
    show: false,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0d0d0d'
  });

  // Configure session to handle HTTPS
  const ses = mainWindow.webContents.session;
  
  // Clear cache to ensure fresh requests
  ses.clearCache(() => {
    console.log('Cache cleared');
  });
  
  // Set permission handler
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permissions for desktop app
    callback(true);
  });

  // Create custom menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-chat');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About NewNa.AI',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About NewNa.AI',
              message: 'NewNa.AI Desktop',
              detail: 'Version 1.0.0\nChat with local Ollama models',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://newna.ai');
          }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);

  // Load the app
  const isDev = process.argv.includes('--dev');
  let startUrl;
  
  if (isDev) {
    // In dev mode, load from the running server
    startUrl = 'http://localhost:3000';
  } else {
    // In production, load main app which will redirect to login if needed
    startUrl = `file://${path.join(__dirname, 'renderer/index.html')}`;
    
    // Inject the server URL into the page
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        window.API_BASE_URL = '${serverUrl}';
        console.log('Server URL set to:', window.API_BASE_URL);
      `);
    });
  }
  
  // Handle network errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('Failed to load:', errorDescription, validatedURL);
    if (errorCode === -105) { // ERR_NAME_NOT_RESOLVED
      console.log('DNS resolution failed, trying direct connection');
    }
  });
  
  // Intercept requests to add headers
  const filter = {
    urls: ['https://*/*', 'http://*/*']
  };
  
  ses.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['Origin'] = 'https://brownfi.tplinkdns.com:3000';
    callback({ requestHeaders: details.requestHeaders });
  });
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open developer tools in development or if there's an error
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Handle console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer: ${message}`);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show NewNa.AI',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'New Chat',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('new-chat');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('open-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('NewNa.AI');
  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// IPC handlers
ipcMain.handle('get-server-url', () => {
  return store.get('serverUrl', 'https://brownfi.tplinkdns.com:3000');
});

ipcMain.handle('set-server-url', (event, url) => {
  store.set('serverUrl', url);
  return true;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App event handlers
app.whenReady().then(() => {
  // Set certificate verification callback
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Prevent the default behavior
    event.preventDefault();
    
    console.log('Certificate error for URL:', url);
    console.log('Certificate error:', error);
    
    // Accept all certificates for desktop app
    callback(true);
  });
  
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}