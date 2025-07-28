#!/bin/bash

# GoDaddy VPS Deployment Script for NewNa.AI
# This script helps deploy your chat app to a GoDaddy VPS

echo "=== GoDaddy VPS Deployment Script ==="
echo ""

# Check if we have required parameters
if [ $# -lt 2 ]; then
    echo "Usage: ./godaddy-vps-deploy.sh <username> <server-ip>"
    echo "Example: ./godaddy-vps-deploy.sh root 192.168.1.100"
    exit 1
fi

SSH_USER=$1
SERVER_IP=$2
REMOTE_PATH="/var/www/newna.ai"

echo "Deploying to: $SSH_USER@$SERVER_IP"
echo ""

# Step 1: Prepare deployment package
echo "1. Preparing deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy necessary files
cp -r public deploy-package/
cp -r traffic-monitor deploy-package/
cp *.js deploy-package/
cp package*.json deploy-package/
cp ecosystem.config.js deploy-package/
cp .env.production deploy-package/.env

# Create required directories
mkdir -p deploy-package/uploads
mkdir -p deploy-package/logs

echo "   ✓ Package prepared"
echo ""

# Step 2: Create server setup script
cat > deploy-package/server-setup.sh << 'EOF'
#!/bin/bash

echo "=== Setting up NewNa.AI on server ==="

# Update system
sudo apt-get update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global packages
sudo npm install -g pm2

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

# Install certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Create app directory
sudo mkdir -p /var/www/newna.ai
sudo chown $USER:$USER /var/www/newna.ai

echo "✓ Server dependencies installed"
EOF

chmod +x deploy-package/server-setup.sh

# Step 3: Create Nginx configuration
cat > deploy-package/newna.ai.nginx << 'EOF'
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
        
        # WebSocket support
        proxy_read_timeout 86400;
    }

    # File upload size
    client_max_body_size 10M;
}
EOF

# Step 4: Upload to server
echo "2. Uploading to server..."
echo "   You may be prompted for your password"
echo ""

# Create remote directory
ssh $SSH_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Upload files
scp -r deploy-package/* $SSH_USER@$SERVER_IP:$REMOTE_PATH/

echo "   ✓ Files uploaded"
echo ""

# Step 5: Run setup on server
echo "3. Running server setup..."
ssh $SSH_USER@$SERVER_IP "cd $REMOTE_PATH && bash server-setup.sh"

echo ""
echo "4. Installing Node.js dependencies..."
ssh $SSH_USER@$SERVER_IP "cd $REMOTE_PATH && npm install --production"

echo ""
echo "5. Setting up Nginx..."
ssh $SSH_USER@$SERVER_IP "sudo cp $REMOTE_PATH/newna.ai.nginx /etc/nginx/sites-available/newna.ai"
ssh $SSH_USER@$SERVER_IP "sudo ln -sf /etc/nginx/sites-available/newna.ai /etc/nginx/sites-enabled/"
ssh $SSH_USER@$SERVER_IP "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "6. Starting application with PM2..."
ssh $SSH_USER@$SERVER_IP "cd $REMOTE_PATH && pm2 stop newna-chat 2>/dev/null || true"
ssh $SSH_USER@$SERVER_IP "cd $REMOTE_PATH && pm2 start ecosystem.config.js --name newna-chat --env production"
ssh $SSH_USER@$SERVER_IP "pm2 save && pm2 startup | grep 'sudo' | bash"

echo ""
echo "7. Setting up SSL with Let's Encrypt..."
echo "   Please follow the prompts to set up SSL"
ssh -t $SSH_USER@$SERVER_IP "sudo certbot --nginx -d newna.ai -d www.newna.ai"

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Next steps:"
echo "1. Update .env file with secure secrets:"
echo "   ssh $SSH_USER@$SERVER_IP"
echo "   cd $REMOTE_PATH"
echo "   nano .env"
echo ""
echo "2. Set up Ollama connectivity:"
echo "   - Run ./setup-ollama-tunnel.sh locally"
echo "   - Update OLLAMA_HOST in server's .env"
echo "   - Restart: pm2 restart newna-chat"
echo ""
echo "3. Test your site:"
echo "   https://newna.ai"
echo ""
echo "Useful commands:"
echo "- View logs: ssh $SSH_USER@$SERVER_IP 'pm2 logs newna-chat'"
echo "- Restart app: ssh $SSH_USER@$SERVER_IP 'pm2 restart newna-chat'"
echo "- Monitor: ssh $SSH_USER@$SERVER_IP 'pm2 monit'"

# Cleanup
rm -rf deploy-package