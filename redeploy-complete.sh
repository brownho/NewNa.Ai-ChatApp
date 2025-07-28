#!/bin/bash

echo "=== Complete Redeployment to VPS ==="
echo ""
echo "This will upload ALL files to ensure nothing is missing"
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"
REMOTE_DIR="/var/www/newna.ai/chat"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "You'll need to enter your VPS password when prompted"
echo "Press Enter to continue..."
read

# Step 1: Create deployment package
echo ""
echo "Creating deployment package..."
rm -rf deploy-complete
mkdir -p deploy-complete

# Copy all necessary files
echo "Copying project files..."
cp -r public deploy-complete/
cp *.js deploy-complete/ 2>/dev/null || true
cp package*.json deploy-complete/
cp .env deploy-complete/ 2>/dev/null || echo "USE_HTTPS=false" > deploy-complete/.env
cp -r traffic-monitor deploy-complete/ 2>/dev/null || true
cp -r uploads deploy-complete/ 2>/dev/null || mkdir deploy-complete/uploads
cp -r logs deploy-complete/ 2>/dev/null || mkdir deploy-complete/logs

# Make sure critical files exist
touch deploy-complete/ollama-chat.db

# Create ecosystem config for PM2
cat > deploy-complete/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'newna-chat',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log'
  }]
}
EOF

# Step 2: Create setup script
cat > deploy-complete/setup.sh << 'SETUP_SCRIPT'
#!/bin/bash

echo "Setting up application on VPS..."

# Ensure directories exist
sudo mkdir -p /var/www/newna.ai/chat
sudo chown -R $USER:$USER /var/www/newna.ai

# Move files to final location
echo "Moving files to /var/www/newna.ai/chat..."
cd ~
sudo rm -rf /var/www/newna.ai/chat/*
sudo mv deploy-complete/* /var/www/newna.ai/chat/
sudo mv deploy-complete/.env /var/www/newna.ai/chat/ 2>/dev/null || true

# Set permissions
cd /var/www/newna.ai/chat
sudo chown -R $USER:$USER .
chmod -R 755 public
chmod -R 755 uploads
chmod -R 755 logs

# Install dependencies
echo "Installing dependencies..."
npm install

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start the application
echo "Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

# Show status
pm2 status

echo "✅ Setup complete!"
SETUP_SCRIPT

chmod +x deploy-complete/setup.sh

# Step 3: Upload to VPS
echo ""
echo -e "${GREEN}Uploading files to VPS...${NC}"
cd deploy-complete
tar -czf ../deploy.tar.gz .
cd ..

scp deploy.tar.gz ${VPS_USER}@${VPS_IP}:~/ || {
    echo -e "${RED}❌ Failed to upload files${NC}"
    exit 1
}

# Step 4: Execute deployment on VPS
echo ""
echo -e "${GREEN}Running deployment on VPS...${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_DEPLOY'
# Extract files
tar -xzf deploy.tar.gz -C ~
rm deploy.tar.gz

# Run setup
bash ~/deploy-complete/setup.sh

# Cleanup
rm -rf ~/deploy-complete

# Test the application
echo ""
echo "Testing application..."
sleep 3
curl -s -o /dev/null -w "Main page: %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "Login page: %{http_code}\n" http://localhost:3000/login.html

# Check PM2 logs
echo ""
echo "Recent logs:"
pm2 logs --nostream --lines 5
REMOTE_DEPLOY

# Cleanup local files
rm -rf deploy-complete deploy.tar.gz

# Final test from local machine
echo ""
echo -e "${GREEN}Testing from your computer...${NC}"
echo "Main page: http://$VPS_IP/"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$VPS_IP/

echo "Login page: http://$VPS_IP/login.html" 
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$VPS_IP/login.html

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Your app is now accessible at:"
echo "- http://$VPS_IP/"
echo "- http://$VPS_IP/login.html"
echo "- http://$VPS_IP/register.html"
echo ""
echo "Once DNS is updated, it will be at:"
echo "- http://newna.ai/"
echo "- https://newna.ai/ (after SSL setup)"