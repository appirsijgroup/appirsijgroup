/**
 * Fix NIP 6000 - Link existing auth user to employee
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixNIP6000() {
  console.log('🔧 Fixing NIP 6000 login issue...\n');

  try {
    // 1. Get employee with NIP 6000
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('nip', '6000')
      .single();

    if (empError) throw empError;

    console.log('📋 Employee found:');
    console.log(`   Name: ${employee.name}`);
    console.log(`   NIP: ${employee.nip}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   auth_user_id: ${employee.auth_user_id || 'NULL'}\n`);

    // 2. List all auth users to find matching email
    const { data: { users } } = await supabase.auth.admin.listUsers();

    const existingUser = users.find(u => u.email === employee.email);

    if (existingUser) {
      console.log('✅ Found existing auth user:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Email confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}\n`);

      // 3. Link employee to existing auth user
      console.log('🔗 Linking employee to existing auth user...');

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          auth_user_id: existingUser.id,
          email_verified: existingUser.email_confirmed_at ? true : false
        })
        .eq('nip', '6000');

      if (updateError) {
        console.log(`❌ Failed to link: ${updateError.message}\n`);
        return;
      }

      console.log('✅ Successfully linked!\n');

      // 4. Verify
      const { data: updated } = await supabase
        .from('employees')
        .select('nip, name, email, auth_user_id, email_verified, is_active')
        .eq('nip', '6000')
        .single();

      console.log('📊 Updated employee record:');
      console.log(`   NIP: ${updated.nip}`);
      console.log(`   Name: ${updated.name}`);
      console.log(`   Email: ${updated.email}`);
      console.log(`   auth_user_id: ${updated.auth_user_id}`);
      console.log(`   email_verified: ${updated.email_verified}`);
      console.log(`   is_active: ${updated.is_active}\n`);

      console.log('✅ NIP 6000 is now ready for login!');
      console.log('ℹ️  User can login with:');
      console.log(`   - NIP: 6000`);
      console.log(`   - Email: ${updated.email}`);
      console.log('   - Password: (password yang sudah ada sebelumnya)\n');

    } else {
      console.log('❌ No existing auth user found with that email');
      console.log('ℹ️  User may need to reset password or register new account\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixNIP6000();
