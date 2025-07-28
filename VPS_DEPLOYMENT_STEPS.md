# GoDaddy VPS Deployment - Quick Start Guide

## Step 1: Find Your VPS Details

Log into GoDaddy and find these details:

1. **In GoDaddy**:
   - Go to "My Products"
   - Click on your VPS
   - Click "Manage" or "Dashboard"
   
2. **Find and note down**:
   - **IP Address**: (looks like: 192.168.1.100)
   - **Username**: (usually "root" or custom username)
   - **Operating System**: (Ubuntu, CentOS, etc.)
   - **SSH Port**: (usually 22)

## Step 2: Connect to Your VPS

### Option A: Using Password
```bash
ssh root@YOUR_IP_ADDRESS
```
Example:
```bash
ssh root@192.168.1.100
```

### Option B: Using SSH Key (if configured)
```bash
ssh -i your-key.pem root@YOUR_IP_ADDRESS
```

## Step 3: Quick Deployment

Once you're connected to your VPS, run these commands:

### 3.1 Download and Run Automated Setup
```bash
# Download setup script
curl -o setup-newna.sh https://raw.githubusercontent.com/your-repo/setup-script.sh

# Or create it manually
cat > setup-newna.sh << 'EOF'
#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install required packages
apt-get install -y nginx certbot python3-certbot-nginx git pm2

# Create app directory
mkdir -p /var/www/newna.ai
cd /var/www/newna.ai

# Clone or download your app
# You'll need to upload your files here

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name newna-chat
pm2 save
pm2 startup

echo "Basic setup complete!"
EOF

# Make executable and run
chmod +x setup-newna.sh
./setup-newna.sh
```

## Step 4: Upload Your App

From your local machine:
```bash
# Use the deployment script
./godaddy-vps-deploy.sh root YOUR_IP_ADDRESS

# Or manually with scp
scp -r /home/sabro/ollama-chat-app/* root@YOUR_IP:/var/www/newna.ai/
```

## Step 5: Configure Nginx

On your VPS:
```bash
# Create Nginx config
nano /etc/nginx/sites-available/newna.ai
```

Add this configuration:
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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/newna.ai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Step 6: Set Up SSL (HTTPS)

```bash
certbot --nginx -d newna.ai -d www.newna.ai
```

## Step 7: Configure Environment

```bash
cd /var/www/newna.ai
cp .env.production .env
nano .env

# Update these values:
# SESSION_SECRET=<generate-random-string>
# JWT_SECRET=<generate-random-string>
# OLLAMA_HOST=<your-ollama-url>
```

## Step 8: Set Up Ollama Connection

On your LOCAL machine (not VPS):
```bash
# Run Cloudflare tunnel
./quick-cloudflare-setup.sh

# Note the URL it gives you
# Update OLLAMA_HOST in your VPS .env file
```

## Step 9: Start Everything

On your VPS:
```bash
cd /var/www/newna.ai
pm2 restart newna-chat
pm2 logs
```

## Quick Commands Reference

```bash
# Check if app is running
pm2 status

# View logs
pm2 logs newna-chat

# Restart app
pm2 restart newna-chat

# Check Nginx
systemctl status nginx

# Update app
cd /var/www/newna.ai
git pull  # if using git
pm2 restart newna-chat
```

## Troubleshooting

1. **Can't connect via SSH?**
   - Check IP address is correct
   - Ensure VPS is running in GoDaddy panel
   - Try resetting password in GoDaddy

2. **Site not loading?**
   - Check DNS points to VPS IP
   - Verify Nginx is running: `systemctl status nginx`
   - Check app logs: `pm2 logs`

3. **Ollama not connecting?**
   - Ensure Cloudflare tunnel is running locally
   - Verify OLLAMA_HOST in .env
   - Test: `curl YOUR_OLLAMA_URL/api/tags`

## Need Your VPS Details

To help you further, please provide:
1. Your VPS IP address
2. Username (if not root)
3. Operating System (Ubuntu/CentOS)