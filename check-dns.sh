#!/bin/bash

echo "=== Checking DNS for newna.ai ==="
echo ""

TARGET_IP="184.168.22.79"

# Check current DNS
CURRENT_IP=$(dig +short newna.ai | head -1)
WWW_IP=$(dig +short www.newna.ai | head -1)

echo "Current DNS Records:"
echo "newna.ai → $CURRENT_IP"
echo "www.newna.ai → $WWW_IP"
echo ""

if [ "$CURRENT_IP" = "$TARGET_IP" ] && [ "$WWW_IP" = "$TARGET_IP" ]; then
    echo "✅ DNS is correctly configured!"
    echo "You can now run SSL setup:"
    echo "ssh brownho@184.168.22.79 'sudo certbot --nginx -d newna.ai -d www.newna.ai'"
else
    echo "❌ DNS not updated yet"
    echo "Expected: $TARGET_IP"
    echo ""
    echo "Please update DNS in GoDaddy to point to $TARGET_IP"
    echo "Then wait 15-30 minutes for propagation"
fi

echo ""
echo "Meanwhile, test your site directly:"
echo "http://184.168.22.79/chat"