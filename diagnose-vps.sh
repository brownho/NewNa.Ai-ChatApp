#!/bin/bash

echo "=== VPS Diagnostic Script ==="
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"

echo "This script will SSH into your VPS and check:"
echo "1. If Node.js is installed"
echo "2. If PM2 is running"
echo "3. If the app files exist"
echo "4. What errors are occurring"
echo ""
echo "You'll need to enter your password when prompted."
echo "Press Enter to continue..."
read

# Create remote diagnostic script
cat > /tmp/diagnose-remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash

echo "=== Running diagnostics on VPS ==="
echo ""

# 1. Check Node.js
echo "1. Node.js version:"
node --version 2>/dev/null || echo "   ❌ Node.js not installed"
echo ""

# 2. Check PM2
echo "2. PM2 status:"
pm2 --version 2>/dev/null || echo "   ❌ PM2 not installed"
echo ""

# 3. List PM2 processes
echo "3. PM2 processes:"
pm2 list 2>/dev/null || echo "   No PM2 processes"
echo ""

# 4. Check if app directory exists
echo "4. App directory:"
if [ -d /var/www/newna.ai/chat ]; then
    echo "   ✅ Directory exists"
    echo "   Files:"
    ls -la /var/www/newna.ai/chat/ | head -10
else
    echo "   ❌ Directory not found"
fi
echo ""

# 5. Check if main files exist
echo "5. Key files:"
for file in server.js server-chat.js package.json .env; do
    if [ -f /var/www/newna.ai/chat/$file ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file missing"
    fi
done
echo ""

# 6. Check Nginx config
echo "6. Nginx configuration:"
if [ -f /etc/nginx/sites-enabled/newna.ai ]; then
    echo "   ✅ Nginx config exists"
    grep -E "location|proxy_pass" /etc/nginx/sites-enabled/newna.ai | head -10
else
    echo "   ❌ Nginx config missing"
fi
echo ""

# 7. Try to start the app
echo "7. Attempting to start app:"
cd /var/www/newna.ai/chat 2>/dev/null

if [ -f server-chat.js ]; then
    echo "   Starting with server-chat.js..."
    pm2 start server-chat.js --name newna-chat 2>&1 | tail -5
elif [ -f server.js ]; then
    echo "   Starting with server.js..."
    pm2 start server.js --name newna-chat 2>&1 | tail -5
else
    echo "   ❌ No server file found"
fi
echo ""

# 8. Check PM2 logs
echo "8. Recent PM2 logs:"
pm2 logs --nostream --lines 10 2>/dev/null || echo "   No logs available"
echo ""

# 9. Check Node modules
echo "9. Node modules:"
if [ -d /var/www/newna.ai/chat/node_modules ]; then
    echo "   ✅ node_modules exists"
    echo "   Packages: $(ls /var/www/newna.ai/chat/node_modules | wc -l)"
else
    echo "   ❌ node_modules missing - need to run npm install"
fi
echo ""

# 10. Port check
echo "10. Port 3000 status:"
sudo netstat -tlnp | grep :3000 || echo "   Port 3000 not in use"

REMOTE_SCRIPT

# Copy and run diagnostic script on VPS
echo "Copying diagnostic script to VPS..."
scp /tmp/diagnose-remote.sh $VPS_USER@$VPS_IP:/tmp/

echo ""
echo "Running diagnostics on VPS..."
ssh $VPS_USER@$VPS_IP "bash /tmp/diagnose-remote.sh"

# Cleanup
rm /tmp/diagnose-remote.sh
ssh $VPS_USER@$VPS_IP "rm /tmp/diagnose-remote.sh" 2>/dev/null

echo ""
echo "=== Diagnostic complete ==="
echo ""
echo "Common fixes:"
echo "1. If Node.js missing: ssh $VPS_USER@$VPS_IP 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs'"
echo "2. If PM2 missing: ssh $VPS_USER@$VPS_IP 'sudo npm install -g pm2'"
echo "3. If node_modules missing: ssh $VPS_USER@$VPS_IP 'cd /var/www/newna.ai/chat && npm install'"
echo "4. If app won't start: Check the error logs above"