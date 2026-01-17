/**
 * LINK EXISTING AUTH USERS TO EMPLOYEES
 *
 * This script will find auth users that already exist and link them
 * to employees by updating the auth_user_id column.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function linkExistingAuthUsers() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  LINK EXISTING AUTH USERS TO EMPLOYEES                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Step 1: Get all auth users
    console.log('🔍 Step 1: Fetching all auth users from Supabase...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Failed to fetch auth users:', authError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} auth users`);

    // Step 2: Get employees without auth_user_id
    console.log('\n🔍 Step 2: Finding employees without auth_user_id...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id')
      .is('auth_user_id', null)
      .not('email', 'is', null);

    if (empError) {
      console.log('❌ Failed to fetch employees:', empError.message);
      process.exit(1);
    }

    if (!employees || employees.length === 0) {
      console.log('✅ All employees already have auth_user_id!');
      process.exit(0);
    }

    console.log(`✅ Found ${employees.length} employees to link`);

    // Step 3: Create email -> auth user map
    console.log('\n🔍 Step 3: Creating email to auth user mapping...');
    const emailToAuthUser = new Map<string, string>();

    for (const user of users) {
      if (user.email) {
        emailToAuthUser.set(user.email, user.id);
      }
    }

    console.log(`✅ Mapped ${emailToAuthUser.size} emails`);

    // Step 4: Link employees to auth users
    console.log('\n🔗 Step 4: Linking employees to auth users...\n');

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const authUserId = emailToAuthUser.get(employee.email);

      console.log(`[${i + 1}/${employees.length}] ${employee.name}`);

      if (!authUserId) {
        console.log(`  ⚠️  No auth user found for ${employee.email}`);
        notFoundCount++;
        continue;
      }

      // Update employee with auth_user_id
      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_user_id: authUserId })
        .eq('id', employee.id);

      if (updateError) {
        console.log(`  ❌ Failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Linked to auth user: ${authUserId}`);
        successCount++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  LINKING COMPLETE                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully linked: ${successCount}`);
    console.log(`   ⚠️  Auth user not found: ${notFoundCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total: ${employees.length}`);
    console.log('');

    // Check for employee 6000 specifically
    console.log('🔍 Checking employee 6000 (Edi Heryanto)...');
    const { data: emp6000 } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id')
      .eq('nip', '6000')
      .single();

    if (emp6000) {
      console.log(`  ✅ Employee found`);
      console.log(`  - NIP: ${emp6000.nip}`);
      console.log(`  - Name: ${emp6000.name}`);
      console.log(`  - Email: ${emp6000.email}`);
      console.log(`  - auth_user_id: ${emp6000.auth_user_id || 'NOT LINKED'}`);

      if (emp6000.auth_user_id) {
        console.log('\n✅ Employee 6000 is ready for login!');
        console.log('   You can now login with:');
        console.log('   - NIP: 6000');
        console.log('   - Password: (the password set in Supabase Auth)');
        console.log('\n   If you don\'t know the password, reset it in Supabase Dashboard:');
        console.log('   Authentication → Users → search: mas.ediheryanto@gmail.com');
      } else {
        console.log('\n❌ Employee 6000 auth_user_id is still NULL');
        console.log('   Auth user may not exist. Check Supabase Dashboard.');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

linkExistingAuthUsers();
