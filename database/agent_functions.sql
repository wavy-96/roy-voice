-- Agent management functions for the system schema

-- Create agent function (generates random webhook UUID)
CREATE OR REPLACE FUNCTION system.create_agent(
  p_organization_id UUID,
  p_agent_id TEXT,
  p_name TEXT
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  agent_id TEXT,
  name TEXT,
  webhook_url TEXT,
  status TEXT,
  is_validated BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_uuid UUID;
  v_webhook_uuid UUID;
BEGIN
  -- Generate UUIDs
  v_agent_uuid := gen_random_uuid();
  v_webhook_uuid := gen_random_uuid();
  
  -- Insert agent
  INSERT INTO system.agents (
    id,
    organization_id,
    agent_id,
    name,
    webhook_url,
    status,
    is_validated,
    created_at,
    updated_at
  ) VALUES (
    v_agent_uuid,
    p_organization_id,
    p_agent_id,
    p_name,
    '/webhooks/agent/' || v_webhook_uuid,
    'pending_validation',
    FALSE,
    NOW(),
    NOW()
  );
  
  -- Return the created agent
  RETURN QUERY
  SELECT 
    a.id,
    a.organization_id,
    a.agent_id,
    a.name,
    a.webhook_url,
    a.status,
    a.is_validated,
    a.created_at,
    a.updated_at
  FROM system.agents a
  WHERE a.id = v_agent_uuid;
END;
$$;

-- Create agent with specific webhook UUID function
CREATE OR REPLACE FUNCTION system.create_agent_with_webhook(
  p_organization_id UUID,
  p_agent_id TEXT,
  p_name TEXT,
  p_webhook_uuid UUID
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  agent_id TEXT,
  name TEXT,
  webhook_url TEXT,
  status TEXT,
  is_validated BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_uuid UUID;
BEGIN
  -- Generate agent UUID
  v_agent_uuid := gen_random_uuid();
  
  -- Insert agent with specific webhook UUID
  INSERT INTO system.agents (
    id,
    organization_id,
    agent_id,
    name,
    webhook_url,
    status,
    is_validated,
    created_at,
    updated_at
  ) VALUES (
    v_agent_uuid,
    p_organization_id,
    p_agent_id,
    p_name,
    '/webhooks/agent/' || p_webhook_uuid,
    'pending_validation',
    FALSE,
    NOW(),
    NOW()
  );
  
  -- Return the created agent
  RETURN QUERY
  SELECT 
    a.id,
    a.organization_id,
    a.agent_id,
    a.name,
    a.webhook_url,
    a.status,
    a.is_validated,
    a.created_at,
    a.updated_at
  FROM system.agents a
  WHERE a.id = v_agent_uuid;
END;
$$;

-- Get agent by webhook URL function
CREATE OR REPLACE FUNCTION system.get_agent_by_webhook_url(
  p_webhook_url TEXT
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  agent_id TEXT,
  name TEXT,
  webhook_url TEXT,
  status TEXT,
  is_validated BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.organization_id,
    a.agent_id,
    a.name,
    a.webhook_url,
    a.status,
    a.is_validated,
    a.created_at,
    a.updated_at
  FROM system.agents a
  WHERE a.webhook_url = p_webhook_url;
END;
$$;

-- Update agent validation status function
CREATE OR REPLACE FUNCTION system.update_agent_validation(
  p_agent_id UUID,
  p_is_validated BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE system.agents 
  SET 
    is_validated = p_is_validated,
    status = CASE 
      WHEN p_is_validated THEN 'active'
      ELSE 'error'
    END,
    error_message = p_error_message,
    last_webhook_received_at = CASE 
      WHEN p_is_validated THEN NOW()
      ELSE last_webhook_received_at
    END,
    updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN FOUND;
END;
$$;
