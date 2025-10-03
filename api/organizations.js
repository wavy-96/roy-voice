const express = require('express');
const OrganizationService = require('../server/services/organization');
const {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateUuidParam
} = require('../server/middleware/validation');

const app = express();

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://client-omega-plum-94.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const organizationService = new OrganizationService();

// Middleware to check super admin access (simplified for now)
const requireSuperAdmin = (req, res, next) => {
  // In production, this would check JWT token and verify super admin role
  // For now, we'll assume all requests are from super admin
  req.user = { role: 'super_admin' };
  next();
};

// Apply super admin middleware to all routes
app.use(requireSuperAdmin);

// Get all organizations
app.get('/', async (req, res) => {
  try {
    const organizations = await organizationService.getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization by ID
app.get('/:orgId', async (req, res) => {
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
app.post('/', validateCreateOrganization, async (req, res) => {
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
app.put('/:orgId', validateUuidParam, validateUpdateOrganization, async (req, res) => {
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
app.delete('/:orgId', validateUuidParam, async (req, res) => {
  try {
    const { orgId } = req.params;
    await organizationService.deleteOrganization(orgId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

module.exports = app;
