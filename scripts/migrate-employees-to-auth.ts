/**
 * MIGRATION SCRIPT: Import Existing Employees to Supabase Auth
 *
 * This script will:
 * 1. Find all employees without auth_user_id
 * 2. Create Supabase Auth user for each
 * 3. Update employee record with auth_user_id
 * 4. Generate random password for each user
 *
 * Usage:
 *   npx tsx scripts/migrate-employees-to-auth.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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
function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

/**
 * Migrate employees to Supabase Auth
 */
async function migrateEmployees() {
  console.log('🚀 Starting migration of existing employees to Supabase Auth...\n');

  try {
    // STEP 1: Get all employees without auth_user_id
    console.log('📋 Step 1: Finding employees without Supabase Auth...');

    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .is('auth_user_id', null)
      .is('email', null, false);

    if (fetchError) {
      throw fetchError;
    }

    if (!employees || employees.length === 0) {
      console.log('✅ No employees need migration. All employees already have Supabase Auth.');
      return;
    }

    console.log(`✅ Found ${employees.length} employees to migrate\n`);

    // STEP 2: For each employee, create Supabase Auth user
    let successCount = 0;
    let failedCount = 0;
    const failedEmployees: any[] = [];

    for (const employee of employees) {
      try {
        console.log(`📝 Migrating: ${employee.name} (${employee.email || 'No Email'})`);

        // Skip if no email
        if (!employee.email) {
          console.log(`   ⚠️  Skipped: No email address\n`);
          failedCount++;
          failedEmployees.push({ ...employee, reason: 'No email' });
          continue;
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
            migrated: true,
            migrated_at: new Date().toISOString(),
            original_id: employee.id
          }
        });

        if (createError) {
          console.log(`   ❌ Failed: ${createError.message}`);

          // Check if user already exists
          if (createError.message.includes('User already registered')) {
            console.log(`   ℹ️  User already exists in Supabase Auth, linking...`);

            // Get existing user from Supabase Auth
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === employee.email);

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

      } catch (err: any) {
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
        console.log(`   ${index + 1}. ${emp.name} (${emp.email || 'No Email'})`);
        console.log(`      Reason: ${emp.reason}`);
      });
    }

    // STEP 4: Save passwords to file
    const passwordsFile = path.join(process.cwd(), 'migrated-passwords.txt');
    const passwordsContent = employees
      .filter(emp => emp.email)
      .map(emp => {
        const password = generatePassword(12); // Re-generate for display (same logic)
        return `${emp.name} | ${emp.email} | ${emp.nip || 'N/A'} | ${password}`;
      })
      .join('\n');

    fs.writeFileSync(passwordsFile, `MIGRATED EMPLOYEES - Generated Passwords\n${'='.repeat(60)}\n\n${passwordsContent}\n`);

    console.log(`\n📄 Passwords saved to: ${passwordsFile}`);
    console.log('⚠️  IMPORTANT: Distribute these passwords to employees securely!\n');

    console.log('✅ Migration completed!\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateEmployees();
