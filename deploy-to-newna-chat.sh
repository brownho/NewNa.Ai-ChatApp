#!/bin/bash

# Deployment script for newna.ai/chat (184.168.22.79)

echo "=== Deploying NewNa.AI Chat to /chat path ==="
echo "Server: 184.168.22.79"
echo "URL: https://newna.ai/chat"
echo ""

# Variables
VPS_IP="184.168.22.79"
VPS_USER="brownho"
APP_DIR="/var/www/newna.ai/chat"

if [ "$VPS_USER" = "root" ]; then
    echo "Using root user. If you have a different username, run:"
    echo "./deploy-to-newna-chat.sh YOUR_USERNAME"
    echo ""
fi

echo "This script will:"
echo "1. Deploy your chat app to newna.ai/chat"
echo "2. Configure Nginx to serve both your main site and chat"
echo "3. Set up everything with proper paths"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Test SSH connection
echo "Testing SSH connection..."
ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_IP} "echo 'SSH connection successful!'" || {
    echo "Cannot connect via SSH. Please check your connection."
    exit 1
}

# Create deployment package
echo "Creating deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy files
cp -r public deploy-package/
cp -r traffic-monitor deploy-package/
cp *.js deploy-package/
cp package*.json deploy-package/
cp ecosystem.config.js deploy-package/
cp .env.production deploy-package/.env
mkdir -p deploy-package/uploads
mkdir -p deploy-package/logs

# Update paths in frontend files for /chat
echo "Updating paths for /chat..."

# Create modified script.js with BASE_PATH
cat > deploy-package/public/script-chat.js << 'EOF'
// Base path configuration for /chat deployment
window.BASE_PATH = '/chat';

// Original script.js content with path updates
EOF
cat public/script.js >> deploy-package/public/script-chat.js

# Update all API calls to use BASE_PATH
sed -i "s|'/api/|BASE_PATH + '/api/|g" deploy-package/public/script-chat.js
sed -i "s|'/auth/|BASE_PATH + '/auth/|g" deploy-package/public/script-chat.js
sed -i "s|'/send-message'|BASE_PATH + '/send-message'|g" deploy-package/public/script-chat.js

# Create server wrapper for /chat path
cat > deploy-package/server-chat.js << 'EOF'
// Wrapper to mount the app at /chat path
const express = require('express');
const app = express();

// Create a router for the chat app
const chatRouter = express.Router();

// Mount the original server on the router
const originalApp = require('./server.js');
chatRouter.use(originalApp);

// Mount the router at /chat
app.use('/chat', chatRouter);

// Serve static files from /chat/public
app.use('/chat', express.static(__dirname + '/public'));

// Health check at root
app.get('/', (req, res) => {
    res.redirect('/chat');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Chat app available at /chat`);
});

module.exports = app;
EOF

# Create setup script
cat > deploy-package/setup.sh << 'SETUP_SCRIPT'
#!/bin/bash

echo "=== Setting up NewNa.AI Server ==="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected: $OS"

# Install Node.js
echo "Installing Node.js..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs nginx certbot python3-certbot-nginx
fi

# Install PM2
sudo npm install -g pm2

# Create directories
sudo mkdir -p /var/www/newna.ai/chat
sudo chown -R $USER:$USER /var/www/newna.ai

echo "✓ Server setup complete"
SETUP_SCRIPT

chmod +x deploy-package/setup.sh

# Create Nginx config that serves both main site and chat
cat > deploy-package/nginx-chat.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name newna.ai www.newna.ai 184.168.22.79;

    # Main website root (if you have one)
    root /var/www/newna.ai/public_html;
    index index.html index.htm;

    # Main site location
    location / {
        try_files $uri $uri/ =404;
    }

    # Chat application at /chat
    location /chat {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # Important: Pass the original URI
        proxy_set_header X-Original-URI $request_uri;
    }

    # Ensure WebSocket works for /chat
    location /chat/ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    client_max_body_size 10M;
}
NGINX_CONFIG

# Update HTML files to use correct paths
for file in deploy-package/public/*.html; do
    if [ -f "$file" ]; then
        # Update script and style references
        sed -i 's|href="styles\.css"|href="/chat/styles.css"|g' "$file"
        sed -i 's|src="script\.js"|src="/chat/script-chat.js"|g' "$file"
        sed -i 's|src="\([^"]*\.js\)"|src="/chat/\1"|g' "$file"
        sed -i 's|href="\([^"]*\.css\)"|href="/chat/\1"|g' "$file"
        
        # Update navigation links
        sed -i 's|href="/login\.html"|href="/chat/login.html"|g' "$file"
        sed -i 's|href="/index\.html"|href="/chat/index.html"|g' "$file"
        sed -i 's|href="/"|href="/chat/"|g' "$file"
    fi
done

# Upload to VPS
echo ""
echo "Uploading files to VPS..."
scp -r deploy-package/* ${VPS_USER}@${VPS_IP}:~/ || {
    echo "Failed to upload files"
    exit 1
}

# Execute setup on VPS
echo ""
echo "Setting up on VPS..."

ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_COMMANDS'
# Run setup
cd ~
bash setup.sh

# Create directory structure
sudo mkdir -p /var/www/newna.ai/chat
sudo mkdir -p /var/www/newna.ai/public_html

# Create a simple index page for the main site
sudo tee /var/www/newna.ai/public_html/index.html > /dev/null << 'INDEX'
<!DOCTYPE html>
<html>
<head>
    <title>NewNa.AI</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .button { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #6B46C1; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            font-size: 18px;
            margin: 20px;
        }
        .button:hover { background: #553C9A; }
    </style>
</head>
<body>
    <h1>Welcome to NewNa.AI</h1>
    <p>AI-Powered Solutions</p>
    <a href="/chat" class="button">Launch Chat Assistant</a>
</body>
</html>
INDEX

# Move chat files
sudo mv ~/*.js ~/package*.json ~/public ~/traffic-monitor ~/uploads ~/logs /var/www/newna.ai/chat/
sudo mv ~/.env /var/www/newna.ai/chat/
sudo mv ~/ecosystem.config.js /var/www/newna.ai/chat/

# Install dependencies
cd /var/www/newna.ai/chat
npm install --production

# Update package.json to use server-chat.js
sed -i 's/"main": "server.js"/"main": "server-chat.js"/' package.json

# Configure Nginx
sudo cp ~/nginx-chat.conf /etc/nginx/sites-available/newna.ai
sudo ln -sf /etc/nginx/sites-available/newna.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Configure firewall
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "y" | sudo ufw enable
fi

# Start app with PM2
cd /var/www/newna.ai/chat
pm2 stop all
pm2 start server-chat.js --name newna-chat --env production
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER

# Generate secure secrets
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

# Restart app
pm2 restart newna-chat

echo "✓ Deployment complete!"
REMOTE_COMMANDS

# Set up SSL
echo ""
echo "Setting up SSL certificate..."
ssh -t ${VPS_USER}@${VPS_IP} "sudo certbot --nginx -d newna.ai -d www.newna.ai" || {
    echo "SSL setup requires domain to point to ${VPS_IP}"
}

# Cleanup
rm -rf deploy-package

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Your chat app is now available at:"
echo "✓ http://newna.ai/chat"
echo "✓ https://newna.ai/chat (after SSL setup)"
echo ""
echo "Main site landing page at:"
echo "✓ https://newna.ai"
echo ""
echo "Next steps:"
echo "1. Update DNS in GoDaddy to point to ${VPS_IP}"
echo "2. Set up Ollama connection:"
echo "   - Run: ./quick-cloudflare-setup.sh"
echo "   - Update OLLAMA_HOST on VPS"
echo ""
echo "Management commands:"
echo "- SSH: ssh ${VPS_USER}@${VPS_IP}"
echo "- Logs: ssh ${VPS_USER}@${VPS_IP} 'cd /var/www/newna.ai/chat && pm2 logs'"
echo "- Restart: ssh ${VPS_USER}@${VPS_IP} 'pm2 restart newna-chat'"
