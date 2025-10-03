/**
 * Artillery Load Test Processor
 * Custom logic for load testing scenarios
 */

module.exports = {
  setAuthToken,
  generateRandomOrgId,
  logResponse
};

/**
 * Set authentication token for requests
 * In a real scenario, you would get a valid JWT from Supabase
 */
function setAuthToken(requestParams, context, ee, next) {
  // For testing without auth, we skip this
  // In production load tests, you would:
  // 1. Login with test user
  // 2. Get JWT token
  // 3. Set Authorization header
  
  // Example (commented out):
  // requestParams.headers = requestParams.headers || {};
  // requestParams.headers['Authorization'] = `Bearer ${context.vars.token}`;
  
  return next();
}

/**
 * Generate random organization ID for testing
 */
function generateRandomOrgId(context, events, done) {
  // Sample organization IDs (you can add your real org IDs here)
  const orgIds = [
    'a532b854-cbee-42f8-a669-cc6dfaa753aa',  // TheCreativeHorse
    // Add more org IDs as needed
  ];
  
  context.vars.orgId = orgIds[Math.floor(Math.random() * orgIds.length)];
  return done();
}

/**
 * Log response for debugging
 */
function logResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.log(`Error ${response.statusCode}: ${requestParams.url}`);
  }
  return next();
}

