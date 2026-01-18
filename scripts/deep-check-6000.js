/**
 * Deep check for NIP 6000
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

async function deepCheck() {
  console.log('🔍 Deep checking for NIP 6000...\n');

  try {
    // 1. Get employee details
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('nip', '6000')
      .single();

    console.log('📋 Employee Record:');
    console.log(JSON.stringify(employee, null, 2));
    console.log('');

    // 2. List all auth users
    const { data: { users } } = await supabase.auth.admin.listUsers();

    console.log(`📊 Total auth users: ${users.length}\n`);

    // 3. Search for any user with similar email
    const similarUsers = users.filter(u => {
      const email1 = u.email.toLowerCase();
      const email2 = employee.email.toLowerCase();
      return email1.includes('ediheryanto') || email1.includes('6000');
    });

    if (similarUsers.length > 0) {
      console.log(`✅ Found ${similarUsers.length} similar auth users:`);
      similarUsers.forEach(u => {
        console.log(`   - ${u.email} (ID: ${u.id})`);
      });
    } else {
      console.log('❌ No similar auth users found\n');
    }

    // 4. Try to create new auth user for NIP 6000
    console.log('\n🔧 Creating new auth user for NIP 6000...');

    const newPassword = 'EdiHeryanto@2024'; // You can change this

    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        name: employee.name,
        employee_id: employee.id,
        employee_nip: employee.nip,
        manually_created: true,
        created_at: new Date().toISOString(),
      }
    });

    if (createError) {
      console.log(`❌ Failed to create auth user: ${createError.message}`);

      if (createError.message.includes('already been registered')) {
        console.log('\n⚠️  Email already registered, but not found in user list!');
        console.log('   This might be a Supabase inconsistency.');
        console.log('   Trying alternative approach...\n');

        // Try listing users again with more detail
        console.log('🔍 Checking for hidden auth users...\n');

        for (const user of users) {
          if (user.email.toLowerCase() === employee.email.toLowerCase()) {
            console.log(`✅ FOUND USER: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Created at: ${user.created_at}`);
            console.log(`   Email confirmed: ${user.email_confirmed_at || 'No'}\n`);

            // Link it!
            console.log('🔗 Linking to employee...');
            const { error: linkError } = await supabase
              .from('employees')
              .update({ auth_user_id: user.id, email_verified: true })
              .eq('nip', '6000');

            if (linkError) {
              console.log(`❌ Failed: ${linkError.message}\n`);
            } else {
              console.log('✅ Successfully linked!\n');

              // Verify
              const { data: verify } = await supabase
                .from('employees')
                .select('nip, name, email, auth_user_id, is_active')
                .eq('nip', '6000')
                .single();

              console.log('📊 Updated employee:');
              console.log(`   NIP: ${verify.nip}`);
              console.log(`   auth_user_id: ${verify.auth_user_id}`);
              console.log(`   is_active: ${verify.is_active}`);
              console.log('\n✅ READY TO LOGIN!');
              console.log(`   Use NIP: 6000`);
              console.log(`   Password: (existing password)`);
            }
            return;
          }
        }
      }
      return;
    }

    console.log(`✅ Auth user created successfully!`);
    console.log(`   Email: ${authData.user.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   User ID: ${authData.user.id}\n`);

    // Link to employee
    console.log('🔗 Linking to employee...');
    const { error: linkError } = await supabase
      .from('employees')
      .update({ auth_user_id: authData.user.id, email_verified: true })
      .eq('nip', '6000');

    if (linkError) {
      console.log(`❌ Failed to link: ${linkError.message}\n`);
      return;
    }

    console.log('✅ Successfully linked!\n');

    // Verify
    const { data: verify } = await supabase
      .from('employees')
      .select('nip, name, email, auth_user_id, is_active')
      .eq('nip', '6000')
      .single();

    console.log('📊 Updated employee:');
    console.log(`   NIP: ${verify.nip}`);
    console.log(`   Name: ${verify.name}`);
    console.log(`   Email: ${verify.email}`);
    console.log(`   auth_user_id: ${verify.auth_user_id}`);
    console.log(`   is_active: ${verify.is_active}`);
    console.log('\n✅ READY TO LOGIN!');
    console.log(`   Use NIP: 6000`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  IMPORTANT: Ask user to change password after first login!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

deepCheck();
