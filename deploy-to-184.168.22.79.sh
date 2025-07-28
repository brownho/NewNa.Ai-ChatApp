#!/bin/bash

# Deployment script for newna.ai VPS (184.168.22.79)

echo "=== Deploying NewNa.AI to GoDaddy VPS ==="
echo "Server: 184.168.22.79"
echo ""

# Variables
VPS_IP="184.168.22.79"
VPS_USER="${1:-root}"  # Default to root if not specified
APP_DIR="/var/www/newna.ai"

if [ "$VPS_USER" = "root" ]; then
    echo "Using root user. If you have a different username, run:"
    echo "./deploy-to-184.168.22.79.sh YOUR_USERNAME"
    echo ""
fi

echo "This script will:"
echo "1. Upload your app to the VPS"
echo "2. Install Node.js, Nginx, and SSL"
echo "3. Configure everything automatically"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Step 1: Test SSH connection
echo "Testing SSH connection..."
ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_IP} "echo 'SSH connection successful!'" || {
    echo ""
    echo "❌ Cannot connect to VPS via SSH"
    echo ""
    echo "Please try:"
    echo "1. Check if SSH is enabled on your VPS"
    echo "2. Check username (try 'root' or your custom username)"
    echo "3. You may need to set up SSH keys or enable password authentication"
    echo ""
    echo "Try manually: ssh ${VPS_USER}@${VPS_IP}"
    exit 1
}

# Step 2: Create deployment package
echo ""
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

# Step 3: Create setup script
cat > deploy-package/setup.sh << 'SETUP_SCRIPT'
#!/bin/bash

echo "=== Setting up NewNa.AI Server ==="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected: $OS $VER"

# Install Node.js
echo "Installing Node.js..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo apt-get install -y nginx certbot python3-certbot-nginx
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
    sudo yum install -y nginx certbot python3-certbot-nginx
fi

# Install PM2
sudo npm install -g pm2

# Create directories
sudo mkdir -p /var/www/newna.ai
sudo chown -R $USER:$USER /var/www/newna.ai

echo "✓ Server setup complete"
SETUP_SCRIPT

chmod +x deploy-package/setup.sh

# Step 4: Create Nginx config
cat > deploy-package/nginx.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name newna.ai www.newna.ai 184.168.22.79;

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
        proxy_read_timeout 86400;
    }

    client_max_body_size 10M;
}
NGINX_CONFIG

# Step 5: Upload to VPS
echo ""
echo "Uploading files to VPS..."
scp -r deploy-package/* ${VPS_USER}@${VPS_IP}:~/ || {
    echo "❌ Failed to upload files"
    echo "Please check your SSH access"
    exit 1
}

# Step 6: Execute setup on VPS
echo ""
echo "Running setup on VPS..."

ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_COMMANDS'
# Run setup script
cd ~
bash setup.sh

# Move files to web directory
sudo mkdir -p /var/www/newna.ai
sudo mv ~/*.js ~/package*.json ~/public ~/traffic-monitor ~/uploads ~/logs /var/www/newna.ai/
sudo mv ~/.env /var/www/newna.ai/
sudo mv ~/ecosystem.config.js /var/www/newna.ai/

# Install dependencies
cd /var/www/newna.ai
npm install --production

# Configure Nginx
sudo cp ~/nginx.conf /etc/nginx/sites-available/newna.ai
sudo ln -sf /etc/nginx/sites-available/newna.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Configure firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    echo "y" | sudo ufw enable
fi

# Start app with PM2
cd /var/www/newna.ai
pm2 stop all
pm2 start ecosystem.config.js --name newna-chat --env production
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER

# Generate secure secrets
echo ""
echo "Generating secure secrets..."
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Update .env file
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

# Restart app
pm2 restart newna-chat

echo ""
echo "✓ Deployment complete!"
REMOTE_COMMANDS

# Step 7: Set up SSL
echo ""
echo "Setting up SSL certificate..."
echo "You'll be prompted to enter your email and agree to terms."
echo ""

ssh -t ${VPS_USER}@${VPS_IP} "sudo certbot --nginx -d newna.ai -d www.newna.ai" || {
    echo ""
    echo "⚠️  SSL setup requires that your domain (newna.ai) points to ${VPS_IP}"
    echo "Please update your DNS settings in GoDaddy first."
}

# Step 8: Setup Ollama tunnel
echo ""
echo "=== Ollama Setup ==="
echo ""
echo "Your app is deployed! Now you need to connect it to Ollama."
echo ""
echo "Option 1: Run Cloudflare tunnel on your local machine:"
echo "  ./quick-cloudflare-setup.sh"
echo ""
echo "Option 2: Install Ollama directly on the VPS (requires GPU)"
echo ""
echo "After setting up Ollama, update the OLLAMA_HOST in your VPS:"
echo "  ssh ${VPS_USER}@${VPS_IP}"
echo "  cd /var/www/newna.ai"
echo "  nano .env"
echo "  # Update OLLAMA_HOST=your-ollama-url"
echo "  pm2 restart newna-chat"
echo ""

# Cleanup
rm -rf deploy-package

echo "=== Deployment Summary ==="
echo ""
echo "✓ App deployed to: ${VPS_IP}"
echo "✓ Nginx configured"
echo "✓ PM2 process manager running"
echo "✓ SSL certificate (if domain is pointed)"
echo ""
echo "Access your site:"
echo "- IP: http://${VPS_IP}"
echo "- Domain: https://newna.ai (after DNS update)"
echo ""
echo "Useful commands:"
echo "- SSH to VPS: ssh ${VPS_USER}@${VPS_IP}"
echo "- View logs: ssh ${VPS_USER}@${VPS_IP} 'pm2 logs newna-chat'"
echo "- Restart app: ssh ${VPS_USER}@${VPS_IP} 'pm2 restart newna-chat'"
echo "- Monitor: ssh ${VPS_USER}@${VPS_IP} 'pm2 monit'"
echo ""
echo "Next steps:"
echo "1. Update DNS in GoDaddy to point to ${VPS_IP}"
echo "2. Set up Ollama connection"
echo "3. Test your chatbot!"