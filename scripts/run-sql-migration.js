/**
 * SQL Migration Runner
 *
 * This script executes the SQL migration to set up Supabase Auth
 *
 * Usage: node scripts/run-sql-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create service role client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute SQL migration
 */
async function runMigration() {
  console.log('🚀 Starting SQL Migration...\n');

  try {
    // Read SQL migration file
    const sqlFile = path.join(__dirname, '../supabase-migrations/001_supabase_auth_setup.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 SQL migration file loaded\n');
    console.log('⚠️  Note: This will execute SQL in Supabase database\n');

    // Split SQL by semicolons and execute each statement
    // Note: Supabase doesn't support multiple statements in one call via REST API
    // So we need to use the SQL Editor or execute directly via PostgreSQL connection

    console.log('❌ Cannot execute via REST API');
    console.log('\n💡 You need to run this SQL manually in Supabase SQL Editor:\n');
    console.log('   1. Open: https://app.supabase.com');
    console.log('   2. Select project: appi-rsi-group');
    console.log('   3. Click SQL Editor (left sidebar)');
    console.log('   4. Click "New Query"');
    console.log(`   5. Copy content from: ${sqlFile}`);
    console.log('   6. Paste and click "Run"\n');

    console.log('📄 SQL file location:');
    console.log(`   ${sqlFile}\n`);

    console.log('✅ After running SQL migration, run:');
    console.log('   npm run migrate-employees\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();
