// Run: node scripts/reset-password.js <NIP> <new_password>
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function resetPassword(nip, newPassword) {
  try {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

    console.log(`🔑 Resetting password for NIP: ${nip}`);
    console.log(`📝 New password (hashed): ${hashedPassword.substring(0, 20)}...`);
    console.log(`✅ Activating account...`);

    // Update password AND activate account in database
    // Note: Supabase columns use snake_case (is_active) not camelCase
    const { data, error } = await supabase
      .from('employees')
      .update({
        password: hashedPassword,
        is_active: true, // Use snake_case for database column
        updated_at: new Date().toISOString()
      })
      .eq('id', nip)
      .select();

    if (error) {
      console.error('❌ Error updating password:', error);
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log('📊 Updated employee:', data);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

// Get command line arguments
const nip = process.argv[2];
const newPassword = process.argv[3];

if (!nip || !newPassword) {
  console.log('Usage: node scripts/reset-password.js <NIP> <new_password>');
  console.log('Example: node scripts/reset-password.js 6000 myPassword123');
  process.exit(1);
}

resetPassword(nip, newPassword);
