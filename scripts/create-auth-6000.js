const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUser() {
  console.log('Creating Supabase Auth user for Edi Heryanto...');
  console.log('');

  const email = 'mas.ediheryanto@gmail.com';
  const password = 'Rsip123456';

  // First, try to find existing user
  const { data: { users } } = await supabase.auth.admin.listUsers();

  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log('User already exists! Updating password...');
    console.log('User ID:', existingUser.id);

    const { error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: password }
    );

    if (error) {
      console.log('Error updating:', error.message);
    } else {
      console.log('✅ Password updated!');
    }
  } else {
    console.log('Creating new user...');

    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: 'Edi Heryanto',
        nip: '6000',
        role: 'super-admin'
      }
    });

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('');
      console.log('This might mean:');
      console.log('1. User exists in a different project');
      console.log('2. Email is in deleted users list');
      console.log('3. Database connection issue');
    } else {
      console.log('✅ User created successfully!');
      console.log('User ID:', data.user.id);
    }
  }

  console.log('');
  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('===================');
  console.log('NIP: 6000');
  console.log('Password: Rsip123456');
  console.log('===================');
}

createUser();
