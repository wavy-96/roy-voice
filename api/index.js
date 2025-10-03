// Initialize Sentry first (before any other imports)
require('../server/sentry');

const config = require('../config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const basicAuth = require('express-basic-auth');
const path = require('path');

const retellService = require('../server/services/retell');
const metricsRoutes = require('../server/routes/metrics');
const webhookRoutes = require('../server/routes/webhooks');
const organizationRoutes = require('../server/routes/organizations');
const multiTenantMetricsRoutes = require('../server/routes/multi-tenant-metrics');
const userRoutes = require('../server/routes/users');
const agentRoutes = require('../server/routes/agents');
const monitoringRoutes = require('../server/routes/monitoring');
const cache = require('../server/services/cache');

// Import rate limiters
const { 
  apiLimiter, 
  authLimiter, 
  orgCreationLimiter,
  healthCheckLimiter 
} = require('../server/middleware/rate-limit');

const app = express();
const PORT = config.port;

// Trust proxy for ngrok
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all Vercel domains
    if (origin.includes('.vercel.app')) return callback(null, true);
    
    // Allow ngrok domains
    if (origin.includes('.ngrok.io') || origin.includes('.ngrok-free.app')) return callback(null, true);
    
    // Allow specific domains
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'https://client-omega-plum-94.vercel.app'
    ];
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    callback(new Error('Not allowed by CORS'));
  },
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Console available at: http://localhost:${PORT}/console`);
});

module.exports = app;
