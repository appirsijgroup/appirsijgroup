const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAllPasswords() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  RESET ALL EMPLOYEE PASSWORDS TO "api123"                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get all employees
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, nip, name, email')
    .order('nip');

  if (error) {
    console.log('❌ Error fetching employees:', error.message);
    return;
  }

  console.log('✅ Found ' + employees.length + ' employees');
  console.log('');
  console.log('🔄 Resetting passwords to: api123');
  console.log('');

  // Hash the default password
  const defaultPassword = 'api123';
  const hash = await bcrypt.hash(defaultPassword, 10);

  let successCount = 0;
  let errorCount = 0;

  // Reset in batches for better performance
  const batchSize = 50;
  for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(employees.length / batchSize);

    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} employees)...`);

    for (const emp of batch) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ password: hash })
        .eq('id', emp.id);

      if (updateError) {
        console.log('  ❌ ' + emp.nip + ' - ' + emp.name.substring(0, 30) + ': ' + updateError.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log('  ✅ Batch ' + batchNum + ' complete');
    console.log('');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  PASSWORD RESET COMPLETE                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Results:');
  console.log('   ✅ Success: ' + successCount);
  console.log('   ❌ Errors: ' + errorCount);
  console.log('   📦 Total: ' + employees.length);
  console.log('');
  console.log('🔐 DEFAULT LOGIN CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   NIP:      <employee NIP>');
  console.log('   Password: api123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📝 Examples:');
  console.log('   NIP: 6033, Password: api123');
  console.log('   NIP: 6030, Password: api123');
  console.log('   NIP: 3656, Password: api123');
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('   - All employees use the SAME default password');
  console.log('   - Employees should change password after first login');
  console.log('   - Use the "Change Password" feature in the system');
  console.log('');
  console.log('✅ All employees can now login with password: api123');
}

resetAllPasswords();
