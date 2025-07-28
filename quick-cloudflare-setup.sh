#!/bin/bash

echo "=== Quick Cloudflare Tunnel Setup for Ollama ==="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

echo "Starting quick tunnel to Ollama..."
echo ""
echo "This will create a temporary tunnel. For permanent setup, use:"
echo "cloudflared tunnel login"
echo "cloudflared tunnel create newna-ollama"
echo ""
echo "Starting tunnel..."
echo ""

# Run tunnel in background and capture output
cloudflared tunnel --url http://localhost:11434 2>&1 | tee tunnel.log &
TUNNEL_PID=$!

echo "Waiting for tunnel to start..."
sleep 5

# Extract the tunnel URL
TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' tunnel.log | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "=== Tunnel Started Successfully! ==="
    echo ""
    echo "Your Ollama URL: $TUNNEL_URL"
    echo ""
    echo "Next steps:"
    echo "1. Copy this URL: $TUNNEL_URL"
    echo "2. Update your Vercel environment variable:"
    echo "   vercel env rm OLLAMA_HOST production"
    echo "   vercel env add OLLAMA_HOST production"
    echo "   (paste the URL when prompted)"
    echo "3. Redeploy: vercel --prod"
    echo ""
    echo "Press Ctrl+C to stop the tunnel"
    echo ""
    
    # Keep script running
    wait $TUNNEL_PID
else
    echo "Failed to start tunnel. Check if Ollama is running on port 11434"
    kill $TUNNEL_PID 2>/dev/null
fi