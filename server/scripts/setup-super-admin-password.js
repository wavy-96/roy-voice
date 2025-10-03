require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupSuperAdminPassword() {
  try {
    console.log('🔧 Setting up super admin password...\n');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update super admin password
    console.log('1️⃣ Updating super admin password...');
    const { data: superAdmin, error: superAdminError } = await supabase.auth.admin.updateUserById(
      '9451d8f8-c672-4ae4-8cbd-253d8c916de8', // Your super admin user ID
      {
        password: 'admin123'
      }
    );

    if (superAdminError) {
      console.log('❌ Super admin password update failed:', superAdminError.message);
    } else {
      console.log('✅ Super admin password updated successfully!');
      console.log('   - Email:', superAdmin.user.email);
      console.log('   - Password: admin123');
    }

    console.log('\n🎉 Super Admin Setup Complete!');
    console.log('\n📋 Login Credentials:');
    console.log('- Email: admin@thecreativehorse.ca');
    console.log('- Password: admin123');
    console.log('\n🌐 Access Dashboard:');
    console.log('- URL: http://localhost:3000');
    console.log('- Role: super_admin');

  } catch (error) {
    console.error('❌ Super admin setup failed:', error.message);
  }
}

setupSuperAdminPassword();
