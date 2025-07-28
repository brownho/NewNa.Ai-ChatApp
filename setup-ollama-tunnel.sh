#!/bin/bash

# Setup script for exposing local Ollama to your newna.ai website

echo "=== Ollama Tunnel Setup for newna.ai ==="
echo ""
echo "Choose your setup method:"
echo "1. Cloudflare Tunnel (Recommended - Free)"
echo "2. ngrok (Easy - May require paid plan)"
echo "3. Direct Port Forward (Requires static IP)"
echo "4. Tailscale (Secure private network)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "=== Setting up Cloudflare Tunnel ==="
        echo ""
        echo "1. Install Cloudflare Tunnel:"
        echo "   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
        echo "   sudo dpkg -i cloudflared-linux-amd64.deb"
        echo ""
        echo "2. Authenticate with Cloudflare:"
        echo "   cloudflared tunnel login"
        echo ""
        echo "3. Create tunnel:"
        echo "   cloudflared tunnel create ollama-newna"
        echo ""
        echo "4. Create config file ~/.cloudflared/config.yml:"
        cat << EOF > cloudflared-config-example.yml
url: http://localhost:11434
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: ollama.newna.ai
    service: http://localhost:11434
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF
        echo ""
        echo "5. Add DNS record in Cloudflare:"
        echo "   Type: CNAME"
        echo "   Name: ollama"
        echo "   Target: YOUR_TUNNEL_ID.cfargotunnel.com"
        echo ""
        echo "6. Run tunnel:"
        echo "   cloudflared tunnel run ollama-newna"
        echo ""
        echo "7. Update your .env.production:"
        echo "   OLLAMA_HOST=https://ollama.newna.ai"
        ;;
        
    2)
        echo ""
        echo "=== Setting up ngrok ==="
        echo ""
        echo "1. Install ngrok:"
        echo "   wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip"
        echo "   unzip ngrok-stable-linux-amd64.zip"
        echo "   sudo mv ngrok /usr/local/bin/"
        echo ""
        echo "2. Create ngrok account and get auth token from:"
        echo "   https://dashboard.ngrok.com/get-started/your-authtoken"
        echo ""
        echo "3. Configure ngrok:"
        echo "   ngrok authtoken YOUR_AUTH_TOKEN"
        echo ""
        echo "4. Start ngrok tunnel:"
        echo "   ngrok http 11434"
        echo ""
        echo "5. Update your .env.production with the ngrok URL"
        ;;
        
    3)
        echo ""
        echo "=== Direct Port Forwarding ==="
        echo ""
        echo "1. Configure your router to forward port 11434 to your local machine"
        echo ""
        echo "2. Get your public IP:"
        curl -s ifconfig.me
        echo ""
        echo ""
        echo "3. Update your .env.production:"
        echo "   OLLAMA_HOST=http://YOUR_PUBLIC_IP:11434"
        echo ""
        echo "⚠️  Security Warning: This exposes Ollama directly to the internet!"
        echo "   Consider using a reverse proxy with authentication."
        ;;
        
    4)
        echo ""
        echo "=== Setting up Tailscale ==="
        echo ""
        echo "1. Install Tailscale:"
        echo "   curl -fsSL https://tailscale.com/install.sh | sh"
        echo ""
        echo "2. Start Tailscale:"
        echo "   sudo tailscale up"
        echo ""
        echo "3. Install Tailscale on your server hosting newna.ai"
        echo ""
        echo "4. Get your machine's Tailscale IP:"
        echo "   tailscale ip -4"
        echo ""
        echo "5. Update your .env.production:"
        echo "   OLLAMA_HOST=http://YOUR_TAILSCALE_IP:11434"
        ;;
esac

echo ""
echo "=== Security Recommendations ==="
echo "1. Add authentication to your Ollama endpoint"
echo "2. Use HTTPS whenever possible"
echo "3. Implement rate limiting"
echo "4. Monitor access logs"
echo "5. Consider using an API key"

echo ""
echo "=== Testing Your Setup ==="
echo "After configuration, test your Ollama endpoint:"
echo ""
echo "curl -X POST YOUR_OLLAMA_URL/api/generate -d '{"
echo '  "model": "llama2",'
echo '  "prompt": "Hello",'
echo '  "stream": false'
echo "}'"