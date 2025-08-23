# Custom Domain Setup: GoDaddy to Railway

## Step 1: Deploy to Railway

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway project**:
   ```bash
   railway init
   ```

4. **Deploy your app**:
   ```bash
   railway up
   ```

## Step 2: Configure Custom Domain in Railway

1. Go to your Railway dashboard
2. Select your project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter your custom domain: `kingtaper.com`
6. Railway will provide you with DNS records to configure

## Step 3: Configure GoDaddy DNS

In your GoDaddy DNS management, add these records:

### Option A: Using CNAME (Recommended)
```
Type: CNAME
Name: @
Value: [Railway-provided-domain].railway.app
TTL: 600 (or 1 hour)
```

### Option B: Using A Records
```
Type: A
Name: @
Value: [Railway-IP-address]
TTL: 600 (or 1 hour)
```

## Step 4: Update Environment Variables

In Railway dashboard, set these environment variables:

```
CUSTOM_DOMAIN=kingtaper.com
FRONTEND_URL=https://kingtaper.com
API_BASE_URL=https://kingtaper.com
SESSION_SECRET=your_secure_session_secret
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
```

## Step 5: SSL Certificate

Railway automatically provides SSL certificates for custom domains. Wait 5-10 minutes for the certificate to be issued.

## Step 6: Test Your Domain

1. Wait for DNS propagation (can take up to 48 hours)
2. Test your domain: `https://kingtaper.com`
3. Verify SSL certificate is working

## Troubleshooting

- **DNS not resolving**: Check GoDaddy DNS settings and wait for propagation
- **SSL not working**: Wait longer for certificate issuance
- **App not loading**: Check Railway deployment status and logs

## Important Notes

- Keep your Railway environment variables secure
- Monitor your Railway usage and billing
- Consider setting up monitoring for your production app
