#!/bin/bash

# 🚀 Production Deployment Script for King Taper
# This script deploys the application in production mode

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.production not found. Creating from railway.env...${NC}"
    if [ -f "railway.env" ]; then
        cp railway.env .env.production
        echo -e "${GREEN}✅ Created .env.production from railway.env${NC}"
    else
        echo -e "${RED}❌ Error: Neither .env.production nor railway.env found.${NC}"
        echo "Please create .env.production with your production environment variables."
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node --version)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Error: Node.js $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Check npm version
NPM_VERSION=$(npm --version)
REQUIRED_NPM_VERSION="8.0.0"
if [ "$(printf '%s\n' "$REQUIRED_NPM_VERSION" "$NPM_VERSION" | sort -V | head -n1)" != "$REQUIRED_NPM_VERSION" ]; then
    echo -e "${RED}❌ Error: npm $REQUIRED_NPM_VERSION or higher is required. Current version: $NPM_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"

# Install production dependencies
echo -e "${BLUE}📦 Installing production dependencies...${NC}"
npm run install:prod

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing globally...${NC}"
    npm install -g pm2
fi

# Stop any existing PM2 processes
echo -e "${BLUE}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop king-taper 2>/dev/null || true
pm2 delete king-taper 2>/dev/null || true

# Start the production server with PM2
echo -e "${BLUE}🚀 Starting production server with PM2...${NC}"
npm run pm2:start

# Wait a moment for the server to start
sleep 3

# Check if the server is running
if pm2 status | grep -q "king-taper.*online"; then
    echo -e "${GREEN}✅ Production server started successfully!${NC}"
else
    echo -e "${RED}❌ Error: Failed to start production server${NC}"
    echo "Check PM2 logs: npm run pm2:logs"
    exit 1
fi

# Show PM2 status
echo -e "${BLUE}📊 PM2 Status:${NC}"
npm run pm2:status

# Show server info
echo -e "${BLUE}🌐 Server Information:${NC}"
echo "  - Environment: Production"
echo "  - Process Manager: PM2"
echo "  - App Name: king-taper"
echo "  - Available Commands:"
echo "    - View logs: npm run pm2:logs"
echo "    - Restart: npm run pm2:restart"
echo "    - Stop: npm run pm2:stop"
echo "    - Status: npm run pm2:status"

# Health check
echo -e "${BLUE}🏥 Performing health check...${NC}"
sleep 2

# Try to get the health endpoint
HEALTH_CHECK=$(curl -s http://localhost:8080/api/health 2>/dev/null || echo "FAILED")
if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed or server not ready yet${NC}"
    echo "You can check the server status with: npm run pm2:status"
fi

echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure your domain to point to this server"
echo "2. Set up SSL/HTTPS (recommended: Let's Encrypt)"
echo "3. Configure your reverse proxy (nginx/Apache) if needed"
echo "4. Set up monitoring and logging"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  - View logs: npm run pm2:logs"
echo "  - Restart server: npm run pm2:restart"
echo "  - Stop server: npm run pm2:stop"
echo "  - Check status: npm run pm2:status"
echo ""
echo -e "${GREEN}🚀 Your King Taper website is now running in production mode!${NC}"
