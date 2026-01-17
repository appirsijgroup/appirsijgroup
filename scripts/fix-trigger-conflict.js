/**
 * Fix trigger conflict before migration
 *
 * The trigger on_auth_user_created is causing conflicts
 * because it tries to insert to employees table when we create users
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

async function fixTriggers() {
  console.log('🔧 Fixing trigger conflicts...\n');

  try {
    // Drop the problematic trigger
    console.log('📋 Dropping trigger: on_auth_user_created');

    const { error } = await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });

    if (error) {
      console.log('⚠️  Could not drop trigger via RPC');
      console.log('ℹ️  You need to manually drop the trigger in Supabase SQL Editor:');
      console.log('\nDROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;\n');
    } else {
      console.log('✅ Trigger dropped successfully\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixTriggers();
