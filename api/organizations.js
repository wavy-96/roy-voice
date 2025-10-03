const OrganizationService = require('../server/services/organization');
const {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateUuidParam
} = require('../server/middleware/validation');

// Initialize the organization service
const organizationService = new OrganizationService();

// Helper function to add CORS headers
function addCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://client-omega-plum-94.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass');
}

// Helper function to check super admin access (simplified for now)
function requireSuperAdmin(req) {
  // In production, this would check JWT token and verify super admin role
  // For now, we'll assume all requests are from super admin
  return { role: 'super_admin' };
}

module.exports = async (req, res) => {
  // Add CORS headers to all responses
  addCorsHeaders(res);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Check super admin access
    const user = requireSuperAdmin(req);
    
    const { method, url } = req;
    const path = url.replace('/api/organizations', '');
    
    if (method === 'GET' && path === '') {
      // Get all organizations
      const organizations = await organizationService.getAllOrganizations();
      res.status(200).json(organizations);
    } else if (method === 'GET' && path.startsWith('/')) {
      // Get organization by ID
      const orgId = path.substring(1);
      const organization = await organizationService.getOrganizationById(orgId);
      res.status(200).json(organization);
    } else if (method === 'POST' && path === '') {
      // Create new organization
      const orgData = req.body;
      const organization = await organizationService.createOrganization(orgData);
      res.status(201).json(organization);
    } else if (method === 'PUT' && path.startsWith('/')) {
      // Update organization
      const orgId = path.substring(1);
      const updateData = req.body;
      const organization = await organizationService.updateOrganization(orgId, updateData);
      res.status(200).json(organization);
    } else if (method === 'DELETE' && path.startsWith('/')) {
      // Delete organization
      const orgId = path.substring(1);
      await organizationService.deleteOrganization(orgId);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in organizations function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};