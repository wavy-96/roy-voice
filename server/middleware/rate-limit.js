const rateLimit = require('express-rate-limit');

// General API rate limit - protects all API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // TESTING: Increased from 100 to 10000 for testing
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  // Skip rate limiting for successful OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Rate limit for organization creation (super admin only, but still protect)
const orgCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // TESTING: Increased from 10 to 1000 for testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many organizations created, please wait before creating more.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP for authenticated requests
    return req.user?.id || req.ip;
  }
});

// Stricter limit for expensive operations (exports, reports, etc.)
const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 heavy operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests for this resource, please try again later.',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    // Rate limit by user ID for authenticated users
    return req.user?.id || req.ip;
  }
});

// Very lenient limit for health checks and status endpoints
const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (1 per second)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many health check requests.',
    retryAfter: '1 minute'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  orgCreationLimiter,
  heavyOperationLimiter,
  healthCheckLimiter
};

