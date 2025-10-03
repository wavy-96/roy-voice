-- Organization Schema Creation Function
-- Run this in your Supabase SQL Editor after the system schema

-- Function to create organization schema
CREATE OR REPLACE FUNCTION system.create_organization_schema(org_id UUID, schema_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Get organization details
  SELECT * INTO org_record FROM system.organizations WHERE id = org_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', org_id;
  END IF;
  
  -- Create the organization schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Create calls table in the organization schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_call_id TEXT UNIQUE NOT NULL,
      organization_id UUID NOT NULL REFERENCES system.organizations(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      started_at TIMESTAMPTZ,
      connected_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      direction TEXT,
      from_e164 TEXT,
      to_e164 TEXT,
      status TEXT,
      end_reason TEXT,
      duration_seconds INTEGER,
      billed_minutes NUMERIC(10,2),
      outcome TEXT,
      detailed_summary TEXT,
      transcript TEXT,
      raw JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )', schema_name);
  
  -- Create call_rollups table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.call_rollups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      day DATE NOT NULL,
      organization_id UUID NOT NULL REFERENCES system.organizations(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      total_calls INTEGER DEFAULT 0,
      answered_calls INTEGER DEFAULT 0,
      total_duration_seconds INTEGER DEFAULT 0,
      total_billed_minutes NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(day, agent_id, organization_id)
    )', schema_name);
  
  -- Create indexes
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_calls_started_at ON %I.calls (started_at DESC)', schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_calls_external_call_id ON %I.calls (external_call_id)', schema_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_call_rollups_day ON %I.call_rollups (day DESC)', schema_name);
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I.calls ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.call_rollups ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create RLS policies for organization schema
  EXECUTE format('
    CREATE POLICY "Service role access" ON %I.calls
      FOR ALL USING (auth.role() = ''service_role'')
  ', schema_name);
  
  EXECUTE format('
    CREATE POLICY "Service role access" ON %I.call_rollups
      FOR ALL USING (auth.role() = ''service_role'')
  ', schema_name);
  
  -- Create updated_at triggers
  EXECUTE format('
    CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON %I.calls
      FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column()
  ', schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_call_rollups_updated_at BEFORE UPDATE ON %I.call_rollups
      FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column()
  ', schema_name);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization (accessible from public schema)
CREATE OR REPLACE FUNCTION create_organization(
  p_name TEXT,
  p_slug TEXT,
  p_subdomain TEXT,
  p_schema_name TEXT,
  p_retell_api_key TEXT DEFAULT NULL,
  p_retell_agent_id TEXT DEFAULT NULL,
  p_cogs_per_minute NUMERIC DEFAULT 0.20,
  p_billing_rate_per_minute NUMERIC DEFAULT 0.40
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  schema_name TEXT,
  retell_api_key TEXT,
  retell_agent_id TEXT,
  retell_configured BOOLEAN,
  cogs_per_minute NUMERIC,
  billing_rate_per_minute NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Insert into system.organizations
  INSERT INTO system.organizations (
    name, slug, subdomain, schema_name, 
    retell_api_key, retell_agent_id, retell_configured,
    cogs_per_minute, billing_rate_per_minute
  ) VALUES (
    p_name, p_slug, p_subdomain, p_schema_name,
    p_retell_api_key, p_retell_agent_id, 
    CASE WHEN p_retell_api_key IS NOT NULL AND p_retell_agent_id IS NOT NULL THEN TRUE ELSE FALSE END,
    p_cogs_per_minute, p_billing_rate_per_minute
  ) RETURNING * INTO org_record;
  
  -- Return the created organization
  RETURN QUERY SELECT 
    org_record.id, org_record.name, org_record.slug, org_record.subdomain,
    org_record.schema_name, org_record.retell_api_key, org_record.retell_agent_id,
    org_record.retell_configured, org_record.cogs_per_minute, org_record.billing_rate_per_minute,
    org_record.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to list organizations (accessible from public schema)
CREATE OR REPLACE FUNCTION list_organizations()
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  schema_name TEXT,
  retell_api_key TEXT,
  retell_agent_id TEXT,
  retell_configured BOOLEAN,
  cogs_per_minute NUMERIC,
  billing_rate_per_minute NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY SELECT 
    o.id, o.name, o.slug, o.subdomain, o.schema_name,
    o.retell_api_key, o.retell_agent_id, o.retell_configured,
    o.cogs_per_minute, o.billing_rate_per_minute,
    o.created_at, o.updated_at
  FROM system.organizations o
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to create organization schema (accessible from public schema)
CREATE OR REPLACE FUNCTION create_organization_schema(
  org_id UUID,
  schema_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Call the system function
  RETURN system.create_organization_schema(org_id, schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to fix existing organization schema (add missing columns)
CREATE OR REPLACE FUNCTION fix_organization_schema(schema_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add missing columns to calls table if they don't exist
  EXECUTE format('ALTER TABLE %I.calls ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES system.organizations(id) ON DELETE CASCADE', schema_name);
  EXECUTE format('ALTER TABLE %I.calls ADD COLUMN IF NOT EXISTS agent_id TEXT', schema_name);
  
  -- Add missing columns to call_rollups table if they don't exist
  EXECUTE format('ALTER TABLE %I.call_rollups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES system.organizations(id) ON DELETE CASCADE', schema_name);
  EXECUTE format('ALTER TABLE %I.call_rollups ADD COLUMN IF NOT EXISTS agent_id TEXT', schema_name);
  
  -- Update unique constraint for call_rollups
  BEGIN
    EXECUTE format('ALTER TABLE %I.call_rollups DROP CONSTRAINT IF EXISTS call_rollups_day_key', schema_name);
    EXECUTE format('ALTER TABLE %I.call_rollups ADD CONSTRAINT call_rollups_day_agent_org_unique UNIQUE (day, agent_id, organization_id)', schema_name);
  EXCEPTION
    WHEN OTHERS THEN
      -- Constraint might not exist or already be correct
      NULL;
  END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to migrate calls to organization schema
CREATE OR REPLACE FUNCTION migrate_calls_to_organization(
  org_id UUID,
  schema_name TEXT,
  calls_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  call_record JSONB;
BEGIN
  -- Loop through each call in the JSONB array
  FOR call_record IN SELECT * FROM jsonb_array_elements(calls_data)
  LOOP
    -- Insert into the organization's schema with all available columns
    EXECUTE format('
      INSERT INTO %I.calls (
        external_call_id, organization_id, agent_id, started_at, connected_at, ended_at,
        direction, from_e164, to_e164, status, end_reason,
        duration_seconds, billed_minutes, outcome, detailed_summary, transcript, raw
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) ON CONFLICT (external_call_id) DO NOTHING
    ', schema_name)
    USING 
      call_record->>'external_call_id',
      org_id,  -- organization_id
      call_record->>'agent_id',
      (call_record->>'started_at')::timestamptz,
      (call_record->>'connected_at')::timestamptz,
      (call_record->>'ended_at')::timestamptz,
      call_record->>'direction',
      call_record->>'from_e164',
      call_record->>'to_e164',
      call_record->>'status',
      call_record->>'end_reason',
      (call_record->>'duration_seconds')::integer,
      (call_record->>'billed_minutes')::numeric,
      call_record->>'outcome',
      call_record->>'detailed_summary',
      call_record->>'transcript',
      call_record->'raw';
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to get calls from organization schema
CREATE OR REPLACE FUNCTION get_organization_calls(
  schema_name TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  external_call_id TEXT,
  started_at TIMESTAMPTZ,
  from_e164 TEXT,
  to_e164 TEXT,
  status TEXT,
  duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      external_call_id, started_at, from_e164, to_e164, 
      status, duration_seconds
    FROM %I.calls 
    ORDER BY started_at DESC 
    LIMIT %s
  ', schema_name, limit_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization calls
CREATE OR REPLACE FUNCTION public.get_organization_calls(org_id UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  call_id TEXT,
  agent_id TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT,
  duration INTEGER,
  cost_cents INTEGER,
  transcript TEXT,
  summary TEXT,
  metadata JSONB
) AS $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Get the schema name for the organization
  SELECT schema_name INTO schema_name
  FROM system.organizations 
  WHERE id = org_id;
  
  IF schema_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', org_id;
  END IF;
  
  -- Execute query in the organization schema
  RETURN QUERY EXECUTE format('
    SELECT 
      id,
      call_id,
      agent_id,
      organization_id,
      created_at,
      updated_at,
      status,
      duration,
      cost_cents,
      transcript,
      summary,
      metadata
    FROM %I.calls
    ORDER BY created_at DESC
    LIMIT %s
  ', schema_name, limit_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization overview
CREATE OR REPLACE FUNCTION public.get_organization_overview(org_id UUID, from_date TIMESTAMPTZ DEFAULT NULL, to_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  total_calls INTEGER,
  total_duration INTEGER,
  total_cost_cents INTEGER,
  avg_duration DECIMAL,
  avg_cost_cents DECIMAL,
  successful_calls INTEGER,
  failed_calls INTEGER
) AS $$
DECLARE
  schema_name TEXT;
  from_clause TEXT := '';
  to_clause TEXT := '';
BEGIN
  -- Get the schema name for the organization
  SELECT schema_name INTO schema_name
  FROM system.organizations 
  WHERE id = org_id;
  
  IF schema_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', org_id;
  END IF;
  
  -- Build date filters if provided
  IF from_date IS NOT NULL THEN
    from_clause := format(' AND created_at >= %L', from_date);
  END IF;
  
  IF to_date IS NOT NULL THEN
    to_clause := format(' AND created_at <= %L', to_date);
  END IF;
  
  -- Execute query in the organization schema
  RETURN QUERY EXECUTE format('
    SELECT 
      COUNT(*)::INTEGER as total_calls,
      COALESCE(SUM(duration), 0)::INTEGER as total_duration,
      COALESCE(SUM(cost_cents), 0)::INTEGER as total_cost_cents,
      COALESCE(AVG(duration), 0) as avg_duration,
      COALESCE(AVG(cost_cents), 0) as avg_cost_cents,
      COUNT(CASE WHEN status = ''completed'' THEN 1 END)::INTEGER as successful_calls,
      COUNT(CASE WHEN status = ''failed'' THEN 1 END)::INTEGER as failed_calls
    FROM %I.calls
    WHERE 1=1 %s %s
  ', schema_name, from_clause, to_clause);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop organization schema
CREATE OR REPLACE FUNCTION system.drop_organization_schema(schema_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
