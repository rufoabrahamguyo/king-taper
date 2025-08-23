// Production Test Script for King Taper
// Run this to verify your app is ready for business

console.log('🧪 Testing King Taper Production Readiness...');

// Test 1: Environment Detection
console.log('✅ Environment:', process.env.NODE_ENV || 'development');

// Test 2: Configuration Loading
try {
  const config = require('./config');
  console.log('✅ Configuration loaded:', {
    apiBaseUrl: config.apiBaseUrl,
    frontendUrl: config.frontendUrl
  });
} catch (error) {
  console.error('❌ Configuration failed:', error.message);
}

// Test 3: Database Connection (if running on Railway)
if (process.env.MYSQLHOST) {
  console.log('✅ Database credentials available:', {
    host: process.env.MYSQLHOST,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
  });
} else {
  console.log('⚠️ Database credentials not set (expected in production)');
}

// Test 4: Security Configuration
if (process.env.SESSION_SECRET) {
  console.log('✅ Session secret configured');
} else {
  console.error('❌ Session secret missing');
}

if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
  console.log('✅ Admin credentials configured');
} else {
  console.error('❌ Admin credentials missing');
}

// Test 5: Domain Configuration
if (process.env.CUSTOM_DOMAIN) {
  console.log('✅ Custom domain configured:', process.env.CUSTOM_DOMAIN);
} else {
  console.log('⚠️ Custom domain not set');
}

// Test 6: Production Settings
if (process.env.NODE_ENV === 'production') {
  console.log('✅ Production mode enabled');
  console.log('✅ Port configured:', process.env.PORT || 'default');
} else {
  console.log('⚠️ Not in production mode');
}

console.log('\n🎯 Production Readiness Summary:');
console.log('================================');

const checks = [
  { name: 'Environment Variables', status: !!process.env.NODE_ENV },
  { name: 'Database Config', status: !!process.env.MYSQLHOST },
  { name: 'Session Security', status: !!process.env.SESSION_SECRET },
  { name: 'Admin Access', status: !!(process.env.ADMIN_USER && process.env.ADMIN_PASS) },
  { name: 'Custom Domain', status: !!process.env.CUSTOM_DOMAIN },
  { name: 'Production Mode', status: process.env.NODE_ENV === 'production' }
];

checks.forEach(check => {
  const icon = check.status ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.status ? 'Ready' : 'Not Ready'}`);
});

const readyCount = checks.filter(c => c.status).length;
const totalCount = checks.length;

console.log(`\n📊 Overall Status: ${readyCount}/${totalCount} checks passed`);

if (readyCount === totalCount) {
  console.log('🎉 Your app is PRODUCTION READY!');
  console.log('🚀 Deploy to Railway and start accepting bookings!');
} else {
  console.log('⚠️ Some configuration is missing. Check the items above.');
}

console.log('\n🔗 Test your app at:');
console.log('  - Customer Booking: https://kingtaper.com');
console.log('  - Admin Panel: https://kingtaper.com/admin');
console.log('  - Admin Login: kingtaper / taper@2024');
