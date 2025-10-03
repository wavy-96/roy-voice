const express = require('express');
const OrganizationService = require('../services/organization');
const {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateUuidParam
} = require('../middleware/validation');

const router = express.Router();
const organizationService = new OrganizationService();

// Middleware to check super admin access (simplified for now)
const requireSuperAdmin = (req, res, next) => {
  // In production, this would check JWT token and verify super admin role
  // For now, we'll assume all requests are from super admin
  req.user = { role: 'super_admin' };
  next();
};

// Apply super admin middleware to all routes
router.use(requireSuperAdmin);

// Get all organizations
router.get('/', async (req, res) => {
  try {
    const organizations = await organizationService.getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization by ID
router.get('/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await organizationService.getOrganizationById(orgId);
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization
router.post('/', validateCreateOrganization, async (req, res) => {
  try {
    const orgData = req.body;
    const organization = await organizationService.createOrganization(orgData);
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
router.put('/:orgId', validateUpdateOrganization, async (req, res) => {
  try {
    const { orgId } = req.params;
    const updateData = req.body;
    
    const organization = await organizationService.updateOrganization(orgId, updateData);
    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete organization
router.delete('/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    await organizationService.deleteOrganization(orgId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Test Retell API connection
router.post('/:orgId/test-retell', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { api_key, agent_id } = req.body;
    
    if (!api_key || !agent_id) {
      return res.status(400).json({ error: 'API key and agent ID are required' });
    }
    
    const result = await organizationService.testRetellConnection(api_key, agent_id);
    res.json(result);
  } catch (error) {
    console.error('Error testing Retell connection:', error);
    res.status(500).json({ error: 'Failed to test Retell connection' });
  }
});

// Organization users management
router.get('/:orgId/users', async (req, res) => {
  try {
    const { orgId } = req.params;
    const users = await organizationService.getOrganizationUsers(orgId);
    res.json(users);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create organization user
router.post('/:orgId/users', async (req, res) => {
  try {
    const { orgId } = req.params;
    const userData = req.body;
    
    // Validate required fields
    if (!userData.email || !userData.password || !userData.role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    
    if (!['admin', 'viewer'].includes(userData.role)) {
      return res.status(400).json({ error: 'Role must be admin or viewer' });
    }
    
    const user = await organizationService.createOrganizationUser(orgId, userData);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating organization user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get system analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const analytics = await organizationService.getSystemAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
