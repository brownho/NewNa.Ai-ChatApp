# GoDaddy cPanel Deployment Guide

## If You Have GoDaddy Shared Hosting (cPanel)

Unfortunately, standard GoDaddy shared hosting **does not support Node.js applications**. You'll need one of these options:

### Option 1: Upgrade to VPS or Dedicated Hosting
Contact GoDaddy to upgrade your plan to support Node.js applications.

### Option 2: Use Alternative Hosting
Consider these Node.js-friendly alternatives:
- **Vercel** (Free tier available)
- **Railway** (Easy deployment)
- **Render** (Free SSL included)
- **DigitalOcean App Platform**
- **Heroku** (Paid only now)

### Option 3: Hybrid Approach
Keep your domain at GoDaddy but host the app elsewhere:

1. **Host app on a cloud provider**
2. **Point your domain to the cloud app:**
   - Log into GoDaddy DNS Management
   - Update A record to point to your cloud server IP
   - Or use CNAME for services like Vercel

## Quick Deploy to Vercel (Recommended for GoDaddy Users)

### 1. Prepare Your Code
```bash
# Install Vercel CLI
npm install -g vercel

# In your project directory
cd /home/sabro/ollama-chat-app
```

### 2. Create vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "OLLAMA_HOST": "@ollama_host"
  }
}
```

### 3. Deploy to Vercel
```bash
vercel

# Follow prompts to:
# - Create account/login
# - Configure project
# - Set environment variables
```

### 4. Connect Your Domain
1. In Vercel dashboard, go to Settings → Domains
2. Add `newna.ai`
3. Update GoDaddy DNS:
   - Type: CNAME
   - Name: @ (or www)
   - Value: cname.vercel-dns.com

## Setting Up Ollama Access

Since Ollama runs locally, you need to expose it to the internet:

### Easiest: Use Cloudflare Tunnel
1. **On your local machine:**
```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create newna-ollama

# Run tunnel
cloudflared tunnel --url http://localhost:11434 run newna-ollama
```

2. **Get your tunnel URL** (looks like: https://xxx.trycloudflare.com)

3. **Update your app's environment variable:**
   - In Vercel: Settings → Environment Variables
   - Add: `OLLAMA_HOST = https://your-tunnel-url.trycloudflare.com`

## Testing Your Setup

1. **Check domain**: https://newna.ai should load
2. **Test chat**: Send a message
3. **Check SSL**: Should show padlock icon
4. **Test features**: Login, chat history, meeting assistant

## Costs

- **GoDaddy Domain**: ~$12-20/year
- **Vercel**: Free for personal use
- **Cloudflare**: Free tier sufficient
- **Total**: Just your domain cost!

## Need Help?

1. **GoDaddy Support**: For domain/DNS issues
2. **Vercel Support**: For hosting issues
3. **Cloudflare Support**: For tunnel issues

## Alternative: Static Site with API

If you want to keep everything on GoDaddy, create a static version:
1. Build a frontend-only version
2. Use a public Ollama API service
3. Host on GoDaddy's basic hosting

This is more limited but works with shared hosting.