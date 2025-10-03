require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixUserRole() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const userEmail = 'orgadmin@thejoey.ca';
    
    console.log(`🔍 Looking for user: ${userEmail}`);
    
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    // Find the user
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      console.log('\nAvailable users:');
      users.forEach(u => {
        console.log(`  - ${u.email} (role: ${u.user_metadata?.role || 'NONE'})`);
      });
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Current role: ${user.user_metadata?.role || 'NONE'}`);
    console.log(`   Organization ID: ${user.user_metadata?.organization_id || 'NONE'}`);
    
    // Get organization
    const { data: orgs, error: orgsError } = await supabase.rpc('list_organizations');
    
    if (orgsError) {
      throw new Error(`Failed to list organizations: ${orgsError.message}`);
    }
    
    // Use the organization the user is already assigned to
    const currentOrgId = user.user_metadata?.organization_id;
    let targetOrg = null;
    
    if (currentOrgId) {
      targetOrg = orgs.find(org => org.id === currentOrgId);
      console.log(`\n🏢 Using current organization: ${targetOrg?.name || 'Unknown'}`);
    }
    
    if (!targetOrg) {
      console.log('\n⚠️  No organization assigned.');
      console.log('\nAvailable organizations:');
      orgs.forEach(org => {
        console.log(`  - ${org.name} (${org.slug}) - ID: ${org.id}`);
      });
      console.log('\nUsing first available organization...');
      targetOrg = orgs[0];
    }
    
    console.log(`\n🏢 Target organization: ${targetOrg.name}`);
    console.log(`   Organization ID: ${targetOrg.id}`);
    console.log(`   Slug: ${targetOrg.slug}`);
    
    // Update user with correct role and organization
    console.log(`\n🔧 Updating user metadata...`);
    
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'org_admin',
          organization_id: targetOrg.id,
          organization_name: targetOrg.name,
          organization_slug: targetOrg.slug,
          first_name: user.user_metadata?.first_name || 'Organization',
          last_name: user.user_metadata?.last_name || 'Admin'
        }
      }
    );
    
    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }
    
    console.log(`\n✅ User updated successfully!`);
    console.log(`\nUpdated user details:`);
    console.log(`  Email: ${updatedUser.user.email}`);
    console.log(`  Role: ${updatedUser.user.user_metadata.role}`);
    console.log(`  Organization: ${updatedUser.user.user_metadata.organization_name}`);
    console.log(`  Organization ID: ${updatedUser.user.user_metadata.organization_id}`);
    
    console.log(`\n🎉 User can now log in with role: org_admin`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
fixUserRole().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

