-- Fix the ambiguous "id" error in get_organization_calls function

CREATE OR REPLACE FUNCTION public.get_organization_calls(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_from_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_to_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_is_billable BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    external_call_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    direction TEXT,
    from_e164 TEXT,
    to_e164 TEXT,
    status TEXT,
    end_reason TEXT,
    duration_seconds INTEGER,
    billed_minutes NUMERIC,
    outcome TEXT,
    detailed_summary TEXT,
    transcript TEXT,
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID,
    agent_id TEXT,
    is_billable BOOLEAN,
    has_more BOOLEAN,
    next_cursor TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_schema_name TEXT;
    v_query TEXT;
    v_has_more_conditions TEXT := '';
    v_main_conditions TEXT := '';
    v_param_count INTEGER := 3; -- Start after p_org_id, p_limit, p_cursor
BEGIN
    -- Get the schema name for the given organization ID
    SELECT schema_name INTO v_schema_name FROM system.organizations WHERE system.organizations.id = p_org_id;

    IF v_schema_name IS NULL THEN
        RAISE EXCEPTION 'Organization with ID % not found', p_org_id;
    END IF;

    -- Build has_more conditions
    IF p_cursor IS NOT NULL THEN
        v_has_more_conditions := v_has_more_conditions || ' AND sub.created_at < $3 ';
    END IF;
    
    IF p_from_date IS NOT NULL THEN
        v_has_more_conditions := v_has_more_conditions || format(' AND sub.created_at >= $%s ', v_param_count + 1);
        v_param_count := v_param_count + 1;
    END IF;
    
    IF p_to_date IS NOT NULL THEN
        v_has_more_conditions := v_has_more_conditions || format(' AND sub.created_at <= $%s ', v_param_count + 1);
        v_param_count := v_param_count + 1;
    END IF;
    
    IF p_is_billable IS NOT NULL THEN
        v_has_more_conditions := v_has_more_conditions || format(' AND sub.is_billable = $%s ', v_param_count + 1);
    END IF;

    -- Build main query conditions
    v_param_count := 3; -- Reset for main conditions
    
    IF p_cursor IS NOT NULL THEN
        v_main_conditions := v_main_conditions || ' AND c.created_at < $3 ';
    END IF;
    
    IF p_from_date IS NOT NULL THEN
        v_main_conditions := v_main_conditions || format(' AND c.created_at >= $%s ', v_param_count + 1);
        v_param_count := v_param_count + 1;
    END IF;
    
    IF p_to_date IS NOT NULL THEN
        v_main_conditions := v_main_conditions || format(' AND c.created_at <= $%s ', v_param_count + 1);
        v_param_count := v_param_count + 1;
    END IF;
    
    IF p_is_billable IS NOT NULL THEN
        v_main_conditions := v_main_conditions || format(' AND c.is_billable = $%s ', v_param_count + 1);
    END IF;

    -- Construct the dynamic SQL query for calls
    v_query := format('
        SELECT
            c.id,
            c.external_call_id,
            c.started_at,
            c.connected_at,
            c.ended_at,
            c.direction,
            c.from_e164,
            c.to_e164,
            c.status,
            c.end_reason,
            c.duration_seconds,
            c.billed_minutes,
            c.outcome,
            c.detailed_summary,
            c.transcript,
            c.raw,
            c.created_at,
            c.updated_at,
            c.organization_id,
            c.agent_id,
            c.is_billable,
            EXISTS (
                SELECT 1
                FROM %I.calls sub
                WHERE sub.created_at < c.created_at
                AND sub.organization_id = c.organization_id
                %s
            ) AS has_more,
            c.created_at AS next_cursor
        FROM %I.calls c
        WHERE c.organization_id = $1
        %s
        ORDER BY c.created_at DESC
        LIMIT $2
    ', v_schema_name, v_has_more_conditions, v_schema_name, v_main_conditions);

    -- Execute with all parameters
    RETURN QUERY EXECUTE v_query
    USING p_org_id, p_limit, p_cursor, p_from_date, p_to_date, p_is_billable;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

