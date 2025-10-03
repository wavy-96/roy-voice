const express = require('express');
const Sentry = require('../sentry');
const cache = require('../services/cache');
const config = require('../../config/env');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      // System metrics
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      
      // Application metrics
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      
      // Cache metrics
      cache: cache.getStats(),
      
      // Database metrics (if available)
      database: {
        connected: true, // TODO: Add actual database health check
        lastCheck: new Date().toISOString()
      },
      
      // Timestamp
      timestamp: new Date().toISOString()
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Cache statistics endpoint
router.get('/cache/stats', (req, res) => {
  try {
    const stats = cache.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Error test endpoint (for testing Sentry integration)
router.get('/test-error', (req, res) => {
  try {
    // This will trigger an error for testing
    throw new Error('Test error for Sentry integration');
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ 
      error: 'Test error triggered',
      message: 'This error was sent to Sentry for testing'
    });
  }
});

// Performance test endpoint
router.get('/performance-test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    res.json({
      status: 'ok',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Performance test failed' });
  }
});

module.exports = router;
