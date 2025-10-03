-- ============================================================================
-- Performance Indexes for Multi-Tenant System
-- ============================================================================
-- Purpose: Add indexes to improve query performance across all organization schemas
-- Impact: Reduces query time from seconds to milliseconds
-- When to run: Before scaling beyond 10 organizations
-- ============================================================================

-- ============================================================================
-- Function: Add performance indexes to an organization schema
-- ============================================================================
CREATE OR REPLACE FUNCTION system.add_performance_indexes(org_schema_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Index on created_at for date range queries and sorting
  -- Most common query: SELECT * FROM calls ORDER BY created_at DESC
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_created_at 
    ON %I.calls(created_at DESC)
  ', org_schema_name);

  -- Index on organization_id for filtering
  -- Used in: WHERE organization_id = ?
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_org_id 
    ON %I.calls(organization_id)
  ', org_schema_name);

  -- Index on status for filtering by call outcome
  -- Used in: WHERE status = ''completed'' or ''failed''
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_status 
    ON %I.calls(status)
  ', org_schema_name);

  -- Index on external_call_id for lookups by Retell call ID
  -- Used in: WHERE external_call_id = ?
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_external_id 
    ON %I.calls(external_call_id)
  ', org_schema_name);

  -- Index on agent_id for filtering by agent
  -- Used in: WHERE agent_id = ?
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_agent_id 
    ON %I.calls(agent_id)
  ', org_schema_name);

  -- Composite index for common date range + status queries
  -- Used in: WHERE created_at BETWEEN ? AND ? AND status = ?
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_date_status 
    ON %I.calls(created_at DESC, status)
  ', org_schema_name);

  -- GIN index for JSONB queries (if searching within raw data)
  -- Used in: WHERE raw @> ''{"key": "value"}''
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_calls_raw_gin 
    ON %I.calls USING GIN(raw)
  ', org_schema_name);

  RAISE NOTICE 'Performance indexes added to schema: %', org_schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Add indexes to existing TheCreativeHorse organization
-- ============================================================================
SELECT system.add_performance_indexes('org_thecreativehorse_3cbe86ec52774832a9185220c74fc619');

-- ============================================================================
-- Update create_organization_schema to include indexes for new orgs
-- ============================================================================
-- This ensures all new organizations get indexes automatically
CREATE OR REPLACE FUNCTION system.create_organization_schema(
  org_id UUID,
  org_schema_name TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Create the schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', org_schema_name);

  -- Create calls table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_call_id TEXT NOT NULL,
      started_at TIMESTAMPTZ,
      connected_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      direction TEXT,
      from_e164 TEXT,
      to_e164 TEXT,
      status TEXT,
      end_reason TEXT,
      duration_seconds INTEGER,
      billed_minutes NUMERIC(10, 2),
      outcome TEXT,
      detailed_summary TEXT,
      transcript TEXT,
      raw JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      organization_id UUID REFERENCES system.organizations(id) ON DELETE CASCADE,
      agent_id TEXT
    )
  ', org_schema_name);

  -- Add performance indexes immediately after table creation
  PERFORM system.add_performance_indexes(org_schema_name);

  -- Create updated_at trigger
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  ', org_schema_name);

  EXECUTE format('
    CREATE TRIGGER update_calls_updated_at
    BEFORE UPDATE ON %I.calls
    FOR EACH ROW
    EXECUTE FUNCTION %I.update_updated_at_column();
  ', org_schema_name, org_schema_name);

  -- Enable Row Level Security
  EXECUTE format('ALTER TABLE %I.calls ENABLE ROW LEVEL SECURITY', org_schema_name);

  -- Create RLS policy for service role
  EXECUTE format('
    CREATE POLICY service_role_access ON %I.calls
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)
  ', org_schema_name);

  -- Create RLS policy for authenticated users in this organization
  EXECUTE format('
    CREATE POLICY org_user_access ON %I.calls
    FOR ALL
    TO authenticated
    USING (organization_id = %L)
    WITH CHECK (organization_id = %L)
  ', org_schema_name, org_id, org_id);

  RAISE NOTICE 'Organization schema created with indexes: %', org_schema_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Verify indexes were created successfully
-- ============================================================================
-- Run this query to check indexes on TheCreativeHorse schema
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'org_thecreativehorse_3cbe86ec52774832a9185220c74fc619'
ORDER BY indexname;

-- ============================================================================
-- Test query performance with EXPLAIN ANALYZE
-- ============================================================================
-- Before indexes (baseline):
-- EXPLAIN ANALYZE 
-- SELECT * FROM org_thecreativehorse_3cbe86ec52774832a9185220c74fc619.calls 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- After indexes (should show Index Scan instead of Seq Scan):
-- EXPLAIN ANALYZE 
-- SELECT * FROM org_thecreativehorse_3cbe86ec52774832a9185220c74fc619.calls 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- ============================================================================
-- Maintenance: Reindex if needed (run monthly or after bulk inserts)
-- ============================================================================
-- REINDEX SCHEMA org_thecreativehorse_3cbe86ec52774832a9185220c74fc619;

