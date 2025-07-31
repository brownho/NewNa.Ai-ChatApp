# Using Ngrok for iOS App Development

Ngrok provides a secure HTTPS tunnel to your local server, making it perfect for iOS app development.

## Setup Instructions

### 1. Install Ngrok

```bash
# Download and install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Or using snap
sudo snap install ngrok
```

### 2. Start Your Local Server

Make sure your server is running:
```bash
cd /home/sabro/ollama-chat-app
npm start
```

### 3. Start Ngrok Tunnel

Since your server uses HTTPS on port 3000:
```bash
ngrok http https://localhost:3000
```

Or if you switch to HTTP:
```bash
ngrok http 3000
```

### 4. Get Your Ngrok URL

Ngrok will display something like:
```
Forwarding: https://abc123.ngrok-free.app -> https://localhost:3000
```

### 5. Update iOS App Configuration

Copy your ngrok URL and update `src/config/constants.ts`:
```typescript
export const API_BASE_URL = 'https://abc123.ngrok-free.app';
```

## Benefits

- ✅ Valid HTTPS certificate (no self-signed issues)
- ✅ Works on physical iOS devices
- ✅ Works over internet (not just local network)
- ✅ Great for testing and demos

## Important Notes

1. **Free Tier Limitations**:
   - URL changes each time you restart ngrok
   - Limited requests per minute
   - Session expires after 2 hours

2. **Development Workflow**:
   - Start server first
   - Start ngrok
   - Update iOS app config with new URL
   - Restart iOS app

3. **Security**:
   - Anyone with the URL can access your local server
   - Use ngrok auth for additional security
   - Don't share sensitive data during testing

## Alternative: Permanent Subdomain

For consistent URLs, consider ngrok paid plan:
```bash
ngrok http --subdomain=newna-dev https://localhost:3000
```

This gives you: `https://newna-dev.ngrok-free.app`