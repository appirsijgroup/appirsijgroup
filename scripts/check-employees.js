/**
 * Check existing employee data
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

async function checkEmployees() {
  console.log('🔍 Checking existing employee data...\n');

  try {
    // 1. Check total employees
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nip, name, email, auth_user_id, is_active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('📊 Total employees found:', employees?.length || 0);
    console.log('');

    if (employees && employees.length > 0) {
      console.log('📋 Sample employees (first 10):');
      console.log('='.repeat(100));
      console.log(`${'ID'.padEnd(20)} | ${'NIP'.padEnd(15)} | ${'Name'.padEnd(30)} | ${'Email'.padEnd(30)} | ${'Auth User ID'.padEnd(10)}`);
      console.log('='.repeat(100));

      employees.forEach((emp, index) => {
        console.log(
          `${emp.id?.padEnd(20) || 'N/A'.padEnd(20)} | ` +
          `${(emp.nip || 'N/A').padEnd(15)} | ` +
          `${emp.name?.padEnd(30) || 'N/A'.padEnd(30)} | ` +
          `${emp.email?.padEnd(30) || 'N/A'.padEnd(30)} | ` +
          `${(emp.auth_user_id ? '✅ Yes' : '❌ No').padEnd(10)}`
        );
      });
      console.log('='.repeat(100));
    }

    // 2. Check for NIP "6000"
    console.log('\n🔍 Checking for NIP "6000"...\n');
    const { data: emp6000, error: error6000 } = await supabase
      .from('employees')
      .select('*')
      .eq('nip', '6000')
      .single();

    if (error6000) {
      if (error6000.code === 'PGRST116') {
        console.log('❌ No employee found with NIP "6000"');
      } else {
        console.log('❌ Error:', error6000.message);
      }
    } else {
      console.log('✅ Employee with NIP "6000" found:');
      console.log(`   Name: ${emp6000.name}`);
      console.log(`   Email: ${emp6000.email}`);
      console.log(`   Auth User ID: ${emp6000.auth_user_id || 'Not set'}`);
      console.log(`   Is Active: ${emp6000.is_active}`);
    }

    // 3. Check employees without auth_user_id
    console.log('\n🔍 Checking employees WITHOUT auth_user_id...\n');
    const { data: withoutAuth, error: errorWithout } = await supabase
      .from('employees')
      .select('id, nip, name, email')
      .is('auth_user_id', null)
      .is('email', null, false)
      .limit(10);

    if (errorWithout) throw errorWithout;

    console.log(`📊 Employees without auth_user_id: ${withoutAuth?.length || 0}`);

    if (withoutAuth && withoutAuth.length > 0) {
      console.log('\nEmployees that need migration:');
      withoutAuth.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.email})`);
        console.log(`      ID: ${emp.id}`);
        console.log(`      NIP: ${emp.nip || 'N/A'}`);
        console.log('');
      });
    }

    // 4. Check all unique NIPs
    console.log('🔍 Checking all NIPs in database...\n');
    const { data: allNips, error: nipError } = await supabase
      .from('employees')
      .select('nip, name, email')
      .not('nip', 'is', null)
      .order('nip');

    if (nipError) throw nipError;

    console.log(`📊 Total employees with NIP: ${allNips?.length || 0}`);
    if (allNips && allNips.length > 0) {
      console.log('\nList of NIPs:');
      allNips.forEach((emp, index) => {
        console.log(`   ${index + 1}. NIP: "${emp.nip}" - ${emp.name} (${emp.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmployees();
