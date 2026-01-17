const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEmployee6000() {
  const email = 'mas.ediheryanto@gmail.com';
  const password = 'sukapura123';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  FIX EMPLOYEE 6000 - EDI HERYANTO                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Step 1: Get all users to find the user ID
    console.log('🔍 Step 1: Finding auth user for ' + email + '...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log('❌ Failed to list users:', listError.message);
      return;
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ Auth user NOT FOUND for ' + email);
      console.log('');
      console.log('This is strange - you said it exists but we cannot find it.');
      console.log('');
      console.log('Please check in Supabase Dashboard:');
      console.log('Authentication → Users → search for: ' + email);
      console.log('');
      console.log('If you see the user there, note down the User ID and run:');
      console.log(`UPDATE employees SET auth_user_id = '<USER_ID>' WHERE nip = '6000';`);
      return;
    }

    console.log('✅ Found auth user!');
    console.log('   User ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);
    console.log('   Last sign in:', authUser.last_sign_in_at || 'Never');
    console.log('');

    // Step 2: Reset password
    console.log('🔐 Step 2: Resetting password to: ' + password);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: password,
        email_confirm: true
      }
    );

    if (updateError) {
      console.log('❌ Failed to reset password:', updateError.message);
      console.log('');
      console.log('Trying alternative approach...');
      console.log('Please reset password manually in Supabase Dashboard:');
      console.log('1. Authentication → Users');
      console.log('2. Find user: ' + email);
      console.log('3. Click "Reset password"');
      console.log('4. Set password to: ' + password);
    } else {
      console.log('✅ Password reset successful!');
    }

    console.log('');

    // Step 3: Link to employee
    console.log('🔗 Step 3: Linking auth user to employee 6000...');

    // First, check if employee already has auth_user_id
    const { data: employee } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id')
      .eq('nip', '6000')
      .single();

    if (employee.auth_user_id) {
      console.log('⚠️  Employee already has auth_user_id:', employee.auth_user_id);
      console.log('');

      if (employee.auth_user_id === authUser.id) {
        console.log('✅ Already linked to the correct user!');
      } else {
        console.log('⚠️  Linked to DIFFERENT auth user!');
        console.log('   Current:', employee.auth_user_id);
        console.log('   Should be:', authUser.id);
        console.log('');
        console.log('Updating...');

        const { error: updateError } = await supabase
          .from('employees')
          .update({ auth_user_id: authUser.id })
          .eq('nip', '6000');

        if (updateError) {
          console.log('❌ Failed to update:', updateError.message);
        } else {
          console.log('✅ Updated successfully!');
        }
      }
    } else {
      console.log('Employee does not have auth_user_id yet. Setting it...');

      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_user_id: authUser.id })
        .eq('nip', '6000');

      if (updateError) {
        console.log('❌ Failed to update:', updateError.message);
      } else {
        console.log('✅ auth_user_id set successfully!');
      }
    }

    console.log('');

    // Step 4: Verify
    console.log('🔍 Step 4: Verifying setup...');
    const { data: finalEmployee } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id')
      .eq('nip', '6000')
      .single();

    console.log('✅ Employee 6000 status:');
    console.log('   - NIP:', finalEmployee.nip);
    console.log('   - Name:', finalEmployee.name);
    console.log('   - Email:', finalEmployee.email);
    console.log('   - auth_user_id:', finalEmployee.auth_user_id || 'NOT SET');
    console.log('');

    if (finalEmployee.auth_user_id === authUser.id) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ SUCCESS! EMPLOYEE 6000 IS READY FOR LOGIN              ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('🔐 LOGIN CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   NIP:      6000');
      console.log('   Password: ' + password);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Silakan coba login sekarang!');
    } else {
      console.log('❌ Something went wrong. auth_user_id not set correctly.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

fixEmployee6000();
