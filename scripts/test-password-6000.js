const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLogin() {
  console.log('Testing login for employee 6000...\n');

  // Get employee
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('nip', '6000')
    .single();

  if (error || !employee) {
    console.log('❌ Employee not found:', error?.message);
    return;
  }

  console.log('✅ Employee found:');
  console.log('  NIP:', employee.nip);
  console.log('  Name:', employee.name);
  console.log('  Email:', employee.email);
  console.log('  has password:', !!employee.password);
  console.log('  is_active:', employee.is_active);
  console.log('');

  // Test password verification
  const testPassword = 'sukapura123';
  console.log('Testing password:', testPassword);
  console.log('Password hash:', employee.password ? employee.password.substring(0, 20) + '...' : 'NULL');
  console.log('');

  if (!employee.password) {
    console.log('❌ Password is NULL in database!');
    console.log('Employee cannot login without a password.');
    console.log('');
    console.log('Setting password to: sukapura123');

    const hash = await bcrypt.hash(testPassword, 10);
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password: hash })
      .eq('nip', '6000');

    if (updateError) {
      console.log('❌ Failed to set password:', updateError.message);
    } else {
      console.log('✅ Password set successfully!');
    }
    return;
  }

  try {
    const match = await bcrypt.compare(testPassword, employee.password);
    console.log('Password match result:', match);

    if (match) {
      console.log('✅ Password CORRECT!');
      console.log('');
      console.log('Employee SHOULD be able to login with:');
      console.log('  NIP: 6000');
      console.log('  Password: sukapura123');
      console.log('');
      console.log('If login still fails, check server console for error messages.');
    } else {
      console.log('❌ Password INCORRECT!');
      console.log('');
      console.log('The password in database is different from: sukapura123');
      console.log('');
      console.log('Do you want to reset password to: sukapura123 ?');
      console.log('Run: node scripts/reset-password-6000.js');
    }
  } catch (err) {
    console.log('❌ Error comparing password:', err.message);
    console.log('');
    console.log('This might mean the password hash format is invalid.');
    console.log('Resetting password...');

    const hash = await bcrypt.hash(testPassword, 10);
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password: hash })
      .eq('nip', '6000');

    if (updateError) {
      console.log('❌ Failed to reset password:', updateError.message);
    } else {
      console.log('✅ Password reset successful!');
      console.log('Try login again with: NIP 6000, Password: sukapura123');
    }
  }
}

testLogin();
