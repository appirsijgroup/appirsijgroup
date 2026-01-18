/**
 * MIGRATE ALL EMPLOYEES TO SUPABASE AUTH
 *
 * This script will:
 * 1. Find all employees without auth_user_id
 * 2. Create Supabase Auth user for each
 * 3. Update employee record with auth_user_id
 * 4. Generate random secure passwords
 * 5. Save passwords to migrated-passwords.txt
 *
 * Usage:
 *   npx tsx scripts/migrate-all-employees-to-auth.ts
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
 * Migrate a single employee
 */
async function migrateEmployee(employee: any, passwords: Map<string, string>): Promise<boolean> {
  try {
    // Generate password
    const tempPassword = generatePassword(12);

    console.log(`\n📧 Migrating: ${employee.name} (${employee.email})`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: employee.name,
        nip: employee.nip,
        role: employee.role,
        employee_id: employee.id
      }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        console.log(`  ⚠️  Auth user already exists for ${employee.email}`);

        // Try to find existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === employee.email);

        if (existingUser) {
          // Update employee record with existing auth user ID
          const { error: updateError } = await supabase
            .from('employees')
            .update({ auth_user_id: existingUser.id })
            .eq('id', employee.id);

          if (updateError) {
            console.log(`  ❌ Failed to update auth_user_id: ${updateError.message}`);
            return false;
          }

          console.log(`  ✅ Linked to existing auth user: ${existingUser.id}`);
          console.log(`  ⚠️  PASSWORD UNKNOWN - User needs to reset password`);
          passwords.set(employee.email, 'PASSWORD_RESET_REQUIRED');
          return true;
        }
      }

      console.log(`  ❌ Failed: ${authError.message}`);
      return false;
    }

    // Update employee record with auth user ID
    const { error: updateError } = await supabase
      .from('employees')
      .update({ auth_user_id: authData.user.id })
      .eq('id', employee.id);

    if (updateError) {
      console.log(`  ❌ Failed to update auth_user_id: ${updateError.message}`);
      return false;
    }

    // Save password
    passwords.set(employee.email, tempPassword);

    console.log(`  ✅ Success! Auth user created: ${authData.user.id}`);
    console.log(`  🔐 Password: ${tempPassword}`);

    return true;

  } catch (error: any) {
    console.log(`  ❌ Exception: ${error.message}`);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateAllEmployees() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATE ALL EMPLOYEES TO SUPABASE AUTH                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Check if auth_user_id column exists
    console.log('🔍 Step 1: Checking database schema...');
    const { data: testEmployee, error: schemaError } = await supabase
      .from('employees')
      .select('id, auth_user_id')
      .limit(1);

    if (schemaError && schemaError.message.includes('auth_user_id')) {
      console.log('');
      console.log('❌ ERROR: auth_user_id column does not exist!');
      console.log('');
      console.log('Please run this SQL in Supabase Dashboard first:');
      console.log('');
      console.log('ALTER TABLE employees');
      console.log('  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;');
      console.log('');
      process.exit(1);
    }

    console.log('✅ Schema OK\n');

    // Find all employees without auth_user_id
    console.log('🔍 Step 2: Finding employees without auth_user_id...');
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, nip, name, email, role, auth_user_id')
      .is('auth_user_id', null)
      .not('email', 'is', null);

    if (fetchError) {
      console.log('❌ Failed to fetch employees:', fetchError.message);
      process.exit(1);
    }

    if (!employees || employees.length === 0) {
      console.log('✅ All employees already have auth_user_id!');
      console.log('No migration needed.');
      process.exit(0);
    }

    console.log(`✅ Found ${employees.length} employees to migrate\n`);

    // Get stats
    const { count: totalCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Stats:`);
    console.log(`   Total employees: ${totalCount}`);
    console.log(`   Need migration: ${employees.length}`);
    console.log(`   Already migrated: ${(totalCount || 0) - employees.length}`);
    console.log('');

    // Confirm
    console.log('⚠️  This will create Supabase Auth users for ALL employees above.');
    console.log('    New passwords will be generated and saved to migrated-passwords.txt');
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Migrate each employee
    console.log('🚀 Step 3: Starting migration...\n');

    const passwords = new Map<string, string>();
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      console.log(`[${i + 1}/${employees.length}]`);

      const success = await migrateEmployee(employee, passwords);

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Save passwords to file
    console.log('\n📝 Step 4: Saving passwords to file...');

    const passwordFilePath = path.join(process.cwd(), 'migrated-passwords.txt');
    let fileContent = '═'.repeat(60) + '\n';
    fileContent += '  EMPLOYEE PASSWORDS - SUPABASE AUTH MIGRATION\n';
    fileContent += '  Generated: ' + new Date().toISOString() + '\n';
    fileContent += '═'.repeat(60) + '\n\n';

    for (const [email, password] of passwords.entries()) {
      fileContent += `Email: ${email}\n`;
      fileContent += `Password: ${password}\n`;
      fileContent += `─`.repeat(60) + '\n';
    }

    fileContent += '\n' + '═'.repeat(60) + '\n';
    fileContent += 'IMPORTANT NOTES:\n';
    fileContent += '1. Distribute these passwords securely to each employee\n';
    fileContent += '2. Employees should change password after first login\n';
    fileContent += '3. Delete this file after distribution\n';
    fileContent += '═'.repeat(60) + '\n';

    fs.writeFileSync(passwordFilePath, fileContent, 'utf-8');

    console.log(`✅ Passwords saved to: ${passwordFilePath}`);

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  MIGRATION COMPLETE                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📦 Total: ${employees.length}`);
    console.log('');
    console.log(`📁 Passwords saved to: migrated-passwords.txt`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Check migrated-passwords.txt for all passwords');
    console.log('   2. Distribute passwords to employees securely');
    console.log('   3. Employees can now login with NIP and their password');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateAllEmployees();
