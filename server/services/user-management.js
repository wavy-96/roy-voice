require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class UserManagementService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Get all users (with organization details)
   */
  async getAllUsers() {
    try {
      const { data: { users }, error } = await this.supabase.auth.admin.listUsers();
      
      if (error) throw error;

      // Enrich users with organization names
      const { data: orgs, error: orgsError } = await this.supabase.rpc('list_organizations');
      if (orgsError) throw orgsError;

      const enrichedUsers = users.map(user => {
        const orgId = user.user_metadata?.organization_id;
        const org = orgId ? orgs.find(o => o.id === orgId) : null;
        
        return {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'user',
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          organization_id: orgId,
          organization_name: org?.name,
          organization_slug: org?.slug,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at
        };
      });

      return enrichedUsers;

    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to fetch users: ' + error.message);
    }
  }

  /**
   * Get a single user by ID
   */
  async getUserById(userId) {
    try {
      const { data: { user }, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error) throw error;
      if (!user) throw new Error('User not found');

      // Get organization details
      const orgId = user.user_metadata?.organization_id;
      let org = null;
      
      if (orgId) {
        const { data: orgs, error: orgsError } = await this.supabase.rpc('list_organizations');
        if (!orgsError) {
          org = orgs.find(o => o.id === orgId);
        }
      }

      return {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user',
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        organization_id: orgId,
        organization_name: org?.name,
        organization_slug: org?.slug,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at
      };

    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to fetch user: ' + error.message);
    }
  }

  /**
   * Create a new user with organization assignment
   */
  async createUser(userData) {
    try {
      const { email, password, role, organization_id, first_name, last_name } = userData;

      // Validate required fields
      if (!email) throw new Error('Email is required');
      if (!password) throw new Error('Password is required');
      if (!role) throw new Error('Role is required');
      
      // Validate role
      const validRoles = ['super_admin', 'org_admin', 'org_viewer', 'user'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // If role is not super_admin, organization_id is required
      if (role !== 'super_admin' && !organization_id) {
        throw new Error('Organization ID is required for non-super-admin users');
      }

      // Verify organization exists (if provided)
      let organization = null;
      if (organization_id) {
        const { data: orgs, error: orgsError } = await this.supabase.rpc('list_organizations');
        if (orgsError) throw orgsError;
        
        organization = orgs.find(o => o.id === organization_id);
        if (!organization) {
          throw new Error('Organization not found');
        }
      }

      // Prepare user metadata
      const user_metadata = {
        role,
        first_name: first_name || '',
        last_name: last_name || ''
      };

      if (organization_id) {
        user_metadata.organization_id = organization_id;
        user_metadata.organization_name = organization.name;
        user_metadata.organization_slug = organization.slug;
      }

      // Create the user
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata
      });

      if (error) throw error;

      console.log(`✅ User created: ${email} (${role}) - Org: ${organization?.name || 'None'}`);

      return {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata.role,
        first_name: data.user.user_metadata.first_name,
        last_name: data.user.user_metadata.last_name,
        organization_id: data.user.user_metadata.organization_id,
        organization_name: organization?.name,
        organization_slug: organization?.slug,
        created_at: data.user.created_at
      };

    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user: ' + error.message);
    }
  }

  /**
   * Update a user (metadata, organization assignment, role, etc.)
   */
  async updateUser(userId, updateData) {
    try {
      const { role, organization_id, first_name, last_name, email, password } = updateData;

      // Get current user
      const { data: { user: currentUser }, error: getUserError } = await this.supabase.auth.admin.getUserById(userId);
      if (getUserError) throw getUserError;
      if (!currentUser) throw new Error('User not found');

      // Prepare update payload
      const updatePayload = {};

      // Update email if provided
      if (email && email !== currentUser.email) {
        updatePayload.email = email;
      }

      // Update password if provided
      if (password) {
        updatePayload.password = password;
      }

      // Update user metadata
      const user_metadata = { ...currentUser.user_metadata };

      if (role !== undefined) {
        const validRoles = ['super_admin', 'org_admin', 'org_viewer', 'user'];
        if (!validRoles.includes(role)) {
          throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
        user_metadata.role = role;
      }

      if (first_name !== undefined) {
        user_metadata.first_name = first_name;
      }

      if (last_name !== undefined) {
        user_metadata.last_name = last_name;
      }

      // Update organization assignment
      if (organization_id !== undefined) {
        if (organization_id === null) {
          // Remove organization assignment
          delete user_metadata.organization_id;
          delete user_metadata.organization_name;
          delete user_metadata.organization_slug;
        } else {
          // Verify organization exists
          const { data: orgs, error: orgsError } = await this.supabase.rpc('list_organizations');
          if (orgsError) throw orgsError;
          
          const organization = orgs.find(o => o.id === organization_id);
          if (!organization) {
            throw new Error('Organization not found');
          }

          user_metadata.organization_id = organization_id;
          user_metadata.organization_name = organization.name;
          user_metadata.organization_slug = organization.slug;
        }
      }

      updatePayload.user_metadata = user_metadata;

      // Perform the update
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, updatePayload);

      if (error) throw error;

      console.log(`✅ User updated: ${data.user.email}`);

      // Get organization details for response
      const orgId = data.user.user_metadata?.organization_id;
      let org = null;
      if (orgId) {
        const { data: orgs } = await this.supabase.rpc('list_organizations');
        org = orgs?.find(o => o.id === orgId);
      }

      return {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata.role,
        first_name: data.user.user_metadata.first_name,
        last_name: data.user.user_metadata.last_name,
        organization_id: orgId,
        organization_name: org?.name,
        organization_slug: org?.slug,
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user: ' + error.message);
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId) {
    try {
      // Get user first to log the deletion
      const { data: { user }, error: getUserError } = await this.supabase.auth.admin.getUserById(userId);
      if (getUserError) throw getUserError;
      if (!user) throw new Error('User not found');

      // Delete the user
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      console.log(`✅ User deleted: ${user.email}`);

      return { success: true, email: user.email };

    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user: ' + error.message);
    }
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId) {
    try {
      const { data: { users }, error } = await this.supabase.auth.admin.listUsers();
      
      if (error) throw error;

      const orgUsers = users.filter(user => 
        user.user_metadata?.organization_id === organizationId
      );

      return orgUsers.map(user => ({
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user',
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }));

    } catch (error) {
      console.error('Error getting users by organization:', error);
      throw new Error('Failed to fetch organization users: ' + error.message);
    }
  }
}

module.exports = UserManagementService;

