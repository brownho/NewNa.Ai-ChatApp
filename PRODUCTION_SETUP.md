# Production Setup Guide for Ollama Chat App

This guide covers setting up the Ollama Chat App in a production environment with HTTPS support for microphone access and secure authentication.

## Prerequisites

- Domain name pointing to your server
- Linux server (Ubuntu/Debian recommended)
- Node.js 18+ installed
- Ollama installed and running
- SSL certificate (Let's Encrypt recommended)

## Option 1: Nginx Reverse Proxy with Let's Encrypt (Recommended)

### 1. Install Nginx and Certbot

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/ollama-chat
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ollama-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot will automatically configure HTTPS for your domain.

### 4. Update Application Configuration

Create a `.env` file in your app directory:

```bash
NODE_ENV=production
SESSION_SECRET=your-very-long-random-string-here
JWT_SECRET=another-very-long-random-string-here
PORT=3000
OLLAMA_HOST=http://localhost:11434
```

### 5. Update server.js for Production

```javascript
// At the top of server.js, add:
require('dotenv').config();

// Update session configuration:
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Update JWT secret in auth.js:
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
```

### 6. Use PM2 for Process Management

Install PM2:

```bash
npm install -g pm2
```

Create ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'ollama-chat',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Option 2: Caddy Server (Automatic HTTPS)

### 1. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 2. Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

### 3. Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

Caddy automatically obtains and renews SSL certificates!

## Option 3: Direct HTTPS in Node.js

### 1. Generate SSL Certificates

For production, use Let's Encrypt:

```bash
sudo certbot certonly --standalone -d your-domain.com
```

### 2. Update server.js

```javascript
const https = require('https');
const fs = require('fs');

// Add HTTPS support
if (process.env.NODE_ENV === 'production') {
    const httpsOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/your-domain.com/fullchain.pem')
    };
    
    https.createServer(httpsOptions, app).listen(443, () => {
        console.log('HTTPS Server running on port 443');
    });
    
    // Redirect HTTP to HTTPS
    const http = require('http');
    http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(80);
} else {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}
```

## Security Hardening

### 1. Install Security Headers

```bash
npm install helmet
```

Update server.js:

```javascript
const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
            mediaSrc: ["'self'"]
        }
    }
}));
```

### 2. Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Environment Variables

Create `.env.production`:

```
NODE_ENV=production
SESSION_SECRET=generate-with-openssl-rand-base64-32
JWT_SECRET=generate-with-openssl-rand-base64-32
DATABASE_PATH=./production.db
OLLAMA_HOST=http://localhost:11434
ALLOWED_ORIGINS=https://your-domain.com
MAX_FILE_SIZE=10485760
DAILY_MESSAGE_LIMIT=100
```

## Database Backup

Set up automated backups:

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/ollama-chat"
mkdir -p $BACKUP_DIR
cp /path/to/chat.db "$BACKUP_DIR/chat-$(date +%Y%m%d-%H%M%S).db"
# Keep only last 7 days
find $BACKUP_DIR -name "chat-*.db" -mtime +7 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/backup.sh
```

## Monitoring

### 1. Application Logs

View PM2 logs:

```bash
pm2 logs ollama-chat
pm2 monit
```

### 2. System Monitoring

Install monitoring tools:

```bash
# Netdata (recommended)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Or Prometheus + Grafana
# See separate guide for setup
```

## Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Microphone Not Working

1. Ensure HTTPS is properly configured
2. Check browser console for errors
3. Verify SSL certificate is valid: `https://your-domain.com`

### Session Issues

1. Check session store is persistent
2. Verify cookie settings match domain
3. Ensure secure flag is set for HTTPS

### Performance Issues

1. Enable Node.js clustering
2. Use Redis for session storage
3. Implement caching strategies

## Maintenance

### SSL Certificate Renewal

For Let's Encrypt (auto-renewal):

```bash
sudo certbot renew --dry-run
```

### Updates

```bash
# Backup first
cp -r /path/to/app /path/to/app.backup

# Update application
git pull origin main
npm install
pm2 restart ollama-chat
```

## Docker Deployment (Alternative)

See `Dockerfile` and `docker-compose.yml` in the repository for containerized deployment.

## Cloud Deployment Options

- **AWS EC2**: Use with Application Load Balancer for SSL
- **Google Cloud Run**: Automatic HTTPS and scaling
- **Azure App Service**: Built-in SSL support
- **DigitalOcean App Platform**: Automatic HTTPS

For detailed cloud deployment guides, see the respective documentation in the `/docs` folder.