const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAllPasswords() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  RESET ALL EMPLOYEE PASSWORDS TO NIP                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get all employees
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, nip, name, email, password')
    .order('nip');

  if (error) {
    console.log('❌ Error fetching employees:', error.message);
    return;
  }

  console.log('Found ' + employees.length + ' employees');
  console.log('');
  console.log('Resetting passwords to NIP (for easy login)...');
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];

    // Hash the NIP as password
    const hash = await bcrypt.hash(emp.nip, 10);

    const { error: updateError } = await supabase
      .from('employees')
      .update({ password: hash })
      .eq('id', emp.id);

    if (updateError) {
      console.log('[' + (i + 1) + '/' + employees.length + '] ❌ ' + emp.nip + ' - ' + emp.name + ': ' + updateError.message);
      errorCount++;
    } else {
      console.log('[' + (i + 1) + '/' + employees.length + '] ✅ ' + emp.nip + ' - ' + emp.name);
      successCount++;
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  PASSWORD RESET COMPLETE                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Results:');
  console.log('   ✅ Success: ' + successCount);
  console.log('   ❌ Errors: ' + errorCount);
  console.log('   📦 Total: ' + employees.length);
  console.log('');
  console.log('🔐 LOGIN INSTRUCTIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   NIP: <use employee NIP>');
  console.log('   Password: <same as NIP>');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Examples:');
  console.log('   NIP: 6033, Password: 6033');
  console.log('   NIP: 6030, Password: 6030');
  console.log('   NIP: 3656, Password: 3656');
  console.log('');
  console.log('✅ All employees can now login!');
}

resetAllPasswords();
