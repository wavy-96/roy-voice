require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cache = require('./cache');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class MultiTenantMetricsService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.cache = cache;
  }

  /**
   * Helper method to get organization (with caching)
   */
  async _getOrganization(organizationId) {
    // Try cache first
    let organization = this.cache.getOrganization(organizationId);
    
    if (organization) {
      return organization; // Cache hit
    }

    // Cache miss - fetch all organizations and cache them
    const { data: orgs, error } = await this.supabase.rpc('list_organizations');
    
    if (error) throw error;

    // Cache all organizations
    this.cache.setAllOrganizations(orgs);

    // Find the requested organization
    organization = orgs.find(o => o.id === organizationId);
    
    if (!organization) {
      throw new Error('Organization not found');
    }

    return organization;
  }

  // Get organization-specific calls with cursor-based pagination
  async getOrganizationCalls(user, options = {}) {
    try {
      const { limit = 50, cursor = null, from, to, isBillable = null } = options;
      
      // Super admins can access any organization, others are restricted to their own
      let organizationId = user.organization_id;
      
      if (user.role === 'super_admin' && options.organizationId) {
        organizationId = options.organizationId;
      }

      if (!organizationId) {
        throw new Error('Organization ID required');
      }

      // Get organization details (with caching)
      const organization = await this._getOrganization(organizationId);

      // Call the RPC function to get calls with cursor-based pagination
      const rpcParams = {
        p_org_id: organizationId,
        p_limit: limit
      };

      if (cursor) {
        rpcParams.p_cursor = cursor;
      }
      if (from) {
        rpcParams.p_from_date = from;
      }
      if (to) {
        rpcParams.p_to_date = to;
      }
      if (isBillable !== null) {
        rpcParams.p_is_billable = isBillable;
      }

      const { data: calls, error: callsError } = await this.supabase
        .rpc('get_organization_calls', rpcParams);

      if (callsError) {
        console.error('RPC error getting calls:', callsError);
        throw callsError;
      }

      // Extract pagination metadata from first row (if exists)
      const hasMore = calls && calls.length > 0 ? calls[0].has_more : false;
      const nextCursor = calls && calls.length > 0 ? calls[calls.length - 1].next_cursor : null;

      // Remove pagination metadata from results
      const cleanCalls = calls ? calls.map(({ has_more, next_cursor, ...call }) => call) : [];

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          schema_name: organization.schema_name
        },
        calls: cleanCalls,
        pagination: {
          limit,
          cursor,
          nextCursor,
          hasMore
        }
      };

    } catch (error) {
      console.error('Error getting organization calls:', error);
      throw error;
    }
  }

  // Get organization-specific overview
  async getOrganizationOverview(user, options = {}) {
    try {
      const { from, to, isBillable = null } = options;
      
      // Super admins can access any organization, others are restricted to their own
      let organizationId = user.organization_id;
      
      if (user.role === 'super_admin' && options.organizationId) {
        organizationId = options.organizationId;
      }

      if (!organizationId) {
        throw new Error('Organization ID required');
      }

      // Get organization details (with caching)
      const organization = await this._getOrganization(organizationId);

      // Call the RPC function to get overview from the organization-specific schema
      const rpcParams = {
        p_org_id: organizationId,
        p_from_date: from || null,
        p_to_date: to || null
      };

      if (isBillable !== null) {
        rpcParams.p_is_billable = isBillable;
      }

      const { data: overviewData, error: overviewError } = await this.supabase
        .rpc('get_organization_overview', rpcParams);

      if (overviewError) {
        console.error('RPC error getting overview:', overviewError);
        throw overviewError;
      }

      const overview = overviewData?.[0] || {
        total_calls: 0,
        billable_calls: 0,
        test_calls: 0,
        total_duration: 0,
        total_billed_minutes: 0,
        avg_duration: 0,
        avg_billed_minutes: 0,
        successful_calls: 0,
        failed_calls: 0,
        expected_revenue: 0
      };

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          schema_name: organization.schema_name
        },
        overview: {
          total_calls: parseInt(overview.total_calls) || 0,
          billable_calls: parseInt(overview.billable_calls) || 0,
          test_calls: parseInt(overview.test_calls) || 0,
          answered_calls: parseInt(overview.successful_calls) || 0,
          missed_calls: parseInt(overview.failed_calls) || 0,
          total_duration_seconds: parseInt(overview.total_duration) || 0,
          total_billed_minutes: parseFloat(overview.total_billed_minutes) || 0,
          avg_duration_seconds: parseFloat(overview.avg_duration) || 0,
          avg_billed_minutes: parseFloat(overview.avg_billed_minutes) || 0,
          expected_revenue: parseFloat(overview.expected_revenue) || 0,
          answer_rate: overview.total_calls > 0 
            ? ((overview.successful_calls / overview.total_calls) * 100).toFixed(1) 
            : 0,
          window: {
            from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: to || new Date().toISOString()
          }
        }
      };

    } catch (error) {
      console.error('Error getting organization overview:', error);
      throw error;
    }
  }

  // Get all organizations (super admin only)
  async getAllOrganizations(user) {
    if (user.role !== 'super_admin') {
      throw new Error('Super admin access required');
    }

    try {
      // Try cache first
      let organizations = this.cache.getAllOrganizations();
      
      if (organizations) {
        return organizations; // Cache hit
      }

      // Cache miss - fetch from database
      const { data, error } = await this.supabase
        .rpc('list_organizations');

      if (error) throw error;

      // Cache the result
      this.cache.setAllOrganizations(data);

      return data;

    } catch (error) {
      console.error('Error getting all organizations:', error);
      throw error;
    }
  }
}

module.exports = MultiTenantMetricsService;

