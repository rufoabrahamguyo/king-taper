// client-config.js - Client-side configuration for King Taper
// This file provides the API configuration to the frontend

(function() {
  'use strict';
  
  // Detect environment based on hostname
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  // Set configuration based on environment
  window.KingTaperConfig = {
    apiBaseUrl: isLocalhost ? 'http://localhost:3001' : window.location.origin,
    environment: isLocalhost ? 'development' : 'production',
    version: '1.0.0'
  };
  
  // Log configuration for debugging
  if (isLocalhost) {
    console.log('🔧 King Taper Config:', window.KingTaperConfig);
  }
})();
