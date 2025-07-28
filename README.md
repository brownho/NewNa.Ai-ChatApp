# BrownFi Local LLMs

A ChatGPT-like web interface for chatting with local Ollama models.

## Features

- Clean, modern chat interface similar to ChatGPT
- Model selection dropdown for all installed Ollama models
- Real-time streaming responses
- Syntax highlighting for code blocks
- Markdown rendering
- Accessible on local network
- Dark theme
- Remembers your selected model

## Prerequisites

1. Install Ollama: https://ollama.ai
2. Pull at least one model (e.g., `ollama pull mixtral` or `ollama pull llama2`)
3. Make sure Ollama is running

## Installation

1. Install dependencies:
```bash
cd ollama-chat-app
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the interface:
   - Local: http://localhost:3000
   - Network: http://<your-ip>:3000

## Usage

- Type your message in the input field
- Press Enter to send (Shift+Enter for new line)
- Code blocks are automatically syntax highlighted
- Supports markdown formatting

## Troubleshooting

- If you get connection errors, make sure Ollama is running
- Verify you have models installed: `ollama list`
- The model dropdown will automatically populate with your installed models
- Check that port 11434 (Ollama) and 3000 (web app) are not blocked