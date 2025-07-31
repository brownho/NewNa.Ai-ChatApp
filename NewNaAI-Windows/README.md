# NewNa.AI Windows Desktop App

Native Windows desktop application for NewNa.AI chat, built with Electron.

## Features

- 🖥️ Native Windows application
- 🔄 Auto-updater for seamless updates
- 🔔 System tray integration
- 📌 Desktop notifications
- ⌨️ Keyboard shortcuts
- 📁 Drag & drop file uploads
- 🔒 Secure local storage
- 🌐 Works with local or remote servers

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Windows 10/11

## Development Setup

1. Install dependencies:
```bash
cd NewNaAI-Windows
npm install
```

2. Configure server URL:
   - The app will prompt for server URL on first launch
   - Default: `https://localhost:3000`

3. Run in development mode:
```bash
npm run dev
```

## Building for Distribution

### Build Installer (.exe)

```bash
# Build for current architecture
npm run build

# Build for all architectures (x64 and ia32)
npm run dist
```

The installer will be created in the `dist` folder:
- `NewNa.AI Setup 1.0.0.exe` - NSIS installer

### Build Configuration

Edit `package.json` to customize:
- App name and version
- App ID (`build.appId`)
- Publisher information
- Icon paths
- Installation options

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New Chat |
| Ctrl+, | Open Settings |
| Ctrl+R | Reload |
| F11 | Toggle Fullscreen |
| Ctrl+Shift+I | Developer Tools |

## File Structure

```
NewNaAI-Windows/
├── main.js           # Main process
├── preload.js        # Preload script
├── package.json      # Project config
├── renderer/         # Web app files
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── ...
├── assets/          # Icons and images
│   ├── icon.png
│   ├── icon.ico
│   └── tray-icon.png
└── dist/           # Build output
```

## Features

### System Tray
- Minimize to tray
- Quick access menu
- Show/hide window
- Create new chat

### Auto-Updates
- Automatic update checks
- Background downloads
- User notification when ready
- Optional immediate restart

### Settings Storage
- Server URL configuration
- Window size/position
- User preferences
- Persistent across updates

## Distribution

### Code Signing (Optional)
For trusted installation without Windows warnings:

1. Obtain a code signing certificate
2. Configure in package.json:
```json
"build": {
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password"
  }
}
```

### Publishing Updates

1. Update version in package.json
2. Build the new version
3. Upload to your release server
4. Configure auto-updater URL

## Troubleshooting

### Common Issues

1. **White screen on startup**
   - Check server URL configuration
   - Verify server is running
   - Check developer console (Ctrl+Shift+I)

2. **Installation blocked by Windows**
   - Right-click installer → Properties → Unblock
   - Or use code signing certificate

3. **Can't connect to server**
   - Verify server URL in settings
   - Check firewall settings
   - Ensure server allows CORS

### Debug Mode

Run with debug logging:
```bash
set DEBUG=electron-builder
npm run dist
```

## Server Requirements

The app expects:
- CORS enabled for Electron app
- Authentication endpoints
- Chat API endpoints
- WebSocket support (optional)

## Security

- Content Security Policy configured
- Context isolation enabled
- No nodeIntegration in renderer
- Secure IPC communication
- HTTPS recommended

## License

MIT License - See LICENSE file