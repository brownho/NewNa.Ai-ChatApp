#!/bin/bash

echo "=== Updating VPS with Ollama Connection ==="
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"
TUNNEL_URL="https://soma-psychology-efficiency-micro.trycloudflare.com"

echo "Using Cloudflare tunnel URL: $TUNNEL_URL"
echo ""

# Upload the corrected server.js
echo "Uploading corrected server.js..."
scp server.js ${VPS_USER}@${VPS_IP}:/var/www/newna.ai/chat/

echo ""
echo "Updating environment on VPS..."

# Update the VPS environment
ssh ${VPS_USER}@${VPS_IP} << EOF
cd /var/www/newna.ai/chat

# Update .env file with the tunnel URL
echo "Updating .env file..."
if grep -q "OLLAMA_HOST" .env 2>/dev/null; then
  sed -i "s|OLLAMA_HOST=.*|OLLAMA_HOST=${TUNNEL_URL}|" .env
else
  echo "OLLAMA_HOST=${TUNNEL_URL}" >> .env
fi

echo ""
echo "Current .env contents:"
cat .env

# Restart the application
echo ""
echo "Restarting application..."
pm2 restart all

# Wait a moment
sleep 3

# Check status
echo ""
echo "Application status:"
pm2 status

# Test the models endpoint
echo ""
echo "Testing models endpoint..."
curl -s http://localhost:3000/api/models | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/models

echo ""
echo "Recent logs:"
pm2 logs --nostream --lines 10
EOF

echo ""
echo "Testing from your local machine..."
echo "Models endpoint: http://$VPS_IP/api/models"
curl -s http://$VPS_IP/api/models | python3 -m json.tool 2>/dev/null || curl -s http://$VPS_IP/api/models

echo ""
echo "✅ Update complete!"
echo ""
echo "IMPORTANT: Keep your Cloudflare tunnel running!"
echo "Command: cloudflared tunnel --url http://localhost:11434"
echo ""
echo "Your app should now load models at: http://$VPS_IP/"