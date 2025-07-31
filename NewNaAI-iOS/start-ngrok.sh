#!/bin/bash

# Start ngrok and get the public URL
echo "Starting ngrok tunnel to localhost:3000..."

# Kill any existing ngrok processes
pkill ngrok 2>/dev/null

# Start ngrok in the background
./ngrok http 3000 --log=stdout > ngrok-output.log 2>&1 &

# Wait for ngrok to start
echo "Waiting for ngrok to start..."
sleep 5

# Get the public URL
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$PUBLIC_URL" ]; then
    echo "Failed to get ngrok URL. Checking log..."
    cat ngrok-output.log
    exit 1
fi

echo "✅ Ngrok tunnel established!"
echo "📱 Your public URL is: $PUBLIC_URL"
echo ""
echo "Next steps:"
echo "1. Update src/config/constants.ts with:"
echo "   export const API_BASE_URL = '$PUBLIC_URL';"
echo ""
echo "2. Restart your iOS app"
echo ""
echo "Press Ctrl+C to stop the tunnel"

# Keep the script running
tail -f ngrok-output.log