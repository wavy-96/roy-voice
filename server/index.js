// Initialize Sentry first (before any other imports)
require('./sentry');

const config = require('../config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const basicAuth = require('express-basic-auth');
const path = require('path');

const retellService = require('./services/retell');
const metricsRoutes = require('./routes/metrics');
const webhookRoutes = require('./routes/webhooks');
const organizationRoutes = require('./routes/organizations');
const multiTenantMetricsRoutes = require('./routes/multi-tenant-metrics');
const userRoutes = require('./routes/users');
const agentRoutes = require('./routes/agents');
const monitoringRoutes = require('./routes/monitoring');
const cache = require('./services/cache');

// Import rate limiters
const { 
  apiLimiter, 
  authLimiter, 
  orgCreationLimiter,
  healthCheckLimiter 
} = require('./middleware/rate-limit');

const app = express();
const PORT = config.port;

// Trust proxy for ngrok
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    /^https:\/\/.*\.ngrok-free\.app$/,
    /^https:\/\/.*\.ngrok\.io$/,
    /^https:\/\/.*\.vercel\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'x-vercel-protection-bypass'],
  credentials: false, // Set to false since we're using Bearer tokens, not cookies
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic auth for console routes
const authMiddleware = basicAuth({
  users: { 
    [config.console.username]: config.console.password
  },
  challenge: true,
  realm: 'Retell Metrics Console'
});

// Health check (with lenient rate limit)
app.get('/health', healthCheckLimiter, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cache statistics endpoint (for monitoring)
app.get('/api/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json(stats);
});

// API Routes (general rate limiting already applied above via apiLimiter)
app.use('/api/metrics', metricsRoutes);
app.use('/api/organizations', orgCreationLimiter, organizationRoutes); // Stricter limit for org creation
app.use('/api/multi-tenant', multiTenantMetricsRoutes);
app.use('/api/users', userRoutes); // User management (super admin only)
app.use('/api/agents', agentRoutes); // Agent management (super admin only)
app.use('/api/monitoring', monitoringRoutes); // Monitoring and health endpoints
app.use('/webhooks', webhookRoutes);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Console route with basic auth
app.get('/console', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Only start the server if not in serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Console available at: http://localhost:${PORT}/console`);
  });
}

module.exports = app;
