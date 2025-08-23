# 🚀 Production Deployment Checklist for King Taper

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Create `.env.production` file with production values
- [ ] Verify all database credentials are correct
- [ ] Set strong `SESSION_SECRET` (32+ characters)
- [ ] Update admin credentials for production
- [ ] Configure production domain URLs

### 2. Security Review
- [ ] Remove any hardcoded development URLs
- [ ] Verify CORS settings for production domain
- [ ] Check session security settings
- [ ] Review rate limiting configuration
- [ ] Verify helmet security headers

### 3. Database Preparation
- [ ] Ensure production database is accessible
- [ ] Verify database user permissions
- [ ] Test database connection from production server
- [ ] Backup any existing data

### 4. Dependencies
- [ ] Install production dependencies: `npm run install:prod`
- [ ] Verify all required packages are installed
- [ ] Check for any security vulnerabilities: `npm audit`

## 🚀 Deployment Steps

### 1. Install Production Dependencies
```bash
npm run install:prod
```

### 2. Deploy with Production Script
```bash
./deploy-production.sh
```

### 3. Verify Deployment
```bash
# Check PM2 status
npm run pm2:status

# View logs
npm run pm2:logs

# Health check
curl http://localhost:8080/api/health
```

## 🔧 Production Commands

### PM2 Process Management
```bash
npm run pm2:start      # Start production server
npm run pm2:stop       # Stop server
npm run pm2:restart    # Restart server
npm run pm2:logs       # View logs
npm run pm2:status     # Check status
```

### Manual Server Control
```bash
npm run prod           # Start production server manually
npm run prod:start     # Alternative production start
```

## 🌐 Production URLs

- **Main Website**: `https://kingtaper.com`
- **Admin Panel**: `https://kingtaper.com/admin`
- **API Endpoints**: `https://kingtaper.com/api/*`
- **Health Check**: `https://kingtaper.com/api/health`

## 🔒 Security Features Enabled

- ✅ HTTPS enforcement
- ✅ Secure session cookies
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Security headers (Helmet)
- ✅ Content Security Policy
- ✅ XSS protection
- ✅ Clickjacking protection
- ✅ HSTS headers

## 📊 Performance Features

- ✅ Gzip compression
- ✅ Static file caching
- ✅ Database connection pooling
- ✅ Optimized database queries
- ✅ Rate limiting to prevent abuse

## 🚨 Monitoring & Maintenance

### Daily Checks
- [ ] Check PM2 status: `npm run pm2:status`
- [ ] Review error logs: `npm run pm2:logs`
- [ ] Monitor database performance
- [ ] Check disk space and memory usage

### Weekly Tasks
- [ ] Review access logs
- [ ] Check for security updates
- [ ] Backup database
- [ ] Monitor rate limiting effectiveness

### Monthly Tasks
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification

## 🔧 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check logs
npm run pm2:logs

# Check environment variables
cat .env.production

# Verify database connection
mysql -h [HOST] -u [USER] -p [DATABASE]
```

#### Database Connection Issues
- Verify database credentials in `.env.production`
- Check database server accessibility
- Verify network firewall settings

#### Admin Login Issues
- Check admin credentials in `.env.production`
- Verify session configuration
- Check CORS settings

### Emergency Commands
```bash
# Stop all services
pm2 stop all

# Restart production server
npm run pm2:restart

# View real-time logs
pm2 logs king-taper --lines 100
```

## 📋 Post-Deployment Verification

### 1. Functionality Tests
- [ ] Website loads correctly
- [ ] Booking form works
- [ ] Admin login works
- [ ] Time slot selection works
- [ ] All API endpoints respond

### 2. Security Tests
- [ ] HTTPS redirects work
- [ ] Security headers are present
- [ ] Rate limiting is active
- [ ] Session security is working

### 3. Performance Tests
- [ ] Page load times are acceptable
- [ ] API response times are good
- [ ] Database queries are optimized
- [ ] Compression is working

## 🎯 Success Criteria

Your production deployment is successful when:
- ✅ Website loads in under 3 seconds
- ✅ All features work without errors
- ✅ Security headers are properly set
- ✅ Rate limiting prevents abuse
- ✅ Database connections are stable
- ✅ PM2 process is running and healthy
- ✅ Health check endpoint returns "healthy"

## 🚀 Next Steps After Deployment

1. **Domain Configuration**: Point your domain to the production server
2. **SSL Certificate**: Install Let's Encrypt or other SSL certificate
3. **Monitoring**: Set up monitoring and alerting
4. **Backup Strategy**: Implement automated backups
5. **Documentation**: Document any custom configurations

---

**🎉 Congratulations! Your King Taper website is now production-ready!**

For support or questions, refer to the logs and this checklist.
