// Run: node scripts/check-employee.js <NIP>
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkEmployee(nip) {
  try {
    console.log(`🔍 Checking employee with NIP: ${nip}\n`);

    // Get employee data
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', nip)
      .single();

    if (error) {
      console.error('❌ Error fetching employee:', error);
      return;
    }

    if (!employee) {
      console.log('❌ Employee not found!');
      return;
    }

    console.log('✅ Employee Found:');
    console.log('─'.repeat(50));
    console.log(`ID/NIP:         ${employee.id}`);
    console.log(`Name:           ${employee.name}`);
    console.log(`Email:          ${employee.email}`);
    console.log(`Unit:           ${employee.unit}`);
    console.log(`Profession:     ${employee.profession}`);
    // Check both snake_case and camelCase for active status
    const isActive = employee.is_active !== false && employee.isActive !== false;
    console.log(`Active:         ${isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`is_active (DB): ${employee.is_active}`);
    console.log(`isActive (JS):  ${employee.isActive}`);
    console.log(`\n🔐 Password Info:`);
    console.log(`Has Password:  ${employee.password ? '✅ Yes' : '❌ No'}`);
    console.log(`Password Length: ${employee.password?.length || 0}`);
    console.log(`Is Hashed:     ${employee.password?.startsWith('$2') ? '✅ Yes (bcrypt)' : '❌ No (plain text)'}`);
    console.log(`First Chars:    ${employee.password?.substring(0, 20)}...`);
    console.log('─'.repeat(50));

    // Test password types
    console.log('\n💡 Recommendations:');
    if (!employee.password || employee.password.length === 0) {
      console.log('⚠️  WARNING: No password set! Use reset-password.js to set one.');
    } else if (!employee.password.startsWith('$2')) {
      console.log('⚠️  WARNING: Password is in PLAIN TEXT! Consider hashing it.');
      console.log('   Run: node scripts/reset-password.js ' + nip + ' <new_password>');
    } else {
      console.log('✅ Password is properly hashed with bcrypt');
    }

    if (employee.isActive === false) {
      console.log('⚠️  WARNING: Account is INACTIVE! Activate it first.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Get command line argument
const nip = process.argv[2];

if (!nip) {
  console.log('Usage: node scripts/check-employee.js <NIP>');
  console.log('Example: node scripts/check-employee.js 6000');
  process.exit(1);
}

checkEmployee(nip);
