/**
 * Populate NIP column - Version 2
 * Direct SQL approach
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
  console.log('🚀 Populating NIP column...\n');

  try {
    // Get ALL employees first
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nip, name, email');

    if (error) throw error;

    if (!employees || employees.length === 0) {
      console.log('❌ No employees found');
      return;
    }

    console.log(`📊 Total employees: ${employees.length}\n`);

    // Filter employees without NIP manually
    const employeesWithoutNIP = employees.filter(emp => !emp.nip || emp.nip.trim() === '');

    console.log(`📊 Employees without NIP: ${employeesWithoutNIP.length}\n`);

    if (employeesWithoutNIP.length === 0) {
      console.log('✅ All employees already have NIP!');
      return;
    }

    let updatedCount = 0;

    for (const employee of employeesWithoutNIP) {
      try {
        // Use ID as NIP
        const nipToUse = employee.id;

        console.log(`📝 Processing: ${employee.name}`);
        console.log(`   ID: ${employee.id}`);
        console.log(`   Setting NIP: "${nipToUse}"`);

        // Update employee with NIP
        const { error: updateError } = await supabase
          .from('employees')
          .update({ nip: nipToUse })
          .eq('id', employee.id);

        if (updateError) {
          console.log(`   ❌ Failed: ${updateError.message}\n`);
        } else {
          console.log(`   ✅ Success!\n`);
          updatedCount++;
        }

      } catch (err) {
        console.log(`   ❌ Error: ${err.message}\n`);
      }
    }

    console.log('='.repeat(60));
    console.log(`✅ Updated ${updatedCount} employees`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateNIP();
