/**
 * Centralized Environment Configuration
 * 
 * This module loads environment variables from different sources
 * depending on the environment:
 * - Local: from .env file
 * - Vercel: from process.env (set in dashboard)
 * 
 * This ensures consistent configuration across all environments.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  
  // Console Auth
  console: {
    username: process.env.CONSOLE_USERNAME || 'admin',
    password: process.env.CONSOLE_PASSWORD || 'password123'
  },
  
  // API
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3002}`,
  
  // Retell (optional)
  retellApiKey: process.env.RETELL_API_KEY,
  
  // Computed values
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isVercel: !!process.env.VERCEL
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const required = [
    'supabase.url',
    'supabase.anonKey',
    'supabase.serviceRoleKey',
    'jwtSecret'
  ];
  
  const missing = [];
  
  for (const key of required) {
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      value = value[k];
      if (!value) {
        missing.push(key);
        break;
      }
    }
  }
  
  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
      `Please ensure all required variables are set.\n` +
      `See .env.example for the full list of required variables.`
    );
    
    if (config.isProduction || config.isVercel) {
      // In production/Vercel, throw error
      throw error;
    } else {
      // In development, warn but continue
      console.warn('\n⚠️  WARNING:', error.message, '\n');
    }
  }
}

// Validate on module load
validateConfig();

// Export config
module.exports = config;

