require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class AgentService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3002';
  }

  /**
   * Create a new agent (returns pending validation)
   */
  async createAgent(organizationId, agentData) {
    try {
      const { agent_id, name } = agentData;

      if (!agent_id || !name) {
        throw new Error('agent_id and name are required');
      }

      // Call RPC function to create agent
      const { data, error } = await this.supabase.rpc('create_agent', {
        p_organization_id: organizationId,
        p_agent_id: agent_id,
        p_name: name
      });

      if (error) {
        console.error('Error creating agent:', error);
        throw new Error(`Failed to create agent: ${error.message}`);
      }

      const agent = data[0];

      // Return agent with full webhook URL
      return {
        ...agent,
        webhook_url: `${this.baseUrl}${agent.webhook_url}`
      };
    } catch (error) {
      console.error('Agent creation error:', error);
      throw error;
    }
  }

  /**
   * Get all agents for an organization
   */
  async getAgentsForOrganization(organizationId) {
    try {
      const { data, error } = await this.supabase.rpc('get_agents_for_org', {
        p_organization_id: organizationId
      });

      if (error) {
        console.error('Error fetching agents:', error);
        throw new Error(`Failed to fetch agents: ${error.message}`);
      }

      // Add full webhook URLs
      return data.map(agent => ({
        ...agent,
        webhook_url: `${this.baseUrl}${agent.webhook_url}`
      }));
    } catch (error) {
      console.error('Error getting agents:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId) {
    try {
      // Use service role to query system schema directly
      const { data, error } = await this.supabase
        .schema('system')
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error('Error fetching agent:', error);
        throw new Error(`Failed to fetch agent: ${error.message}`);
      }

      return {
        ...data,
        webhook_url: `${this.baseUrl}${data.webhook_url}`
      };
    } catch (error) {
      console.error('Error getting agent:', error);
      throw error;
    }
  }

  /**
   * Get agent by webhook URL path (used by webhook handler)
   */
  async getAgentByWebhookUrl(webhookUrlPath) {
    try {
      const { data, error} = await this.supabase
        .schema('system')
        .from('agents')
        .select('*')
        .eq('webhook_url', webhookUrlPath)
        .single();

      if (error) {
        console.error('Error fetching agent by webhook URL:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting agent by webhook URL:', error);
      return null;
    }
  }

  /**
   * Update agent status (for webhook validation)
   */
  async updateAgentStatus(agentId, status, isValidated = null, errorMessage = null) {
    try {
      const { data, error } = await this.supabase.rpc('update_agent_status', {
        p_agent_id: agentId,
        p_status: status,
        p_is_validated: isValidated,
        p_error_message: errorMessage
      });

      if (error) {
        console.error('Error updating agent status:', error);
        throw new Error(`Failed to update agent status: ${error.message}`);
      }

      return data[0];
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  }

  /**
   * Record webhook received (validates agent)
   */
  async recordWebhookReceived(webhookUrlPath, agentIdFromRetell) {
    try {
      const { data, error } = await this.supabase.rpc('record_agent_webhook', {
        p_webhook_url: webhookUrlPath,
        p_agent_id_from_retell: agentIdFromRetell
      });

      if (error) {
        console.error('Error recording webhook:', error);
        throw new Error(`Failed to record webhook: ${error.message}`);
      }

      return data[0];
    } catch (error) {
      console.error('Error recording webhook:', error);
      throw error;
    }
  }

  /**
   * Check if agent has received webhook (for polling during validation)
   */
  async checkAgentValidation(agentId) {
    try {
      const agent = await this.getAgentById(agentId);
      
      return {
        is_validated: agent.is_validated,
        status: agent.status,
        last_webhook_received_at: agent.last_webhook_received_at,
        error_message: agent.error_message
      };
    } catch (error) {
      console.error('Error checking agent validation:', error);
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId) {
    try {
      const { data, error } = await this.supabase.rpc('delete_agent', {
        p_agent_id: agentId
      });

      if (error) {
        console.error('Error deleting agent:', error);
        throw new Error(`Failed to delete agent: ${error.message}`);
      }

      return { success: data };
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }
}

module.exports = AgentService;

