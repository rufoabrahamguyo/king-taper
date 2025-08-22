// config.js - Environment-based configuration

const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001',
    frontendUrl: 'http://localhost:3000'
  },
  production: {
    apiBaseUrl: process.env.API_BASE_URL || 'https://your-production-domain.com',
    frontendUrl: process.env.FRONTEND_URL || 'https://your-production-domain.com'
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = config[env] || config.development;
