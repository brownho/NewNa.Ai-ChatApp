# Setup Instructions for BrownFi Local LLMs

## 1. Default Model Changed
The default model is now set to `llama2:13b`. If you don't have it installed:
```bash
ollama pull llama2:13b
```

For NVIDIA A10 GPU (24GB VRAM), you can comfortably run:
- llama2:13b (recommended - uses ~10GB VRAM)
- codellama:13b
- mistral:7b
- For larger models, try llama2:70b-chat-q4_0 (quantized version)

## 2. Auto-Start on Boot

### Option A: Using systemd (Recommended for Linux)
```bash
# Copy the service file
sudo cp /home/sabro/ollama-chat-app/brownfi-llm.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable brownfi-llm.service

# Start the service now
sudo systemctl start brownfi-llm.service

# Check status
sudo systemctl status brownfi-llm.service
```

### Option B: Using cron (Alternative)
```bash
# Open crontab
crontab -e

# Add this line:
@reboot /home/sabro/ollama-chat-app/start-on-boot.sh
```

### Option C: Desktop Environment Startup
Add to your desktop environment's startup applications:
- Command: `/home/sabro/ollama-chat-app/start-on-boot.sh`
- Name: BrownFi Local LLMs

## 3. External Network Access

### WARNING: Security Considerations
Exposing this service to the internet can be risky. Only do this if you understand the security implications.

### Option A: Port Forwarding (Home Network)
1. Find your local IP:
   ```bash
   ip addr show | grep inet
   ```
2. In your router settings:
   - Forward external port 3000 to your-local-ip:3000
   - Access via: http://your-public-ip:3000

### Option B: Using ngrok (Temporary Public URL)
```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Start tunnel
ngrok http 3000
```

### Option C: Reverse Proxy with Domain (Advanced)
1. Install nginx:
   ```bash
   sudo apt install nginx
   ```

2. Configure nginx:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Use Let's Encrypt for HTTPS:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option D: Tailscale (Secure Private Network)
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up

# Access from any device on your Tailscale network
# http://your-machine-name:3000
```

### Option E: Cloudflare Tunnel (Free & Secure)
```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create brownfi-llm

# Run tunnel
cloudflared tunnel --url http://localhost:3000
```

## Security Recommendations
1. Add authentication to server.js if exposing externally
2. Use HTTPS for any external access
3. Consider IP whitelisting in your firewall
4. Regularly update all dependencies
5. Monitor access logs

## Checking Service Status
```bash
# If using systemd
sudo journalctl -u brownfi-llm -f

# Check if port is listening
ss -tlnp | grep 3000
```