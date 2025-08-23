#!/bin/bash

# Railway Deployment Script for King Taper
echo "🚂 Deploying King Taper to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    railway login
fi

# Deploy the application
echo "📦 Deploying application..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "🔗 Next steps:"
echo "1. Go to Railway dashboard"
echo "2. Add your custom domain in Settings → Domains"
echo "3. Configure GoDaddy DNS with Railway's provided records"
echo "4. Set environment variables in Railway dashboard"
echo ""
echo "📖 See DOMAIN_SETUP.md for detailed instructions"
