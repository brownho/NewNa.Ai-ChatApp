#!/bin/bash

echo "=== Quick Ollama Setup for VPS ==="
echo ""
echo "This will configure your VPS to use environment variables for Ollama"
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"

# First, update the local server.js to use environment variable
echo "Updating server.js to use OLLAMA_HOST environment variable..."

# Create a backup
cp server.js server.js.backup

# Update server.js to use environment variable
cat > update-server.js << 'EOF'
const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// Replace all hardcoded Ollama URLs with environment variable
content = content.replace(
  /http:\/\/localhost:11434/g,
  "process.env.OLLAMA_HOST || 'http://localhost:11434'"
);

fs.writeFileSync('server.js', content);
console.log('Updated server.js to use OLLAMA_HOST environment variable');
EOF

node update-server.js
rm update-server.js

echo "✅ Local server.js updated"
echo ""

# Now create a setup script for the VPS
cat > setup-ollama-remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash

cd /var/www/newna.ai/chat

echo "Current directory: $(pwd)"
echo ""

# Check current .env
echo "Current .env contents:"
cat .env 2>/dev/null || echo "No .env file found"
echo ""

# Update .env with OLLAMA_HOST placeholder
echo "Updating .env file..."
if [ -f .env ]; then
  # Remove existing OLLAMA_HOST if present
  grep -v "OLLAMA_HOST" .env > .env.tmp
  mv .env.tmp .env
fi

# Add OLLAMA_HOST
echo "OLLAMA_HOST=http://localhost:11434" >> .env

echo ""
echo "Updated .env contents:"
cat .env
echo ""

# Update server.js to use environment variable
echo "Updating server.js..."
sed -i "s|'http://localhost:11434'|process.env.OLLAMA_HOST || 'http://localhost:11434'|g" server.js
sed -i 's|"http://localhost:11434"|process.env.OLLAMA_HOST || "http://localhost:11434"|g' server.js

# Restart the app
echo "Restarting application..."
pm2 restart all

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use Cloudflare Tunnel:"
echo "1. On your local machine: cloudflared tunnel --url http://localhost:11434"
echo "2. Update .env on VPS with: OLLAMA_HOST=https://your-tunnel-url.trycloudflare.com"
echo "3. Restart with: pm2 restart all"

REMOTE_SCRIPT

echo "Uploading updated server.js to VPS..."
scp server.js ${VPS_USER}@${VPS_IP}:/var/www/newna.ai/chat/

echo ""
echo "Running setup on VPS..."
scp setup-ollama-remote.sh ${VPS_USER}@${VPS_IP}:/tmp/
ssh ${VPS_USER}@${VPS_IP} "bash /tmp/setup-ollama-remote.sh"

# Cleanup
rm setup-ollama-remote.sh
ssh ${VPS_USER}@${VPS_IP} "rm /tmp/setup-ollama-remote.sh" 2>/dev/null

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Now you need to expose your local Ollama to the internet."
echo ""
echo "Option 1 - Cloudflare Tunnel (Recommended):"
echo "1. Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
echo "2. Run: cloudflared tunnel --url http://localhost:11434"
echo "3. Copy the URL (like https://xxxxx.trycloudflare.com)"
echo "4. SSH to VPS: ssh ${VPS_USER}@${VPS_IP}"
echo "5. Update .env: cd /var/www/newna.ai/chat && nano .env"
echo "6. Change OLLAMA_HOST to your tunnel URL"
echo "7. Restart: pm2 restart all"
echo ""
echo "Option 2 - Test with SSH Tunnel (Temporary):"
echo "Run this for testing only:"
echo "ssh -R 11434:localhost:11434 ${VPS_USER}@${VPS_IP}"
echo "(Keep this running while testing)"