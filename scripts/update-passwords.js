/**
 * Update Employee Passwords to Proper Bcrypt Hash
 * Run with: node scripts/update-passwords.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
    }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found');
    process.exit(1);
}

console.log('✅ Supabase Config Found');
console.log('URL:', SUPABASE_URL);

const SALT_ROUNDS = 10;

async function updatePasswords() {
    console.log('\n🔄 Updating passwords to bcrypt hash...\n');

    try {
        // Fetch all employees
        console.log('📥 Fetching employees from Supabase...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/employees`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const employees = await response.json();
        console.log(`✅ Found ${employees.length} employees\n`);

        let updated = 0;
        let failed = 0;

        // Update each employee's password
        for (const emp of employees) {
            try {
                // Password default adalah NIP
                const plainPassword = emp.id; // NIP sebagai password

                // Hash dengan bcrypt
                const hashedPassword = bcrypt.hashSync(plainPassword, SALT_ROUNDS);

                // Update di Supabase
                const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${emp.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        password: hashedPassword,
                        must_change_password: true  // Force user to change password
                    })
                });

                if (!updateResponse.ok) {
                    throw new Error(`HTTP ${updateResponse.status}`);
                }

                updated++;
                process.stdout.write(`\r   ✅ Progress: ${updated}/${employees.length} employees updated`);
            } catch (err) {
                failed++;
                console.log(`\n   ❌ Failed to update ${emp.name} (${emp.id}): ${err.message}`);
            }
        }

        console.log('\n\n' + '='.repeat(60));
        console.log('📊 PASSWORD UPDATE COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total employees: ${employees.length}`);
        console.log(`✅ Successfully updated: ${updated}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('='.repeat(60));

        console.log('\n💡 Login Information:');
        console.log('   - Email: {NIP}@rsijsp.co.id');
        console.log('   - Password: NIP (contoh: 3565)');
        console.log('   - Password akan di-hash dengan bcrypt');
        console.log('   - User harus ganti password saat login pertama');

        if (updated > 0) {
            console.log('\n✅ Password update SUCCESSFUL!');
            console.log('\n🧪 Test Login:');
            console.log('   Email: 3565@rsijsp.co.id');
            console.log('   Password: 3565');
        } else {
            console.log('\n❌ Password update FAILED!');
        }

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        process.exit(1);
    }
}

// Run update
console.log('🔐 Employee Password Update Script');
console.log('='.repeat(60));
console.log('Database:', SUPABASE_URL);
console.log('Hashing: bcrypt (salt rounds:', SALT_ROUNDS, ')');
console.log('='.repeat(60));

updatePasswords();
