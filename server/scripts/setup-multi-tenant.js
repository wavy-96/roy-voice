require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OrganizationService = require('../services/organization');

async function setupMultiTenantSystem() {
  try {
    console.log('🚀 Setting up multi-tenant system...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const organizationService = new OrganizationService();
    
    // 1. Create system schema and tables
    console.log('📊 Creating system schema...');
    console.log('⚠️  Please run the SQL files in your Supabase SQL Editor first:');
    console.log('   1. database/supabase_system_schema.sql');
    console.log('   2. database/supabase_organization_functions.sql');
    console.log('   Then press Enter to continue...');
    
    // Wait for user confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      rl.question('Press Enter after running the SQL files...', () => {
        rl.close();
        resolve();
      });
    });
    
    // 2. Create TheCreativeHorse organization
    console.log('🏢 Creating TheCreativeHorse organization...');
    
    const orgData = {
      name: 'TheCreativeHorse',
      retell_api_key: process.env.RETELL_API_KEY,
      retell_agent_id: process.env.RETELL_AGENT_ID,
      cogs_per_minute: 0.20,
      billing_rate_per_minute: 0.40
    };
    
    let organization;
    try {
      organization = await organizationService.createOrganization(orgData);
      console.log('✅ TheCreativeHorse organization created:', organization.id);
    } catch (error) {
      if (error.message.includes('duplicate key value violates unique constraint')) {
        console.log('⚠️  Organization already exists, using existing one...');
        // Try to get existing organization by name
        const orgs = await organizationService.getAllOrganizations();
        organization = orgs.find(org => org.name === 'TheCreativeHorse');
        if (!organization) {
          throw new Error('Could not find existing TheCreativeHorse organization');
        }
        console.log('✅ Using existing organization:', organization.id);
        
        // Ensure the organization schema exists and is properly configured
        console.log('🔧 Ensuring organization schema exists...');
        try {
          await organizationService.createOrganizationSchema(organization.id, organization.schema_name);
          console.log('✅ Organization schema verified/created');
        } catch (schemaError) {
          console.log('⚠️  Schema creation failed (may already exist):', schemaError.message);
        }
        
        // Fix existing schema if needed
        console.log('🔧 Fixing organization schema...');
        try {
          const { error: fixError } = await supabase
            .rpc('fix_organization_schema', {
              schema_name: organization.schema_name
            });
          if (fixError) {
            console.log('⚠️  Schema fix failed:', fixError.message);
          } else {
            console.log('✅ Organization schema fixed');
          }
        } catch (fixError) {
          console.log('⚠️  Schema fix error:', fixError.message);
        }
      } else {
        throw error;
      }
    }
    
    // 3. Migrate existing calls data
    console.log('📦 Migrating existing calls data...');
    
    // Get all existing calls from the current calls table
    const { data: existingCalls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .order('started_at', { ascending: false });
    
    if (callsError) {
      throw new Error(`Failed to fetch existing calls: ${callsError.message}`);
    }
    
    console.log(`Found ${existingCalls.length} existing calls to migrate`);
    
    // Insert calls into the organization's schema using RPC
    if (existingCalls.length > 0) {
      const { data: migratedCount, error: insertError } = await supabase
        .rpc('migrate_calls_to_organization', {
          org_id: organization.id,
          schema_name: organization.schema_name,
          calls_data: existingCalls
        });
      
      if (insertError) {
        throw new Error(`Failed to migrate calls: ${insertError.message}`);
      }
      
      console.log(`✅ Migrated ${migratedCount} calls to ${organization.schema_name}.calls`);
    }
    
    // 4. Create super admin user (skip for now - will be handled by Supabase Auth)
    console.log('👤 Super admin user creation will be handled by Supabase Auth dashboard');
    console.log('📋 Please create your super admin user manually in Supabase Auth dashboard');
    
    // Skip super admin creation for now
    /*
    const crypto = require('crypto');
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    const passwordHash = crypto.createHash('sha256').update(superAdminPassword).digest('hex');
    
    const { data: superAdmin, error: adminError } = await supabase
      .from('system.system_users')
      .insert({
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@thecreativehorse.ca',
        password_hash: passwordHash,
        role: 'super_admin',
        first_name: 'Super',
        last_name: 'Admin'
      })
      .select()
      .single();
    
    if (adminError) {
      throw new Error(`Failed to create super admin: ${adminError.message}`);
    }
    
    console.log('✅ Super admin user created:', superAdmin.email);
    */
    
    // 5. Create organization admin user (skip for now - will be handled by Supabase Auth)
    console.log('👥 Organization admin user creation will be handled by Supabase Auth dashboard');
    console.log('📋 Please create organization admin users manually in Supabase Auth dashboard');
    
    // Skip organization admin creation for now
    /*
    const orgAdminPassword = process.env.ORG_ADMIN_PASSWORD || 'admin123';
    const orgPasswordHash = crypto.createHash('sha256').update(orgAdminPassword).digest('hex');
    
    const orgAdmin = await organizationService.createOrganizationUser(organization.id, {
      email: process.env.ORG_ADMIN_EMAIL || 'admin@thecreativehorse.ca',
      password: orgAdminPassword,
      role: 'admin',
      first_name: 'Organization',
      last_name: 'Admin'
    });
    
    console.log('✅ Organization admin user created:', orgAdmin.email);
    */
    
    // 6. Log migration activity
    await organizationService.logActivity(organization.id, 'system_migration', {
      calls_migrated: existingCalls.length,
      migration_date: new Date().toISOString()
    });
    
    console.log('🎉 Multi-tenant system setup complete!');
    console.log('\n📋 Summary:');
    console.log(`- Organization: ${organization.name} (${organization.domain})`);
    console.log(`- Schema: ${organization.schema_name}`);
    console.log(`- Calls migrated: ${existingCalls.length}`);
    console.log('- Super admin: To be created in Supabase Auth dashboard');
    console.log('- Org admin: To be created in Supabase Auth dashboard');
    console.log('\n🔐 Next steps:');
    console.log('1. Create super admin user in Supabase Auth dashboard');
    console.log('2. Create organization admin users in Supabase Auth dashboard');
    console.log('3. Test the multi-tenant system');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  setupMultiTenantSystem()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = setupMultiTenantSystem;
