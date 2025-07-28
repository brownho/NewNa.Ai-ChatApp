# GoDaddy Deployment Guide for NewNa.AI

## Important Considerations

Before deploying to GoDaddy, understand these key points:

1. **Ollama Backend**: Ollama runs locally on your machine. For the chatbot to work on newna.ai, you need to:
   - Keep Ollama running on a server/computer that's always online
   - Expose it securely to the internet
   - Or use a cloud-hosted Ollama instance

2. **GoDaddy Hosting Types**:
   - **Shared Hosting**: Won't work (no Node.js support)
   - **VPS/Dedicated**: Can work with full setup
   - **Managed WordPress**: Won't work
   - **cPanel with Node.js**: May work with limitations

## Option 1: VPS/Cloud Deployment (Recommended)

If you have a GoDaddy VPS or cloud server:

### 1. Connect to Your Server
```bash
ssh your-username@newna.ai
```

### 2. Install Node.js and Dependencies
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (if not installed)
sudo apt-get install nginx
```

### 3. Upload Your Application
```bash
# Create app directory
mkdir -p /var/www/newna.ai
cd /var/www/newna.ai

# Upload files (from your local machine)
scp -r /home/sabro/ollama-chat-app/* your-username@newna.ai:/var/www/newna.ai/
```

### 4. Install Dependencies
```bash
cd /var/www/newna.ai
npm install --production
```

### 5. Configure Environment
Create production environment file:
```bash
nano .env.production
```

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=generate-very-long-random-string-here
JWT_SECRET=another-very-long-random-string-here
DATABASE_PATH=./production.db

# Ollama configuration (see options below)
OLLAMA_HOST=https://your-ollama-server.com
```

### 6. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/newna.ai
```

```nginx
server {
    listen 80;
    server_name newna.ai www.newna.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/newna.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Set Up SSL with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d newna.ai -d www.newna.ai
```

### 8. Start Application with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Option 2: Static Frontend Only (Limited Functionality)

If you only have basic GoDaddy hosting, deploy just the frontend:

### 1. Create Static Version
Create a modified version that connects to a remote Ollama API:

```javascript
// In public/config.js
window.OLLAMA_API = 'https://your-ollama-api.com';
```

### 2. Upload Files via FTP
Upload only the public folder contents to your GoDaddy hosting.

## Ollama Backend Options

### Option A: Home Server with Cloudflare Tunnel
1. Install Cloudflare Tunnel on your home server
2. Expose Ollama safely:
```bash
cloudflared tunnel create ollama-tunnel
cloudflared tunnel route dns ollama-tunnel ollama.newna.ai
cloudflared tunnel run --url http://localhost:11434 ollama-tunnel
```

### Option B: Cloud Ollama Instance
Deploy Ollama on a cloud provider:
- DigitalOcean GPU Droplet
- AWS EC2 with GPU
- Google Cloud with GPU
- Paperspace

### Option C: Ollama API Service
Use a managed Ollama API service (if available).

## Security Configuration

### 1. Update CORS Settings
In server.js, update CORS for your domain:
```javascript
app.use(cors({
    origin: ['https://newna.ai', 'https://www.newna.ai'],
    credentials: true
}));
```

### 2. Secure Headers
Add security headers in production:
```javascript
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "https://newna.ai"],
                // ... other policies
            }
        }
    }));
}
```

### 3. API Authentication
Implement API key authentication for Ollama access:
```javascript
// Add to server.js
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

// Verify API key in requests
function verifyApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== OLLAMA_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
}
```

## Database Migration

### 1. Export Local Data (Optional)
```bash
sqlite3 chat.db .dump > backup.sql
```

### 2. Import on Server
```bash
sqlite3 production.db < backup.sql
```

## Monitoring and Maintenance

### 1. Set Up Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. View Logs
```bash
pm2 logs ollama-chat
pm2 monit
```

### 3. Auto-Restart on Reboot
```bash
pm2 startup
pm2 save
```

## Testing Your Deployment

1. **Check HTTPS**: https://newna.ai should load with valid SSL
2. **Test WebSocket**: Check browser console for WebSocket connection
3. **Test Chat**: Send a message and verify Ollama responds
4. **Test Authentication**: Create account and login
5. **Test Meeting Features**: Verify microphone access works

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**
   - Check if Node.js app is running: `pm2 status`
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

2. **Ollama Connection Failed**
   - Verify Ollama is accessible from server
   - Check firewall rules
   - Verify OLLAMA_HOST in .env

3. **Database Errors**
   - Check file permissions: `chmod 644 production.db`
   - Verify database path in .env

4. **SSL Issues**
   - Renew certificate: `sudo certbot renew`
   - Check Nginx SSL configuration

## Quick Start Script

Save this as `deploy.sh` on your server:

```bash
#!/bin/bash
cd /var/www/newna.ai
git pull origin main
npm install --production
pm2 restart ollama-chat
echo "Deployment complete!"
```

Make it executable: `chmod +x deploy.sh`

## Important Notes

1. **Costs**: Running Ollama requires significant compute resources (GPU preferred)
2. **Security**: Always use HTTPS and secure your Ollama endpoint
3. **Backup**: Regular backups of your database
4. **Updates**: Keep your dependencies updated for security

## Alternative: Docker Deployment

If GoDaddy supports Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t newna-chat .
docker run -d -p 3000:3000 --env-file .env.production newna-chat
```