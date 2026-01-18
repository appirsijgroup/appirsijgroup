/**
 * MIGRATION SCRIPT: Import Existing Employees to Supabase Auth
 *
 * CLARIFICATION: NIP = id (employee ID)
 *
 * This script will:
 * 1. Find all employees without auth_user_id
 * 2. Create Supabase Auth user for each
 * 3. Update employee record with auth_user_id
 * 4. Generate random password for each user
 *
 * Usage:
 *   npm run migrate-employees
 *   OR
 *   node scripts/migrate-employees-to-auth.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Get service role key from: https://app.supabase.com');
  console.error('   Project → Settings → API → service_role key');
  process.exit(1);
}

// Create service role client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate secure random password
 */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = '';
  const array = new Uint32Array(length);

  // Use Web Crypto API if available (Node.js 15+)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for older Node.js
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return password;
}

/**
 * Migrate employees to Supabase Auth
 */
async function migrateEmployees() {
  console.log('🚀 Starting migration of existing employees to Supabase Auth...\n');
  console.log('ℹ️  NIP (Nomor Pegawai) is a separate column from UUID id\n');

  try {
    // STEP 1: Get all employees without auth_user_id
    console.log('📋 Step 1: Finding employees without Supabase Auth...');

    // Get ALL employees, then filter manually
    const { data: allEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('*');

    if (fetchError) throw fetchError;

    console.log(`📊 Total employees fetched: ${allEmployees?.length || 0}`);

    // Filter for employees without auth_user_id AND with email
    const employees = allEmployees.filter(emp =>
      (!emp.auth_user_id || emp.auth_user_id === '' || emp.auth_user_id === null) &&
      emp.email && emp.email !== '' && emp.email !== null
    );

    if (!employees || employees.length === 0) {
      console.log('✅ No employees found or all already have auth_user_id.');
      console.log('ℹ️  If you think this is incorrect, check your database directly.');
      return;
    }

    console.log(`✅ Found ${employees.length} employees to migrate\n`);

    // STEP 2: For each employee, create Supabase Auth user
    let successCount = 0;
    let failedCount = 0;
    const failedEmployees = [];

    for (const employee of employees) {
      try {
        console.log(`📝 Migrating: ${employee.name} (${employee.email})`);
        console.log(`   ID: ${employee.id}`);
        console.log(`   NIP: ${employee.nip || 'N/A'}`);

        // Skip if no email
        if (!employee.email) {
          console.log(`   ⚠️  Skipped: No email address\n`);
          failedCount++;
          failedEmployees.push({ ...employee, reason: 'No email' });
          continue;
        }

        // Skip if no NIP (warn but continue)
        if (!employee.nip) {
          console.log(`   ⚠️  Warning: No NIP - user can only login with email\n`);
        }

        // Generate random password
        const password = generatePassword(12);

        // Create Supabase Auth user
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: employee.email,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: employee.name,
            employee_id: employee.id,
            employee_nip: employee.nip,
            migrated: true,
            migrated_at: new Date().toISOString(),
          }
        });

        if (createError) {
          console.log(`   ❌ Failed: ${createError.message}`);
          console.log(`   Error details:`, JSON.stringify(createError, null, 2));

          // Check if user already exists
          if (createError.message.includes('User already registered')) {
            console.log(`   ℹ️  User already exists in Supabase Auth, linking...`);

            // Get existing user from Supabase Auth
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === employee.email);

            if (existingUser) {
              // Link employee to existing auth user
              const { error: updateError } = await supabase
                .from('employees')
                .update({ auth_user_id: existingUser.id })
                .eq('id', employee.id);

              if (updateError) {
                console.log(`   ❌ Failed to link: ${updateError.message}\n`);
                failedCount++;
                failedEmployees.push({ ...employee, reason: updateError.message });
              } else {
                console.log(`   ✅ Linked to existing auth user\n`);
                successCount++;
              }
            }
          } else {
            failedCount++;
            failedEmployees.push({ ...employee, reason: createError.message });
          }
          console.log('');
          continue;
        }

        if (!authData.user) {
          console.log(`   ❌ Failed: No user data returned\n`);
          failedCount++;
          failedEmployees.push({ ...employee, reason: 'No user data' });
          continue;
        }

        // Update employee record with auth_user_id
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            auth_user_id: authData.user.id,
            password: password, // Store generated password
            email_verified: true
          })
          .eq('id', employee.id);

        if (updateError) {
          // Rollback: Delete auth user
          await supabase.auth.admin.deleteUser(authData.user.id);

          console.log(`   ❌ Failed to update employee: ${updateError.message}`);
          console.log(`   ↩️  Rolled back: Auth user deleted\n`);

          failedCount++;
          failedEmployees.push({ ...employee, reason: updateError.message });
          continue;
        }

        console.log(`   ✅ Success! Password: ${password}\n`);
        successCount++;

      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}\n`);
        failedCount++;
        failedEmployees.push({ ...employee, reason: err.message });
      }
    }

    // STEP 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total employees processed: ${employees.length}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('='.repeat(60));

    if (failedEmployees.length > 0) {
      console.log('\n❌ FAILED EMPLOYEES:');
      failedEmployees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.email})`);
        console.log(`      ID: ${emp.id}`);
        console.log(`      NIP: ${emp.nip || 'N/A'}`);
        console.log(`      Reason: ${emp.reason}`);
      });
    }

    // STEP 4: Save passwords to file
    const passwordsFile = path.join(process.cwd(), 'migrated-passwords.txt');
    let passwordsContent = `MIGRATED EMPLOYEES - Generated Passwords
${'='.repeat(60)}
Generated: ${new Date().toISOString().split('T')[0]}

💡 IMPORTANT:
   - ID = UUID (database identifier)
   - NIP = Nomor Pegawai (for login)
   - Users can login with EITHER NIP or Email

${'='.repeat(60)}
${'No.'.padEnd(5)} | ${'NIP'.padEnd(15)} | ${'Name'.padEnd(30)} | ${'Email'.padEnd(30)} | ${'Password'.padEnd(15)}
${'='.repeat(60)}\n`;

    passwordsContent += employees
      .filter(emp => emp.email)
      .map((emp, index) => {
        const nip = emp.nip || 'N/A';
        return `${(index + 1).toString().padEnd(5)} | ${nip.padEnd(15)} | ${emp.name.padEnd(30)} | ${emp.email.padEnd(30)} | ${generatePassword(12)}`;
      })
      .join('\n');

    passwordsContent += '\n' + '='.repeat(60) + '\n';
    passwordsContent += '⚠️  IMPORTANT: Share these passwords securely with employees!\n';
    passwordsContent += '             Ask them to change password after first login.\n';
    passwordsContent += '\n💡 Login options:\n';
    passwordsContent += '   - Use NIP to login\n';
    passwordsContent += '   - Use Email to login\n';
    passwordsContent += '   - Change password after first login\n';

    fs.writeFileSync(passwordsFile, passwordsContent);

    console.log(`\n📄 Passwords saved to: ${passwordsFile}`);
    console.log('⚠️  IMPORTANT: Distribute these passwords to employees securely!');
    console.log('ℹ️  Ask employees to change password after first login\n');

    console.log('✅ Migration completed!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure NEXT_PUBLIC_SUPABASE_URL is set in .env.local');
    console.error('   2. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    console.error('   3. Get service role key: https://app.supabase.com');
    console.error('      Project → Settings → API → service_role key\n');
    process.exit(1);
  }
}

// Run migration
migrateEmployees();
