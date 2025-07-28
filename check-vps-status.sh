#!/bin/bash

echo "=== Checking VPS Status ==="
echo ""

VPS_IP="184.168.22.79"
VPS_USER="brownho"

echo "1. Testing main site:"
curl -s -I http://$VPS_IP | head -3

echo ""
echo "2. Testing /chat path:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$VPS_IP/chat)
echo "   Status: $STATUS"

if [ "$STATUS" = "502" ]; then
    echo ""
    echo "⚠️  App is not running. To fix:"
    echo ""
    echo "ssh $VPS_USER@$VPS_IP"
    echo "cd /var/www/newna.ai/chat"
    echo "pm2 list"
    echo "pm2 start server-chat.js --name newna-chat"
    echo "pm2 logs"
elif [ "$STATUS" = "200" ]; then
    echo "✅ Chat app is running!"
fi

echo ""
echo "3. DNS Status:"
CURRENT_IP=$(dig +short newna.ai | head -1)
if [ "$CURRENT_IP" = "$VPS_IP" ]; then
    echo "✅ DNS is updated!"
else
    echo "❌ DNS still points to: $CURRENT_IP"
    echo "   Should point to: $VPS_IP"
fi