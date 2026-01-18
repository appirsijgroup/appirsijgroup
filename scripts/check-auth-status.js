/**
 * Check auth_user_id status properly
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

async function checkAuthStatus() {
  console.log('🔍 Checking auth_user_id status...\n');

  try {
    // Get all employees
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id')
      .limit(20);

    if (error) throw error;

    console.log(`📊 Sample employees (first 20):\n`);

    let withoutAuth = 0;
    let withAuth = 0;

    employees.forEach((emp, index) => {
      const hasAuth = emp.auth_user_id !== null && emp.auth_user_id !== undefined && emp.auth_user_id !== '';

      if (hasAuth) {
        withAuth++;
        console.log(`${index + 1}. ✅ ${emp.name}`);
        console.log(`    NIP: "${emp.nip}" | Auth: ${emp.auth_user_id}`);
      } else {
        withoutAuth++;
        console.log(`${index + 1}. ❌ ${emp.name}`);
        console.log(`    NIP: "${emp.nip}" | Auth: NULL`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('Summary:');
    console.log(`  With auth_user_id: ${withAuth}`);
    console.log(`  Without auth_user_id: ${withoutAuth}`);
    console.log('='.repeat(60));

    // Count total
    const { count, error: countError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📊 Total employees in database: ${count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAuthStatus();
