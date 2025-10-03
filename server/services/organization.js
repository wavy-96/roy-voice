require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class OrganizationService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
  }

  // Encrypt sensitive data
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Generate unique subdomain
  async generateSubdomain(name) {
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let subdomain = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data: existing } = await this.supabase
        .schema('system')
        .from('organizations')
        .select('id')
        .eq('subdomain', subdomain)
        .single();
      
      if (!existing) {
        return subdomain;
      }
      
      subdomain = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Create new organization
  async createOrganization(organizationData) {
    try {
      const { name, retell_api_key, retell_agent_id, cogs_per_minute, billing_rate_per_minute } = organizationData;
      
      // Generate unique subdomain and schema name
      const subdomain = await this.generateSubdomain(name);
      const schemaName = `org_${subdomain}_${crypto.randomUUID().replace(/-/g, '')}`;
      
      // Create organization record using raw SQL
      const { data: organization, error: orgError } = await this.supabase
        .rpc('create_organization', {
          p_name: name,
          p_slug: subdomain,
          p_subdomain: subdomain,
          p_schema_name: schemaName,
          p_retell_api_key: retell_api_key ? this.encrypt(retell_api_key) : null,
          p_retell_agent_id: retell_agent_id,
          p_cogs_per_minute: cogs_per_minute || 0.20,
          p_billing_rate_per_minute: billing_rate_per_minute || 0.40
        });

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      // Extract the organization data from the RPC response
      const orgData = organization[0]; // RPC returns array, get first result

      // Create organization schema
      const { error: schemaError } = await this.supabase
        .rpc('create_organization_schema', {
          org_id: orgData.id,
          schema_name: schemaName
        });

      if (schemaError) {
        // Rollback organization creation if schema creation fails
        await this.supabase
          .schema('system')
          .from('organizations')
          .delete()
          .eq('id', orgData.id);
        
        throw new Error(`Failed to create organization schema: ${schemaError.message}`);
      }

      // Log activity
      await this.logActivity(orgData.id, 'organization_created', {
        organization_name: name,
        subdomain,
        schema_name: schemaName
      });

      return orgData;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  // Create organization schema (helper method)
  async createOrganizationSchema(orgId, schemaName) {
    try {
      const { error: schemaError } = await this.supabase
        .rpc('create_organization_schema', {
          org_id: orgId,
          schema_name: schemaName
        });

      if (schemaError) {
        throw new Error(`Failed to create organization schema: ${schemaError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error creating organization schema:', error);
      throw error;
    }
  }

  // Get all organizations (super admin)
  async getAllOrganizations() {
    try {
      const { data: organizations, error } = await this.supabase
        .rpc('list_organizations');

      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      // Decrypt API keys for display (masked)
      return organizations.map(org => ({
        ...org,
        retell_api_key: org.retell_api_key ? '***' + org.retell_api_key.slice(-4) : null
      }));
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
  }

  // Get organization by ID
  async getOrganizationById(orgId) {
    try {
      const { data: organization, error } = await this.supabase
        .schema('system')
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      // Decrypt API key for use
      if (organization.retell_api_key) {
        organization.retell_api_key = this.decrypt(organization.retell_api_key);
      }

      return organization;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  // Update organization
  async updateOrganization(orgId, updateData) {
    try {
      const updateFields = { ...updateData };
      
      // Encrypt API key if provided
      if (updateFields.retell_api_key) {
        updateFields.retell_api_key = this.encrypt(updateFields.retell_api_key);
        updateFields.retell_configured = !!(updateFields.retell_api_key && updateFields.retell_agent_id);
      }

      const { data: organization, error } = await this.supabase
        .schema('system')
        .from('organizations')
        .update(updateFields)
        .eq('id', orgId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update organization: ${error.message}`);
      }

      // Log activity
      await this.logActivity(orgId, 'organization_updated', updateData);

      return organization;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  // Delete organization
  async deleteOrganization(orgId) {
    try {
      // Get organization details first
      const organization = await this.getOrganizationById(orgId);
      
      // Drop organization schema
      const { error: schemaError } = await this.supabase
        .schema('system')
        .rpc('drop_organization_schema', {
          schema_name: organization.schema_name
        });

      if (schemaError) {
        console.warn(`Failed to drop schema ${organization.schema_name}:`, schemaError.message);
      }

      // Delete organization record (cascades to users, billing, etc.)
      const { error: deleteError } = await this.supabase
        .schema('system')
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (deleteError) {
        throw new Error(`Failed to delete organization: ${deleteError.message}`);
      }

      // Log activity
      await this.logActivity(orgId, 'organization_deleted', {
        organization_name: organization.name,
        schema_name: organization.schema_name
      });

      return true;
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }

  // Test Retell API connection
  async testRetellConnection(apiKey, agentId) {
    try {
      const axios = require('axios');
      const response = await axios.get('https://api.retellai.com/v1/agents', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if agent exists
      const agent = response.data.find(a => a.agent_id === agentId);
      return {
        success: true,
        agent_exists: !!agent,
        agent_name: agent?.name || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Create organization user
  async createOrganizationUser(orgId, userData) {
    try {
      const { email, password, role, first_name, last_name } = userData;
      
      // Hash password (you might want to use bcrypt in production)
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const { data: user, error } = await this.supabase
        .schema('system')
        .from('organization_users')
        .insert({
          organization_id: orgId,
          email,
          password_hash: passwordHash,
          role,
          first_name,
          last_name
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      // Log activity
      await this.logActivity(orgId, 'user_created', {
        user_email: email,
        user_role: role
      });

      return user;
    } catch (error) {
      console.error('Error creating organization user:', error);
      throw error;
    }
  }

  // Get organization users
  async getOrganizationUsers(orgId) {
    try {
      const { data: users, error } = await this.supabase
        .schema('system')
        .from('organization_users')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return users;
    } catch (error) {
      console.error('Error fetching organization users:', error);
      throw error;
    }
  }

  // Log activity
  async logActivity(orgId, action, details = {}) {
    try {
      await this.supabase
        .schema('system')
        .from('activity_logs')
        .insert({
          organization_id: orgId,
          action,
          details
        });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  // Get system analytics (super admin)
  async getSystemAnalytics() {
    try {
      // Get total organizations
      const { count: totalOrgs } = await this.supabase
        .schema('system')
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Get active organizations
      const { count: activeOrgs } = await this.supabase
        .schema('system')
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total users
      const { count: totalUsers } = await this.supabase
        .schema('system')
        .from('organization_users')
        .select('*', { count: 'exact', head: true });

      // Get recent activity
      const { data: recentActivity } = await this.supabase
        .schema('system')
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total_organizations: totalOrgs,
        active_organizations: activeOrgs,
        total_users: totalUsers,
        recent_activity: recentActivity
      };
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      throw error;
    }
  }
}

module.exports = OrganizationService;
