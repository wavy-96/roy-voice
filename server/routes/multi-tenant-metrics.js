const express = require('express');
const { authMiddleware, requireRole, requireOrganizationAccess } = require('../middleware/auth');
const MultiTenantMetricsService = require('../services/multi-tenant-metrics');
const { validateMetricsQuery } = require('../middleware/validation');

const router = express.Router();
const metricsService = new MultiTenantMetricsService();

// Get organization-specific calls (with cursor-based pagination)
// Note: Validation happens BEFORE auth for better error messages
router.get('/calls', validateMetricsQuery, authMiddleware, requireOrganizationAccess, async (req, res) => {
  try {
    const { limit, cursor, from, to, organizationId, isBillable } = req.query;
    
    // Parse isBillable as boolean if provided
    let isBillableParam = null;
    if (isBillable === 'true') isBillableParam = true;
    if (isBillable === 'false') isBillableParam = false;
    
    const result = await metricsService.getOrganizationCalls(req.user, {
      limit,
      cursor,
      from,
      to,
      organizationId,
      isBillable: isBillableParam
    });

    res.json({
      organization: result.organization,
      calls: result.calls,
      pagination: {
        limit: result.pagination.limit,
        cursor: result.pagination.cursor,
        nextCursor: result.pagination.nextCursor,
        hasMore: result.pagination.hasMore,
        count: result.calls.length
      }
    });

  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get organization-specific overview
router.get('/overview', validateMetricsQuery, authMiddleware, requireOrganizationAccess, async (req, res) => {
  try {
    const { from, to, organizationId, isBillable } = req.query;
    
    // Parse isBillable as boolean if provided
    let isBillableParam = null;
    if (isBillable === 'true') isBillableParam = true;
    if (isBillable === 'false') isBillableParam = false;
    
    const result = await metricsService.getOrganizationOverview(req.user, {
      from,
      to,
      organizationId,
      isBillable: isBillableParam
    });

    res.json(result);

  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all organizations (super admin only)
router.get('/organizations', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const organizations = await metricsService.getAllOrganizations(req.user);
    res.json(organizations);

  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      organization_id: req.user.organization_id,
      first_name: req.user.first_name,
      last_name: req.user.last_name
    }
  });
});

module.exports = router;

