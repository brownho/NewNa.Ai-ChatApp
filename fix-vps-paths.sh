#!/bin/bash

echo "=== Fixing VPS App Paths ==="
echo ""
echo "This script will fix the login.html issue on your VPS"
echo ""
echo "You'll need to enter your VPS password when prompted"
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"

echo "Creating remote fix script..."
cat > /tmp/fix-paths-remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash

echo "Checking current app location..."

# Check where the app actually is
if [ -f /var/www/newna.ai/server.js ]; then
    echo "App is in /var/www/newna.ai/"
    APP_DIR="/var/www/newna.ai"
elif [ -f /var/www/newna.ai/chat/server.js ]; then
    echo "App is in /var/www/newna.ai/chat/"
    APP_DIR="/var/www/newna.ai/chat"
else
    echo "❌ Cannot find app files!"
    exit 1
fi

echo ""
echo "Checking for missing files..."
cd "$APP_DIR"

# Check if login.html is missing from public
if [ ! -f public/login.html ]; then
    echo "❌ login.html is missing from public/"
    
    # Check if it exists in root
    if [ -f login.html ]; then
        echo "Found login.html in root, moving to public/"
        sudo mv login.html public/
    else
        echo "Creating basic login.html..."
        sudo tee public/login.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Ollama Chat</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="auth.css">
</head>
<body>
    <div class="auth-container">
        <h1>Login to Ollama Chat</h1>
        <form id="loginForm">
            <input type="text" id="username" placeholder="Username" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <a href="register.html">Register</a></p>
        <p>Or continue as <a href="/" id="guestLink">Guest</a></p>
    </div>
    <script src="auth.js"></script>
</body>
</html>
EOF
    fi
else
    echo "✅ login.html exists in public/"
fi

# Check other important files
for file in register.html auth.js auth.css styles.css; do
    if [ ! -f public/$file ]; then
        echo "⚠️  public/$file is missing"
    fi
done

echo ""
echo "Restarting app..."
pm2 restart all

echo ""
echo "Checking app status..."
pm2 status

echo ""
echo "Done! Testing endpoints..."
echo "Main page:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
echo ""
echo "Login page:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login.html
echo ""

REMOTE_SCRIPT

# Copy and run fix script
echo ""
echo "Copying fix script to VPS..."
scp /tmp/fix-paths-remote.sh $VPS_USER@$VPS_IP:/tmp/

echo ""
echo "Running fix on VPS..."
ssh $VPS_USER@$VPS_IP "bash /tmp/fix-paths-remote.sh"

# Cleanup
rm /tmp/fix-paths-remote.sh
ssh $VPS_USER@$VPS_IP "rm /tmp/fix-paths-remote.sh" 2>/dev/null

echo ""
echo "Testing from your computer..."
echo "Main page: http://$VPS_IP/"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$VPS_IP/

echo "Login page: http://$VPS_IP/login.html"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$VPS_IP/login.html

echo ""
echo "✅ Fix complete!"
echo ""
echo "You can now access:"
echo "- Main app: http://$VPS_IP/"
echo "- Login: http://$VPS_IP/login.html"
echo "- Register: http://$VPS_IP/register.html"