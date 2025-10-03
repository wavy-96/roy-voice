-- Multi-Tenant System Schema for Supabase SQL Editor
-- Run this in your Supabase SQL Editor

-- 1. Create system schema
CREATE SCHEMA IF NOT EXISTS system;

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS system.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  domain TEXT GENERATED ALWAYS AS (subdomain || '.thecreativehorse.ca') STORED,
  schema_name TEXT UNIQUE NOT NULL,
  
  -- Retell Configuration
  retell_api_key TEXT,
  retell_agent_id TEXT,
  retell_configured BOOLEAN DEFAULT FALSE,
  
  -- Billing Configuration
  cogs_per_minute DECIMAL(10,4) DEFAULT 0.20,
  billing_rate_per_minute DECIMAL(10,4) DEFAULT 0.40,
  
  -- Branding Configuration
  branding JSONB DEFAULT '{
    "logo_url": null,
    "primary_color": "#3B82F6",
    "secondary_color": "#1E40AF",
    "company_name": null,
    "favicon_url": null
  }'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. System users (super admin)
CREATE TABLE IF NOT EXISTS system.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin')),
  first_name TEXT,
  last_name TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Organization users
CREATE TABLE IF NOT EXISTS system.organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES system.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  first_name TEXT,
  last_name TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

-- 5. Billing history
CREATE TABLE IF NOT EXISTS system.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES system.organizations(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  total_calls INTEGER NOT NULL DEFAULT 0,
  cogs_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(10,2) GENERATED ALWAYS AS (billing_amount - cogs_amount) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activity logs
CREATE TABLE IF NOT EXISTS system.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES system.organizations(id) ON DELETE SET NULL,
  user_id UUID,
  user_type TEXT CHECK (user_type IN ('system_user', 'organization_user')),
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON system.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON system.organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON system.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON system.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_email ON system.organization_users(email);
CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON system.billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON system.activity_logs(organization_id);

-- 8. Enable RLS
ALTER TABLE system.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.activity_logs ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (simplified for now)
CREATE POLICY "Service role full access" ON system.organizations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON system.system_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON system.organization_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON system.billing_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON system.activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 10. Create updated_at trigger function
CREATE OR REPLACE FUNCTION system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON system.organizations
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

CREATE TRIGGER update_system_users_updated_at BEFORE UPDATE ON system.system_users
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

CREATE TRIGGER update_organization_users_updated_at BEFORE UPDATE ON system.organization_users
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();
