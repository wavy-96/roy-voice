const OrganizationService = require('../server/services/organization');
const UserManagementService = require('../server/services/user-management');
const AgentService = require('../server/services/agent');
const MultiTenantMetricsService = require('../server/services/multi-tenant-metrics');

// Initialize services
const organizationService = new OrganizationService();
const userManagementService = new UserManagementService();
const agentService = new AgentService();
const multiTenantMetricsService = new MultiTenantMetricsService();

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
  console.log('🚀 Serverless function executed!', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  // Add CORS headers to all responses
  addCorsHeaders(res);

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('📡 Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  try {
    // Check super admin access for protected routes
    const user = requireSuperAdmin(req);

    const { method, url } = req;
    const path = url.replace('/api/', '').split('/')[0]; // Get first segment after /api/
    const subPath = url.replace(`/api/${path}`, '').replace(/^\//, ''); // Get remaining path

    switch (path) {
      case 'organizations':
        await handleOrganizations(req, res, subPath, organizationService);
        break;
      case 'users':
        await handleUsers(req, res, subPath, userService);
        break;
      case 'agents':
        await handleAgents(req, res, subPath, agentService);
        break;
      case 'metrics':
        await handleMetrics(req, res, subPath, metricsService);
        break;
      case 'multi-tenant':
        await handleMultiTenantMetrics(req, res, subPath, multiTenantMetricsService);
        break;
      case 'monitoring':
        await handleMonitoring(req, res, subPath, monitoringService);
        break;
      default:
        res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('Error in API function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Route handlers
async function handleOrganizations(req, res, subPath, service) {
  try {
    if (req.method === 'GET' && !subPath) {
      const organizations = await service.getAllOrganizations();
      res.status(200).json(organizations);
    } else if (req.method === 'GET' && subPath) {
      const organization = await service.getOrganizationById(subPath);
      res.status(200).json(organization);
    } else if (req.method === 'POST' && !subPath) {
      const orgData = req.body;
      const organization = await service.createOrganization(orgData);
      res.status(201).json(organization);
    } else if (req.method === 'PUT' && subPath) {
      const updateData = req.body;
      const organization = await service.updateOrganization(subPath, updateData);
      res.status(200).json(organization);
    } else if (req.method === 'DELETE' && subPath) {
      await service.deleteOrganization(subPath);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in organizations handler:', error);
    res.status(500).json({ error: 'Failed to process organizations request' });
  }
}

async function handleUsers(req, res, subPath, service) {
  try {
    if (req.method === 'GET' && !subPath) {
      const users = await service.getAllUsers();
      res.status(200).json(users);
    } else if (req.method === 'GET' && subPath) {
      const user = await service.getUserById(subPath);
      res.status(200).json(user);
    } else if (req.method === 'POST' && !subPath) {
      const userData = req.body;
      const user = await service.createUser(userData);
      res.status(201).json(user);
    } else if (req.method === 'PUT' && subPath) {
      const updateData = req.body;
      const user = await service.updateUser(subPath, updateData);
      res.status(200).json(user);
    } else if (req.method === 'DELETE' && subPath) {
      await service.deleteUser(subPath);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in users handler:', error);
    res.status(500).json({ error: 'Failed to process users request' });
  }
}

async function handleAgents(req, res, subPath, service) {
  try {
    if (req.method === 'GET' && !subPath) {
      const agents = await service.getAllAgents();
      res.status(200).json(agents);
    } else if (req.method === 'GET' && subPath) {
      const agent = await service.getAgentById(subPath);
      res.status(200).json(agent);
    } else if (req.method === 'POST' && !subPath) {
      const agentData = req.body;
      const agent = await service.createAgent(agentData);
      res.status(201).json(agent);
    } else if (req.method === 'PUT' && subPath) {
      const updateData = req.body;
      const agent = await service.updateAgent(subPath, updateData);
      res.status(200).json(agent);
    } else if (req.method === 'DELETE' && subPath) {
      await service.deleteAgent(subPath);
      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in agents handler:', error);
    res.status(500).json({ error: 'Failed to process agents request' });
  }
}

async function handleMetrics(req, res, subPath, service) {
  try {
    if (req.method === 'GET') {
      const metrics = await service.getMetrics(subPath ? { organizationId: subPath } : {});
      res.status(200).json(metrics);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in metrics handler:', error);
    res.status(500).json({ error: 'Failed to process metrics request' });
  }
}

async function handleMultiTenantMetrics(req, res, subPath, service) {
  try {
    if (req.method === 'GET') {
      const metrics = await service.getMultiTenantMetrics(subPath ? { organizationId: subPath } : {});
      res.status(200).json(metrics);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in multi-tenant metrics handler:', error);
    res.status(500).json({ error: 'Failed to process multi-tenant metrics request' });
  }
}

async function handleMonitoring(req, res, subPath, service) {
  try {
    if (req.method === 'GET') {
      if (subPath === 'health') {
        const health = await service.getHealth();
        res.status(200).json(health);
      } else if (subPath === 'stats') {
        const stats = await service.getStats();
        res.status(200).json(stats);
      } else {
        res.status(404).json({ error: 'Monitoring endpoint not found' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in monitoring handler:', error);
    res.status(500).json({ error: 'Failed to process monitoring request' });
  }
}
