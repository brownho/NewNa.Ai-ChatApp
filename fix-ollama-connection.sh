#!/bin/bash

echo "=== Fix Ollama Connection on VPS ==="
echo ""
echo "The app on your VPS needs to connect to Ollama."
echo ""
echo "You have 3 options:"
echo ""
echo "1. Use Cloudflare Tunnel (Recommended - Free)"
echo "2. Use ngrok (Easy but requires account)"  
echo "3. Install Ollama on VPS (Not recommended - uses VPS resources)"
echo ""
echo "Which option? (1/2/3): "
read OPTION

VPS_IP="184.168.22.79"
VPS_USER="brownho"

case $OPTION in
  1)
    echo ""
    echo "=== Setting up Cloudflare Tunnel ==="
    echo ""
    echo "First, we need to set up Cloudflare Tunnel on your LOCAL machine"
    echo ""
    
    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
      echo "Installing cloudflared..."
      echo ""
      echo "Run this command:"
      echo ""
      echo "For Ubuntu/Debian:"
      echo "curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb"
      echo "sudo dpkg -i cloudflared.deb"
      echo ""
      echo "For other systems, visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
      echo ""
      echo "After installing, run this script again."
      exit 1
    fi
    
    echo "Starting Cloudflare tunnel for Ollama..."
    echo ""
    echo "Run this command in a new terminal on your LOCAL machine:"
    echo ""
    echo "cloudflared tunnel --url http://localhost:11434"
    echo ""
    echo "It will give you a URL like: https://xxxxx.trycloudflare.com"
    echo ""
    echo "Enter that URL here (or press Ctrl+C to cancel): "
    read TUNNEL_URL
    
    # Update VPS environment
    echo ""
    echo "Updating VPS configuration..."
    
    ssh ${VPS_USER}@${VPS_IP} << EOF
cd /var/www/newna.ai/chat

# Update .env file
echo "Updating environment variables..."
if grep -q "OLLAMA_HOST" .env 2>/dev/null; then
  sed -i "s|OLLAMA_HOST=.*|OLLAMA_HOST=${TUNNEL_URL}|" .env
else
  echo "OLLAMA_HOST=${TUNNEL_URL}" >> .env
fi

# Update server.js to use OLLAMA_HOST
echo "Updating server.js..."
sed -i "s|http://localhost:11434|${TUNNEL_URL}|g" server.js

# Restart app
echo "Restarting app..."
pm2 restart all

echo "Done!"
EOF

    echo ""
    echo "✅ Ollama connection configured!"
    echo ""
    echo "IMPORTANT: Keep the cloudflared tunnel running on your local machine!"
    echo "The tunnel command: cloudflared tunnel --url http://localhost:11434"
    ;;
    
  2)
    echo ""
    echo "=== Setting up ngrok ==="
    echo ""
    echo "1. Sign up at https://ngrok.com (free)"
    echo "2. Install ngrok on your LOCAL machine"
    echo "3. Run: ngrok http 11434"
    echo "4. Copy the URL (like https://xxxx.ngrok.io)"
    echo ""
    echo "Enter your ngrok URL: "
    read NGROK_URL
    
    # Update VPS
    ssh ${VPS_USER}@${VPS_IP} << EOF
cd /var/www/newna.ai/chat

# Update server.js
sed -i "s|http://localhost:11434|${NGROK_URL}|g" server.js

# Restart app
pm2 restart all
EOF

    echo "✅ Done! Keep ngrok running on your local machine."
    ;;
    
  3)
    echo ""
    echo "=== Installing Ollama on VPS ==="
    echo ""
    echo "WARNING: This will use VPS resources and may be slow!"
    echo "Continue? (y/n): "
    read CONFIRM
    
    if [ "$CONFIRM" = "y" ]; then
      ssh ${VPS_USER}@${VPS_IP} << 'EOF'
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve &

# Wait for Ollama to start
sleep 5

# Pull a model (this will take time and bandwidth)
echo "Pulling llama2 model (this may take a while)..."
ollama pull llama2

# No need to change server.js as it already points to localhost:11434

# Restart app
cd /var/www/newna.ai/chat
pm2 restart all
EOF
    fi
    ;;
esac

# Test the connection
echo ""
echo "Testing model loading..."
curl -s http://$VPS_IP/api/models | python3 -m json.tool 2>/dev/null || curl -s http://$VPS_IP/api/models

echo ""
echo "If models are showing, it's working!"
echo "Visit: http://$VPS_IP/"