#!/bin/bash

echo "=== Quick Fix for OLLAMA_HOST ==="
echo ""
echo "This will update OLLAMA_HOST to use your Cloudflare tunnel"
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"
TUNNEL_URL="https://soma-psychology-efficiency-micro.trycloudflare.com"

echo "Commands to run after SSHing to your VPS:"
echo ""
echo "ssh ${VPS_USER}@${VPS_IP}"
echo ""
echo "Then copy and paste these commands:"
echo ""
cat << 'EOF'
cd /var/www/newna.ai/chat

# Backup current .env
cp .env .env.backup

# Update OLLAMA_HOST
sed -i 's|OLLAMA_HOST=http://localhost:11434|OLLAMA_HOST=https://soma-psychology-efficiency-micro.trycloudflare.com|' .env

# Verify the change
echo "Updated .env:"
grep OLLAMA_HOST .env

# Restart the application
pm2 restart all

# Wait a moment
sleep 3

# Check if it's working
echo ""
echo "Testing models endpoint..."
curl -s http://localhost:3000/api/models | head -20

# Check logs for errors
echo ""
echo "Recent logs:"
pm2 logs --nostream --lines 10

exit
EOF

echo ""
echo "After running these commands, test at: http://$VPS_IP/"