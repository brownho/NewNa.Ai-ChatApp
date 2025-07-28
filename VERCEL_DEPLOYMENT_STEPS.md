# Vercel Deployment Steps for NewNa.AI

## Step 1: Deploy to Vercel

### 1.1 Login to Vercel
Run this command and follow the prompts:
```bash
vercel login
```
- Choose your preferred login method (GitHub, Google, Email, etc.)
- A browser window will open for authentication
- After successful login, return to the terminal

### 1.2 Deploy the Application
Run:
```bash
vercel
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (create new)
- **Project name?** → `newna-ai` (or keep default)
- **Directory?** → `.` (current directory)
- **Override settings?** → No

### 1.3 Set Environment Variables
After initial deployment, set the required environment variables:

```bash
# Generate secure secrets
echo "SESSION_SECRET: $(openssl rand -base64 32)"
echo "JWT_SECRET: $(openssl rand -base64 32)"

# Set them in Vercel
vercel env add SESSION_SECRET production
vercel env add JWT_SECRET production
vercel env add OLLAMA_HOST production
```

When prompted for values:
- **SESSION_SECRET**: Paste the generated secret
- **JWT_SECRET**: Paste the generated secret
- **OLLAMA_HOST**: Leave as `http://localhost:11434` for now (we'll update after tunnel setup)

### 1.4 Deploy with Environment Variables
```bash
vercel --prod
```

Note your deployment URL (will be something like: https://newna-ai.vercel.app)

## Step 2: Set up Cloudflare Tunnel for Ollama

### 2.1 Run the Setup Script
```bash
./setup-ollama-tunnel.sh
```
Choose option 1 (Cloudflare Tunnel)

### 2.2 Follow Cloudflare Setup
1. Install cloudflared (if not already installed)
2. Authenticate with your Cloudflare account
3. Create the tunnel
4. Note your tunnel URL

### 2.3 Update Ollama Host in Vercel
```bash
vercel env rm OLLAMA_HOST production
vercel env add OLLAMA_HOST production
```
Enter your Cloudflare tunnel URL (e.g., https://your-tunnel.trycloudflare.com)

### 2.4 Redeploy with New Settings
```bash
vercel --prod
```

## Step 3: Configure Custom Domain

### 3.1 Add Domain in Vercel
```bash
vercel domains add newna.ai
```

Or via dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Domains
4. Add `newna.ai` and `www.newna.ai`

### 3.2 Update GoDaddy DNS Settings

Log into GoDaddy and go to DNS Management for newna.ai:

#### For Root Domain (newna.ai):
- **Type**: A
- **Name**: @
- **Value**: 76.76.21.21
- **TTL**: 600

#### For www subdomain:
- **Type**: CNAME
- **Name**: www
- **Value**: cname.vercel-dns.com
- **TTL**: 600

#### Remove any conflicting records:
- Delete any existing A records for @
- Delete any existing CNAME records for www

### 3.3 Wait for DNS Propagation
- Usually takes 5-30 minutes
- Check status: https://www.whatsmydns.net/#A/newna.ai

## Step 4: Final Testing

### 4.1 Test Your Deployment
1. Visit https://newna.ai
2. Check SSL certificate (should show Vercel/Let's Encrypt)
3. Try the chat functionality
4. Test user registration and login
5. Test Meeting Mentor with microphone

### 4.2 Monitor Logs
```bash
vercel logs newna-ai
```

## Troubleshooting

### If Ollama Connection Fails:
1. Ensure Cloudflare tunnel is running
2. Check tunnel logs: `cloudflared tunnel info`
3. Test Ollama directly: `curl YOUR_TUNNEL_URL/api/tags`

### If Domain Doesn't Work:
1. Check DNS propagation
2. Verify records in GoDaddy
3. Check Vercel domain settings

### If SSL Issues:
- Vercel automatically provisions SSL
- May take a few minutes after domain setup

## Maintenance

### Update Code:
```bash
git add .
git commit -m "Update"
vercel --prod
```

### View Logs:
```bash
vercel logs --follow
```

### Manage Environment Variables:
```bash
vercel env ls
```

## Important Notes

1. **Database**: Vercel uses temporary storage, so the database resets on each deployment. For persistent data, use:
   - Vercel Postgres
   - PlanetScale
   - Supabase

2. **File Uploads**: Won't persist between deployments. Use:
   - Vercel Blob Storage
   - AWS S3
   - Cloudinary

3. **Costs**:
   - Vercel: Free for personal use
   - Cloudflare: Free tier is sufficient
   - Domain: Your existing GoDaddy cost

## Success!
Once complete, your chat app will be live at https://newna.ai with:
- ✅ HTTPS enabled
- ✅ Microphone access working
- ✅ Connected to your local Ollama
- ✅ Free hosting