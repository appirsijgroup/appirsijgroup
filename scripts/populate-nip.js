/**
 * Populate NIP column for existing employees
 * For employees where ID looks like a number/identifier, use it as NIP
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

async function populateNIP() {
  console.log('🚀 Populating NIP column for existing employees...\n');

  try {
    // Get all employees without NIP
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nip, name, email')
      .is('nip', null)
      .is('email', null, false);

    if (error) throw error;

    if (!employees || employees.length === 0) {
      console.log('✅ All employees already have NIP');
      return;
    }

    console.log(`📊 Found ${employees.length} employees without NIP\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      try {
        // Use ID as NIP if it looks like a number/identifier
        // Skip if ID is too long or looks like a name
        let nipToUse = null;

        if (/^\d+$/.test(employee.id)) {
          // ID is all numbers - use as NIP
          nipToUse = employee.id;
        } else if (employee.id.length <= 20 && !employee.id.includes('@')) {
          // ID is short and doesn't look like email - use as NIP
          nipToUse = employee.id;
        } else {
          // Skip - ID looks like email or name
          console.log(`⚠️  Skipping: ${employee.name} (${employee.id}) - ID looks like email/name`);
          skippedCount++;
          continue;
        }

        // Update employee with NIP
        const { error: updateError } = await supabase
          .from('employees')
          .update({ nip: nipToUse })
          .eq('id', employee.id);

        if (updateError) {
          console.log(`   ❌ Failed to update ${employee.name}: ${updateError.message}`);
        } else {
          console.log(`✅ Updated: ${employee.name}`);
          console.log(`   ID: ${employee.id} → NIP: ${nipToUse}`);
          updatedCount++;
        }

      } catch (err) {
        console.log(`   ❌ Error processing ${employee.name}: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed: ${employees.length}`);
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log('='.repeat(60));

    // Show sample of updated employees
    if (updatedCount > 0) {
      console.log('\n📋 Sample updated employees:');
      const { data: sample } = await supabase
        .from('employees')
        .select('id, nip, name, email')
        .not('nip', 'is', null)
        .limit(5);

      if (sample) {
        sample.forEach((emp, index) => {
          console.log(`   ${index + 1}. ${emp.name}`);
          console.log(`      NIP: "${emp.nip}" | Email: ${emp.email}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateNIP();
