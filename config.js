// config.js - Environment-based configuration

const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001',
    frontendUrl: 'http://localhost:3000'
  },
  production: {
    apiBaseUrl: process.env.API_BASE_URL || (process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'https://kingtaper.com'),
    frontendUrl: process.env.FRONTEND_URL || (process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'https://kingtaper.com')
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = config[env] || config.development;
