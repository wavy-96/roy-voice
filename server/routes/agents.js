const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const AgentService = require('../services/agent');
const Joi = require('joi');

const router = express.Router();
const agentService = new AgentService();

// Validation schemas
const createAgentSchema = Joi.object({
  agent_id: Joi.string().pattern(/^agent_[a-zA-Z0-9]+$/).required().messages({
    'string.pattern.base': 'Retell Agent ID must start with "agent_"',
    'string.empty': 'Agent ID is required',
    'any.required': 'Agent ID is required'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Agent name must be at least 2 characters',
    'string.max': 'Agent name cannot exceed 100 characters',
    'string.empty': 'Agent name is required',
    'any.required': 'Agent name is required'
  }),
  organization_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Organization ID must be a valid UUID'
  })
});

const updateAgentStatusSchema = Joi.object({
  status: Joi.string().valid('pending_validation', 'active', 'inactive', 'error').required(),
  is_validated: Joi.boolean().optional(),
  error_message: Joi.string().optional().allow(null, '')
});

// Validation middleware
const validateCreateAgent = (req, res, next) => {
  const { error, value } = createAgentSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.context.key,
      message: detail.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = value;
  next();
};

const validateUpdateAgentStatus = (req, res, next) => {
  const { error, value } = updateAgentStatusSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.context.key,
      message: detail.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = value;
  next();
};

// ============================================================================
// Agent Routes
// ============================================================================

// Create a new agent for an organization (super admin only)
// Supports both URL param and body organization_id
router.post('/organizations/:organizationId/agents', 
  authMiddleware, 
  requireRole('super_admin'), 
  validateCreateAgent,
  async (req, res) => {
    try {
      // Organization ID can come from params or body
      const organizationId = req.params.organizationId || req.body.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const agent = await agentService.createAgent(organizationId, req.body);
      
      res.status(201).json(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Generate webhook URL for agent (before creation)
router.post('/webhook-url', 
  authMiddleware, 
  requireRole('super_admin'), 
  async (req, res) => {
    try {
      const { organization_id } = req.body;
      
      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      // For now, use a simple static pattern that can be deployed
      // TODO: Make this more sophisticated for production
      const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3002';
      const webhookUuid = `agent_${organization_id.replace(/-/g, '')}`;
      const webhookUrl = `${baseUrl}/webhooks/agent/${webhookUuid}`;
      
      res.json({
        webhook_url: webhookUrl,
        webhook_uuid: webhookUuid,
        organization_id: organization_id
      });
    } catch (error) {
      console.error('Error generating webhook URL:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all agents for an organization (super admin only)
router.get('/organizations/:organizationId/agents', 
  authMiddleware, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const agents = await agentService.getAgentsForOrganization(organizationId);
      
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get specific agent by ID (super admin only)
router.get('/agents/:agentId', 
  authMiddleware, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const agent = await agentService.getAgentById(agentId);
      
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(404).json({ error: 'Agent not found' });
    }
  }
);

// Check agent validation status (polling endpoint)
router.get('/agents/:agentId/validation', 
  authMiddleware, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const validation = await agentService.checkAgentValidation(agentId);
      
      res.json(validation);
    } catch (error) {
      console.error('Error checking agent validation:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update agent status (super admin only)
router.patch('/agents/:agentId/status', 
  authMiddleware, 
  requireRole('super_admin'), 
  validateUpdateAgentStatus,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { status, is_validated, error_message } = req.body;
      
      const agent = await agentService.updateAgentStatus(agentId, status, is_validated, error_message);
      
      res.json(agent);
    } catch (error) {
      console.error('Error updating agent status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete an agent (super admin only)
router.delete('/agents/:agentId', 
  authMiddleware, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const result = await agentService.deleteAgent(agentId);
      
      res.json(result);
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create agent with pre-generated webhook URL
router.post('/agents-with-webhook', 
  authMiddleware, 
  requireRole('super_admin'), 
  validateCreateAgent,
  async (req, res) => {
    try {
      const { organization_id, webhook_uuid } = req.body;
      
      if (!organization_id) {
        return res.status(400).json({ error: 'Organization ID is required in request body' });
      }

      if (!webhook_uuid) {
        return res.status(400).json({ error: 'Webhook UUID is required in request body' });
      }

      const agent = await agentService.createAgentWithWebhook(organization_id, req.body, webhook_uuid);
      
      res.status(201).json(agent);
    } catch (error) {
      console.error('Error creating agent with webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

