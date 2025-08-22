#!/bin/bash

# Deployment script for King Taper app

echo "🚀 Starting deployment process..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production from env.example and fill in production values"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Start the application
echo "🚀 Starting application..."
NODE_ENV=production npm run prod

echo "✅ Deployment completed!"
echo "📝 Check server logs for any errors"
echo "🌐 Your app should now be running on port 3001"
