# 🚀 King Taper - Production Deployment Guide

## 🎯 Overview

This guide will help you deploy your King Taper website to production with enterprise-grade security, performance, and reliability features.

## 🔧 Prerequisites

- **Server**: Ubuntu 20.04+ or CentOS 8+ (or Railway hosting)
- **Node.js**: 18.0.0 or higher
- **MySQL**: 8.0 or higher (Railway MySQL service)
- **Domain**: Configured and pointing to your server
- **SSL Certificate**: Let's Encrypt or commercial certificate

## 🌐 Railway Hosting Configuration

### Database Connection
Your application is configured to use Railway's MySQL service via proxy:
- **Host**: `shinkansen.proxy.rlwy.net`
- **Database**: `railway`
- **Port**: `3306`
- **Connection**: Secure proxy connection to Railway MySQL

### Environment Variables
The following environment variables are pre-configured for Railway:
```bash
MYSQLHOST=shinkansen.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=[Your Railway MySQL Password]
MYSQLDATABASE=railway
MYSQLPORT=3306
```

## 📋 Quick Start

### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm run install:prod

# Install PM2 globally
npm install -g pm2
```

### 2. Configure Environment
```bash
# Copy production environment file
cp production.env .env.production

# Edit with your production values
nano .env.production
```

### 3. Deploy
```bash
# Run production deployment script
./deploy-production.sh
```

## 🏗️ Production Architecture

```
Internet → Nginx (SSL/TLS) → Node.js App → Railway MySQL
    ↓           ↓              ↓           ↓
  Domain   Reverse Proxy   Express.js   Proxy Connection
  HTTPS    Load Balancer   PM2 Process   shinkansen.proxy.rlwy.net
```

## 🔒 Security Features

### Application Security
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Rate limiting (100 req/15min)
- ✅ Session security
- ✅ Input validation
- ✅ SQL injection prevention

### Server Security
- ✅ HTTPS enforcement
- ✅ Security headers
- ✅ File access restrictions
- ✅ Process isolation
- ✅ Resource limits

## 📊 Performance Features

### Optimization
- ✅ Gzip compression
- ✅ Static file caching
- ✅ Database connection pooling
- ✅ Query optimization
- ✅ Rate limiting

### Monitoring
- ✅ PM2 process management
- ✅ Health check endpoints
- ✅ Error logging
- ✅ Performance metrics

## 🌐 Domain & SSL Setup

### 1. Domain Configuration
```bash
# Point your domain to your server IP
# A record: kingtaper.com → YOUR_SERVER_IP
# CNAME: www.kingtaper.com → kingtaper.com
```

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d kingtaper.com -d www.kingtaper.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 Deployment Options

### Option 1: PM2 (Recommended)
```bash
# Start with PM2
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs
```

### Option 2: Systemd Service
```bash
# Copy service file
sudo cp king-taper.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable king-taper
sudo systemctl start king-taper
```

### Option 3: Railway Deployment
```bash
# Deploy to Railway
npm run railway:deploy

# Check Railway status
npm run railway:status

# View Railway logs
npm run railway:logs
```

## 🔧 Nginx Configuration

### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Configure Site
```bash
# Copy configuration
sudo cp nginx.conf /etc/nginx/sites-available/kingtaper

# Enable site
sudo ln -s /etc/nginx/sites-available/kingtaper /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 📊 Monitoring & Maintenance

### Daily Monitoring
```bash
# Check server status
npm run pm2:status

# View recent logs
npm run pm2:logs --lines 50

# Check system resources
htop
df -h
free -h
```

### Weekly Tasks
```bash
# Update dependencies
npm audit
npm update

# Backup database
mysqldump -h shinkansen.proxy.rlwy.net -u root -p railway > backup_$(date +%Y%m%d).sql

# Check SSL certificate
sudo certbot certificates
```

### Monthly Tasks
```bash
# Security updates
sudo apt update && sudo apt upgrade

# Performance review
# Check nginx access logs
# Monitor database performance
# Review error logs
```

## 🚨 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check logs
npm run pm2:logs

# Check environment
cat .env.production

# Verify database connection
mysql -h shinkansen.proxy.rlwy.net -u root -p railway
```

#### Database Connection Issues
```bash
# Check Railway MySQL status
# Verify proxy domain: shinkansen.proxy.rlwy.net
# Check firewall settings
# Verify database credentials
```

#### SSL Issues
```bash
# Check certificate
sudo certbot certificates

# Test SSL
curl -I https://kingtaper.com

# Check nginx config
sudo nginx -t
```

### Emergency Commands
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Restart everything
sudo systemctl restart nginx
npm run pm2:restart

# View real-time logs
pm2 logs king-taper --lines 100
```

## 📈 Scaling & Optimization

### Performance Tuning
```bash
# Increase PM2 instances
pm2 scale king-taper 4

# Enable clustering
pm2 start server.production.js -i max

# Monitor performance
pm2 monit
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_bookings_date_time ON bookings(date, time);
CREATE INDEX idx_bookings_service ON bookings(service);

-- Optimize queries
EXPLAIN SELECT * FROM bookings WHERE date = '2024-01-01';
```

## 🔐 Security Hardening

### Firewall Configuration
```bash
# Configure UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Fail2ban Setup
```bash
# Install Fail2ban
sudo apt install fail2ban

# Configure for SSH and web attacks
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📋 Production Checklist

### Before Going Live
- [ ] Environment variables configured
- [ ] Railway database credentials verified
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Firewall rules set
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Post-Deployment
- [ ] Website loads correctly
- [ ] Admin panel accessible
- [ ] Booking system functional
- [ ] SSL certificate working
- [ ] Performance acceptable
- [ ] Error monitoring active
- [ ] Backup system tested

## 🎯 Success Metrics

Your production deployment is successful when:
- ✅ Website loads in under 3 seconds
- ✅ SSL certificate is valid and working
- ✅ All features function without errors
- ✅ Database connections are stable
- ✅ Error rate is below 1%
- ✅ Uptime is above 99.9%

## 🆘 Support & Resources

### Useful Commands
```bash
# Quick status check
npm run pm2:status && curl -s http://localhost:8080/api/health

# View all logs
pm2 logs --lines 1000

# Restart services
npm run pm2:restart && sudo systemctl reload nginx
```

### Railway Commands
```bash
# Deploy to Railway
npm run railway:deploy

# Check Railway status
npm run railway:status

# View Railway logs
npm run railway:logs
```

### Documentation
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Railway Documentation](https://docs.railway.app/)

---

## 🎉 Congratulations!

Your King Taper website is now production-ready with enterprise-grade security and performance!

**Next Steps:**
1. Configure your domain DNS
2. Set up SSL certificate
3. Deploy with `./deploy-production.sh`
4. Monitor and maintain

For questions or support, refer to the logs and this documentation.
