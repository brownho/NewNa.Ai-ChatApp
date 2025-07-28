# Manual VPS Update Instructions

## Step 1: Upload the corrected server.js

```bash
scp server.js brownho@184.168.22.79:/var/www/newna.ai/chat/
```
(Enter your password when prompted)

## Step 2: Connect to VPS

```bash
ssh brownho@184.168.22.79
```
(Enter your password when prompted)

## Step 3: Update the environment (run these commands on VPS)

```bash
cd /var/www/newna.ai/chat

# Update .env file with Cloudflare tunnel URL
echo "OLLAMA_HOST=https://soma-psychology-efficiency-micro.trycloudflare.com" >> .env

# Or if OLLAMA_HOST already exists, edit it:
nano .env
# Change OLLAMA_HOST to: https://soma-psychology-efficiency-micro.trycloudflare.com
# Save with Ctrl+X, Y, Enter

# Restart the application
pm2 restart all

# Check status
pm2 status

# Check logs
pm2 logs --lines 20

# Test locally on VPS
curl http://localhost:3000/api/models
```

## Step 4: Exit VPS

```bash
exit
```

## Step 5: Test from your computer

Open in browser:
- http://184.168.22.79/

Or test with curl:
```bash
curl http://184.168.22.79/api/models
```

## Important Notes

1. **Keep Cloudflare Tunnel Running**: On your local machine, keep this running:
   ```bash
   cloudflared tunnel --url http://localhost:11434
   ```

2. **If models still don't load**, check:
   - Is Ollama running locally? (`ollama list`)
   - Is Cloudflare tunnel active?
   - Check VPS logs: `ssh brownho@184.168.22.79 'cd /var/www/newna.ai/chat && pm2 logs'`

3. **To verify environment variable is set**:
   ```bash
   ssh brownho@184.168.22.79 'cd /var/www/newna.ai/chat && cat .env | grep OLLAMA'
   ```