// ============================================================================
// CREATE MISSING AUTH USERS FOR EMPLOYEES
// ============================================================================
// This script creates auth.users for employees who don't have a uid yet
// Usage: node scripts/create-missing-auth-users.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Use service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default password for new users (should be changed on first login)
const DEFAULT_PASSWORD = 'RSI123456'; // Change this!

async function createMissingAuthUsers() {
  console.log('🚀 Starting migration: Create missing auth users...\n');

  try {
    // Step 1: Get employees without uid
    console.log('📊 Step 1: Fetching employees without uid...');
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('nip, name, email, password')
      .is('uid', null)
      .not('email', 'is', null)
      .not('email', 'eq', '')
      .limit(100); // Process in batches

    if (fetchError) {
      throw fetchError;
    }

    if (!employees || employees.length === 0) {
      console.log('✅ All employees already have uid!');
      return;
    }

    console.log(`Found ${employees.length} employees without uid\n`);

    // Step 2: Check which emails already exist in auth.users
    console.log('🔍 Step 2: Checking which emails already exist in auth.users...');
    const existingAuthUsers = await supabase.auth.admin.listUsers();
    const existingEmails = new Set(
      existingAuthUsers.data.users.map(u => u.email)
    );

    console.log(`Found ${existingEmails.size} existing auth users\n`);

    // Step 3: Create auth users for employees who don't have one
    console.log('🔧 Step 3: Creating auth users...\n');

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      // Skip if email already exists in auth
      if (existingEmails.has(employee.email)) {
        console.log(`⏭️  Skipping ${employee.email} - already exists in auth.users`);
        skippedCount++;
        continue;
      }

      // Skip if no email
      if (!employee.email || employee.email.trim() === '') {
        console.log(`⏭️  Skipping ${employee.nip} - no email`);
        skippedCount++;
        continue;
      }

      try {
        // Create user in auth.users
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email: employee.email,
          password: employee.password || DEFAULT_PASSWORD,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: employee.name,
            nip: employee.nip,
            full_name: employee.name
          }
        });

        if (createError) {
          console.error(`❌ Error creating user for ${employee.email}:`, createError.message);
          errorCount++;
          continue;
        }

        // Update employee with the new uid
        const { error: updateError } = await supabase
          .from('employees')
          .update({ uid: authUser.user.id })
          .eq('nip', employee.nip);

        if (updateError) {
          console.error(`❌ Error updating employee ${employee.nip}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Created auth user for ${employee.email} (${employee.name}) - UID: ${authUser.user.id}`);
          successCount++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`❌ Unexpected error for ${employee.email}:`, err.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${employees.length}`);
    console.log('='.repeat(60));

    // Step 4: Verify remaining employees without uid
    console.log('\n🔍 Step 4: Checking remaining employees without uid...');
    const { data: remaining, error: remainingError } = await supabase
      .from('employees')
      .select('nip, name, email')
      .is('uid', null);

    if (remainingError) {
      console.error('Error checking remaining:', remainingError);
    } else if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  Still have ${remaining.length} employees without uid:`);
      remaining.forEach(emp => {
        console.log(`   - ${emp.nip}: ${emp.name} (${emp.email || 'no email'})`);
      });
    } else {
      console.log('✅ All employees now have uid!');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Alternative: Link existing auth users by email
async function linkExistingAuthUsers() {
  console.log('🔗 Linking employees to existing auth users...\n');

  try {
    // Get employees without uid
    const { data: employees, error } = await supabase
      .from('employees')
      .select('nip, name, email')
      .is('uid', null)
      .not('email', 'is', null)
      .not('email', 'eq', '');

    if (error) throw error;
    if (!employees || employees.length === 0) {
      console.log('✅ No employees to link!');
      return;
    }

    console.log(`Found ${employees.length} employees to check\n`);

    // Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUsersByEmail = {};
    users.forEach(user => {
      if (user.email) {
        authUsersByEmail[user.email.toLowerCase()] = user.id;
      }
    });

    let linkedCount = 0;

    for (const employee of employees) {
      const authUid = authUsersByEmail[employee.email.toLowerCase()];

      if (authUid) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ uid: authUid })
          .eq('nip', employee.nip);

        if (updateError) {
          console.error(`❌ Error linking ${employee.email}:`, updateError.message);
        } else {
          console.log(`✅ Linked ${employee.email} -> ${authUid}`);
          linkedCount++;
        }
      }
    }

    console.log(`\n✅ Linked ${linkedCount} employees to existing auth users`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  if (args.includes('--link-only')) {
    // Only link existing auth users, don't create new ones
    await linkExistingAuthUsers();
  } else {
    // Full process: link existing, then create missing
    await linkExistingAuthUsers();
    console.log('\n' + '='.repeat(60) + '\n');
    await createMissingAuthUsers();
  }

  console.log('\n✨ Done!');
  process.exit(0);
})();
