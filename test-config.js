// Test Configuration Script
// Run this to verify your configuration is working

console.log('🧪 Testing King Taper Configuration...');

// Test environment detection
console.log('📍 Current hostname:', window.location.hostname);
console.log('🔒 Protocol:', window.location.protocol);
console.log('🌐 Full URL:', window.location.href);

// Test configuration object
if (window.KingTaperConfig) {
  console.log('✅ Configuration loaded:', window.KingTaperConfig);
  console.log('🔗 API Base URL:', window.KingTaperConfig.apiBaseUrl);
  console.log('🏗️ Environment:', window.KingTaperConfig.isDevelopment ? 'Development' : 'Production');
} else {
  console.error('❌ Configuration not loaded!');
}

// Test API endpoints
const testEndpoints = [
  '/api/book',
  '/api/available-times',
  '/api/booked-times'
];

console.log('🔍 Testing API endpoints:');
testEndpoints.forEach(endpoint => {
  const fullUrl = window.KingTaperConfig ? window.KingTaperConfig.apiBaseUrl + endpoint : 'N/A';
  console.log(`  ${endpoint} → ${fullUrl}`);
});

console.log('✅ Configuration test complete!');
