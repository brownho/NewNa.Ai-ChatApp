# GoDaddy DNS Setup Guide for newna.ai

## What Your DNS Settings Should Look Like

### In GoDaddy DNS Management, you should see:

```
Type    Name    Value           TTL
----    ----    -----           ---
A       @       184.168.22.79   600 seconds
A       www     184.168.22.79   600 seconds
```

### ❌ DELETE These Records (if they exist):
- Any A record pointing to: 76.223.105.230
- Any A record pointing to: 13.248.243.5
- Any CNAME records for @ or www

### ✅ Your DNS Table Should ONLY Have:
1. **A record** for **@** → **184.168.22.79**
2. **A record** for **www** → **184.168.22.79**
3. Keep any MX records (for email)
4. Keep any TXT records

## How to Check in GoDaddy:

1. Go to: https://dcc.godaddy.com/domains/
2. Find **newna.ai**
3. Click **DNS** or **Manage DNS**
4. You'll see a table of DNS records

## To Verify Your Changes:

After updating, you should see:
- **@** (root domain) → Points to **184.168.22.79**
- **www** → Points to **184.168.22.79**

## Common Mistakes:
- ❌ Don't use CNAME for @ (root domain)
- ❌ Don't keep old A records
- ❌ Don't point to multiple IPs

## After Saving:
1. Changes take 15-30 minutes to propagate
2. Test with: `nslookup newna.ai`
3. Should return: 184.168.22.79