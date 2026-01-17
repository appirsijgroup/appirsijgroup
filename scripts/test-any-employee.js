const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmployee() {
  console.log('Testing employee 6033 (SANSY DUA LESTARI PUTRI AZA)...\n');

  const { data: emp, error } = await supabase
    .from('employees')
    .select('*')
    .eq('nip', '6033')
    .single();

  if (error || !emp) {
    console.log('Error:', error?.message);
    return;
  }

  console.log('✅ Employee found:');
  console.log('  NIP:', emp.nip);
  console.log('  Name:', emp.name);
  console.log('  Email:', emp.email);
  console.log('  has password:', !!emp.password);
  console.log('  is_active:', emp.is_active);
  console.log('');

  if (emp.password) {
    console.log('Password hash exists:', emp.password.substring(0, 20) + '...');

    // Test with common passwords
    const testPasswords = ['sukapura123', '123456', 'password', emp.nip];

    console.log('');
    console.log('Testing common passwords...');
    for (const pwd of testPasswords) {
      try {
        const match = await bcrypt.compare(pwd, emp.password);
        console.log('  Password: ' + pwd + ' - ' + (match ? '✅ MATCH' : '❌ no match'));
        if (match) {
          console.log('');
          console.log('🎯 FOUND CORRECT PASSWORD: ' + pwd);
          console.log('');
          console.log('Try login with:');
          console.log('  NIP: ' + emp.nip);
          console.log('  Password: ' + pwd);
          break;
        }
      } catch (err) {
        console.log('  Password: ' + pwd + ' - ❌ Error: ' + err.message);
      }
    }
  } else {
    console.log('❌ No password set!');
    console.log('Setting default password: ' + emp.nip);

    const hash = await bcrypt.hash(emp.nip, 10);
    const { error: updateErr } = await supabase
      .from('employees')
      .update({ password: hash })
      .eq('nip', emp.nip);

    if (updateErr) {
      console.log('Failed to set password:', updateErr.message);
    } else {
      console.log('✅ Password set to NIP: ' + emp.nip);
      console.log('');
      console.log('Try login with:');
      console.log('  NIP: ' + emp.nip);
      console.log('  Password: ' + emp.nip);
    }
  }
}

testEmployee();
