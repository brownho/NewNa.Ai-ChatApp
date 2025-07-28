#!/bin/bash

# BrownFi Local LLMs Startup Script
# This script starts the web interface on system boot

# Change to the application directory
cd /home/sabro/ollama-chat-app

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "Starting BrownFi Local LLMs server..."
npm start