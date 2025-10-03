require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client for authentication
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication middleware
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      organization_id: user.user_metadata?.organization_id,
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Role-based access control middleware
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    
    // Role hierarchy: super_admin > org_admin > user
    const roleHierarchy = {
      'user': 1,
      'org_admin': 2,
      'super_admin': 3
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRole,
        current: userRole
      });
    }

    next();
  };
}

// Organization access middleware
function requireOrganizationAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admins can access any organization
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Other users must belong to the organization
  if (!req.user.organization_id) {
    return res.status(403).json({ error: 'No organization assigned' });
  }

  // Check if user is accessing their own organization
  const requestedOrgId = req.params.organizationId || req.body.organization_id;
  if (requestedOrgId && requestedOrgId !== req.user.organization_id) {
    return res.status(403).json({ error: 'Access denied to this organization' });
  }

  next();
}

module.exports = {
  authMiddleware,
  requireRole,
  requireOrganizationAccess
};

