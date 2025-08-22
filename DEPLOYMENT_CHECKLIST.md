# 🚀 Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.production`
- [ ] Fill in all production environment variables:
  - [ ] Database credentials (MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE)
  - [ ] Strong session secret (SESSION_SECRET)
  - [ ] Admin credentials (ADMIN_USER, ADMIN_PASS)
  - [ ] Google Calendar service account key (GOOGLE_SERVICE_ACCOUNT_KEY)
  - [ ] Frontend URL (FRONTEND_URL)
  - [ ] Set NODE_ENV=production

### 2. Database Setup
- [ ] Create production MySQL database
- [ ] Run database migrations (tables will be created automatically)
- [ ] Test database connection
- [ ] Ensure proper database permissions



### 4. Security
- [ ] Generate strong session secret
- [ ] Use strong admin password
- [ ] Ensure HTTPS in production
- [ ] Review CORS settings
- [ ] Validate all environment variables

## 🚀 Deployment Steps

### 1. Choose Hosting Platform
- [ ] Railway (recommended for Node.js)
- [ ] Heroku
- [ ] DigitalOcean
- [ ] AWS/GCP

### 2. Deploy Backend
- [ ] Upload code to hosting platform
- [ ] Set environment variables in hosting platform
- [ ] Install dependencies (`npm install`)
- [ ] Start server (`npm run prod`)

### 3. Deploy Frontend
- [ ] Upload HTML/CSS/JS files
- [ ] Ensure static file serving works
- [ ] Test all functionality

### 4. Domain & SSL
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Update DNS settings
- [ ] Test HTTPS

## 🧪 Post-Deployment Testing

### 1. Functionality Tests
- [ ] Test booking form
- [ ] Test admin login
- [ ] Test database operations
- [ ] Test session management

### 2. Performance Tests
- [ ] Check page load times
- [ ] Test under load
- [ ] Monitor error rates
- [ ] Check database performance

### 3. Security Tests
- [ ] Test admin authentication
- [ ] Verify CORS settings
- [ ] Check session security
- [ ] Test input validation

## 📋 Environment Variables Template

```bash
# Database
MYSQLHOST=your_production_host
MYSQLUSER=your_production_user
MYSQLPASSWORD=your_production_password
MYSQLDATABASE=your_production_database
MYSQLPORT=3306

# Security
SESSION_SECRET=your_very_long_random_string_here
ADMIN_USER=admin
ADMIN_PASS=your_secure_password



# URLs
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
PORT=3001
```

## 🚨 Common Issues

1. **Environment variables not loaded**: Check `.env.production` file exists
2. **Database connection failed**: Verify credentials and network access

4. **CORS issues**: Verify FRONTEND_URL is correct
5. **Session not working**: Check SESSION_SECRET is set

## 📞 Support

If you encounter issues:
1. Check server logs for error messages
2. Verify all environment variables are set
3. Test database connection manually

5. Review hosting platform documentation

## 🎉 Success!

Once deployed successfully:
- ✅ Your app will be accessible at your domain

- ✅ Admin panel will be secure and functional
- ✅ Database will store all booking data
- ✅ Sessions will work properly across domains

**Remember**: Always test thoroughly in a staging environment before going live!
