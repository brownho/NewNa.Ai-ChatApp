#!/bin/bash

# Quick deployment script for GoDaddy

echo "=== NewNa.AI Deployment Helper ==="
echo ""

# Check if we have the required information
if [ -z "$1" ]; then
    echo "Usage: ./deploy-to-godaddy.sh <ssh-user@newna.ai>"
    echo "Example: ./deploy-to-godaddy.sh myuser@newna.ai"
    exit 1
fi

SSH_TARGET=$1
REMOTE_PATH="/var/www/newna.ai"

echo "Deploying to: $SSH_TARGET"
echo "Remote path: $REMOTE_PATH"
echo ""

# Create deployment package
echo "1. Creating deployment package..."
rm -rf dist
mkdir -p dist

# Copy necessary files
cp -r public dist/
cp -r traffic-monitor dist/
cp *.js dist/
cp package*.json dist/
cp ecosystem.config.js dist/
cp .env.production dist/.env
cp -r certs dist/ 2>/dev/null || true

# Create uploads directory
mkdir -p dist/uploads

echo "2. Package created in ./dist"
echo ""

echo "3. Uploading to server..."
ssh $SSH_TARGET "mkdir -p $REMOTE_PATH"
scp -r dist/* $SSH_TARGET:$REMOTE_PATH/

echo ""
echo "4. Installing dependencies on server..."
ssh $SSH_TARGET "cd $REMOTE_PATH && npm install --production"

echo ""
echo "5. Setting up PM2..."
ssh $SSH_TARGET "cd $REMOTE_PATH && pm2 stop ollama-chat 2>/dev/null || true"
ssh $SSH_TARGET "cd $REMOTE_PATH && pm2 start ecosystem.config.js --env production"
ssh $SSH_TARGET "pm2 save"

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Next steps:"
echo "1. Set up Ollama connectivity (run ./setup-ollama-tunnel.sh)"
echo "2. Configure Nginx for your domain"
echo "3. Set up SSL with Let's Encrypt"
echo "4. Update .env with your secrets"
echo ""
echo "Test your deployment:"
echo "  https://newna.ai"