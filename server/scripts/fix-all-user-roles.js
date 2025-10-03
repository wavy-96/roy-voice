require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixAllUserRoles() {
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

    console.log('🔍 Fetching all users...');
    
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    console.log(`📊 Found ${users.length} users`);
    
    // Find users with old role names
    const usersToFix = users.filter(user => {
      const role = user.user_metadata?.role;
      return role === 'admin' || role === 'viewer';
    });
    
    if (usersToFix.length === 0) {
      console.log('✅ No users with old role names found. All users have correct roles!');
      return;
    }
    
    console.log(`\n🔧 Found ${usersToFix.length} users with old role names:`);
    usersToFix.forEach(user => {
      console.log(`  - ${user.email} (${user.user_metadata?.role})`);
    });
    
    // Fix each user
    let fixedCount = 0;
    for (const user of usersToFix) {
      try {
        const oldRole = user.user_metadata?.role;
        const newRole = oldRole === 'admin' ? 'org_admin' : 'org_viewer';
        
        console.log(`\n🔄 Fixing ${user.email}: ${oldRole} → ${newRole}`);
        
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              role: newRole
            }
          }
        );
        
        if (updateError) {
          console.error(`❌ Failed to update ${user.email}: ${updateError.message}`);
        } else {
          console.log(`✅ Updated ${user.email} successfully`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} out of ${usersToFix.length} users`);
    
    // Show final status
    console.log('\n📊 Final user roles:');
    const { data: { users: finalUsers }, error: finalError } = await supabase.auth.admin.listUsers();
    
    if (!finalError) {
      finalUsers.forEach(user => {
        const role = user.user_metadata?.role || 'NONE';
        const org = user.user_metadata?.organization_name || 'No org';
        console.log(`  - ${user.email}: ${role} (${org})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
fixAllUserRoles().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
