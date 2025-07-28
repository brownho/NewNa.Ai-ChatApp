# Port Forwarding Setup with DDNS

## Your Configuration:
- **DDNS Domain**: brownfi.tplinkdns.com
- **Local IP**: 192.168.4.105
- **Port**: 3000

## Step 1: Configure Port Forwarding in TP-Link Router

1. Access your TP-Link router admin panel
2. Go to **Advanced** → **NAT Forwarding** → **Port Forwarding** (or **Virtual Servers**)
3. Add new rule:
   - **Service Name**: BrownFi_LLM
   - **Device IP**: 192.168.4.105
   - **External Port**: 3000 (or use 8080 for better security)
   - **Internal Port**: 3000
   - **Protocol**: TCP
   - **Status**: Enabled

4. Save and reboot router if needed

## Step 2: Access Your Service

Once configured, access your service at:
```
http://brownfi.tplinkdns.com:3000
```

Or if you used external port 8080:
```
http://brownfi.tplinkdns.com:8080
```

## Step 3: Optional - Add HTTPS with Caddy (Recommended)

For secure HTTPS access, install Caddy reverse proxy:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add to Caddyfile:
```
brownfi.tplinkdns.com {
    reverse_proxy localhost:3000
}
```

Then:
```bash
# Change router port forwarding:
# External Port 80 → Internal Port 80 (for HTTP)
# External Port 443 → Internal Port 443 (for HTTPS)

# Restart Caddy
sudo systemctl restart caddy
```

Now access via:
```
https://brownfi.tplinkdns.com
```

## Step 4: Firewall Configuration

Make sure your firewall allows the connection:
```bash
# Check firewall status
sudo ufw status

# If firewall is active, allow port
sudo ufw allow 3000/tcp

# Or if using Caddy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Testing Connection

Test if port is open from outside:
```bash
# From another network or use online tool
curl http://brownfi.tplinkdns.com:3000
```

## Troubleshooting

1. **Can't connect?**
   - Verify DDNS is updating: `ping brownfi.tplinkdns.com`
   - Check if service is running: `sudo systemctl status brownfi-llm`
   - Verify port forwarding is saved in router
   - Some ISPs block common ports - try using port 8080 or 8443

2. **Security concerns?**
   - Consider using non-standard ports (8080, 8443)
   - Add authentication (see server-with-auth.js example)
   - Monitor access logs: `sudo journalctl -u brownfi-llm -f`

## Mobile Access
Once configured, you can access from any device:
- Phone browser: `http://brownfi.tplinkdns.com:3000`
- Share the link with others (be careful about security!)