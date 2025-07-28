# Fix VPS App - Manual Steps

## Quick Fix Commands

Run these commands one by one:

### 1. Connect to your VPS:
```bash
ssh brownho@184.168.22.79
```
(Enter your password when prompted)

### 2. Once connected, run these diagnostic commands:

```bash
# Check if you're in the right place
pwd

# Go to app directory
cd /var/www/newna.ai/chat

# Check if files exist
ls -la

# Check Node.js
node --version

# Check PM2
pm2 --version

# See what's running
pm2 list

# Check for errors
pm2 logs --lines 20
```

### 3. Common Fixes:

#### If PM2 shows no processes:
```bash
# Start the app
pm2 start server.js --name newna-chat

# Or if server-chat.js exists:
pm2 start server-chat.js --name newna-chat

# Save PM2 config
pm2 save
```

#### If you get "module not found" errors:
```bash
# Install dependencies
npm install

# Then restart
pm2 restart newna-chat
```

#### If PM2 is not installed:
```bash
# Install PM2
sudo npm install -g pm2

# Then start app
pm2 start server.js --name newna-chat
```

#### If Node.js is not installed:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Then install dependencies
npm install

# Install PM2
sudo npm install -g pm2

# Start app
pm2 start server.js --name newna-chat
```

### 4. Check if it's working:
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Test locally on VPS
curl http://localhost:3000
```

### 5. Exit VPS:
```bash
exit
```

### 6. Test from your computer:
```bash
curl http://184.168.22.79/chat
```

## Most Common Issue:

Usually the app just needs to be started:
```bash
ssh brownho@184.168.22.79
cd /var/www/newna.ai/chat
pm2 start server.js --name newna-chat
pm2 save
exit
```

Then test: http://184.168.22.79/chat