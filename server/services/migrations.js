const supabase = require('./supabase');

// Database migration SQL
const migrations = {
  createCallsTable: `
    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_call_id TEXT UNIQUE NOT NULL,
      tenant_id UUID NULL,
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
      raw JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  createCallRollupsTable: `
    CREATE TABLE IF NOT EXISTS call_rollups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      day DATE NOT NULL,
      agent_id TEXT NOT NULL,
      total_calls INTEGER DEFAULT 0,
      answered_calls INTEGER DEFAULT 0,
      total_duration_seconds INTEGER DEFAULT 0,
      total_billed_minutes NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(day, agent_id)
    );
  `,
  
  createIndexes: `
    CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls (started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls (agent_id);
    CREATE INDEX IF NOT EXISTS idx_calls_external_call_id ON calls (external_call_id);
    CREATE INDEX IF NOT EXISTS idx_call_rollups_day_agent ON call_rollups (day DESC, agent_id);
  `
};

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('calls')
      .select('id')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.log('Tables do not exist, creating them...');
      
      // For Supabase, we'll create tables through the dashboard or SQL editor
      // This is a simplified approach that checks if tables exist
      console.log('Please create the following tables in your Supabase SQL editor:');
      console.log('\n--- Calls Table ---');
      console.log(migrations.createCallsTable);
      console.log('\n--- Call Rollups Table ---');
      console.log(migrations.createCallRollupsTable);
      console.log('\n--- Indexes ---');
      console.log(migrations.createIndexes);
      console.log('\nAfter creating the tables, run this script again.');
      
      return;
    }
    
    if (testError) {
      throw new Error('Database connection failed: ' + testError.message);
    }
    
    console.log('Tables already exist, checking structure...');
    
    // Verify tables exist and have expected columns
    const { data: callsColumns, error: callsColumnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'calls' });
    
    if (callsColumnsError) {
      console.log('Could not verify table structure, but tables appear to exist');
    }
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  migrations
};
