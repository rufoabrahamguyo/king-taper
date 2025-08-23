// config.js - Environment-based configuration

const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001',
    frontendUrl: 'http://localhost:3000'
  },
  production: {
    apiBaseUrl: 'https://kingtaper.com',
    frontendUrl: 'https://kingtaper.com'
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export configuration for current environment
module.exports = config[env] || config.development;
