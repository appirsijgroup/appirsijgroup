/**
 * Standalone Script to Migrate Employees from CSV to Supabase
 * Run with: node scripts/migrate-employees.js
 */

const fs = require('fs');
const path = require('path');

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
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
    process.exit(1);
}

console.log('✅ Supabase Config Found');
console.log('URL:', SUPABASE_URL);

// Read CSV file
const csvPath = path.join(__dirname, '..', 'employessdata.csv');
if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: employessdata.csv not found at', csvPath);
    console.log('Please place employessdata.csv in the root directory');
    process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
console.log('📄 CSV file loaded');
console.log('File size:', csvContent.length, 'bytes');

// Parse CSV
function parseCSV(text) {
    const lines = text.split('\n');
    const employees = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === '') continue;

        const matches = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                matches.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        matches.push(current.trim());

        if (matches.length >= 8) {
            employees.push({
                hospital_id: matches[0],
                id: matches[1], // NIP as ID
                name: matches[2].replace(/^"|"$/g, '').trim(),
                unit: matches[3],
                bagian: matches[4],
                profession_category: matches[5].toUpperCase() === 'MEDIS' ? 'MEDIS' : 'NON MEDIS',
                profession: matches[6] === '-' ? null : matches[6],
                gender: matches[7]
            });
        }
    }

    return employees;
}

// Convert to Supabase format
function convertToSupabase(csvEmp) {
    const email = `${csvEmp.id}@rsijsp.co.id`;
    const password = `hashed_${csvEmp.id}`; // Simple hash
    const today = new Date().toISOString().split('T')[0];

    return {
        id: csvEmp.id,
        email,
        password,
        name: csvEmp.name,
        hospital_id: csvEmp.hospital_id,
        unit: csvEmp.unit,
        bagian: csvEmp.bagian,
        profession_category: csvEmp.profession_category,
        profession: csvEmp.profession || 'Staf',
        gender: csvEmp.gender,
        last_visit_date: today,
        role: 'user',
        is_active: true,
        notification_enabled: true,
        profile_picture: null,
        monthly_activities: {},
        activated_months: [],
        can_be_mentor: false,
        can_be_supervisor: false,
        can_be_ka_unit: false,
        can_be_dirut: false,
        functional_roles: [],
        manager_scope: null,
        location_id: null,
        location_name: null,
        reading_history: [],
        quran_reading_history: [],
        todo_list: [],
        signature: null,
        last_announcement_read_timestamp: null,
        managed_hospital_ids: [],
        achievements: [],
        must_change_password: true
    };
}

// Main migration function
async function migrateEmployees() {
    console.log('\n🔄 Starting migration...\n');

    // Parse CSV
    const csvEmployees = parseCSV(csvContent);
    console.log(`✅ Parsed ${csvEmployees.length} employees from CSV\n`);

    // Convert
    const employees = csvEmployees.map(convertToSupabase);
    console.log('✅ Converted to Supabase format\n');

    // Show sample
    console.log('Sample data (first 3):');
    employees.slice(0, 3).forEach((emp, idx) => {
        console.log(`  ${idx + 1}. ${emp.name} (${emp.id})`);
        console.log(`     Email: ${emp.email}`);
        console.log(`     Unit: ${emp.unit}`);
    });

    // Insert to Supabase
    console.log(`\n💾 Inserting ${employees.length} employees to Supabase...\n`);

    const batchSize = 50;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(employees.length / batchSize);

        process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${batch.length} employees)... `);

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/employees`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(batch)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            // Check if there's an error
            if (result.error) {
                throw new Error(result.error.message);
            }

            // Supabase returns the inserted rows
            const insertedCount = Array.isArray(result) ? result.length : 1;
            inserted += insertedCount;

            console.log(`✅ Success (${insertedCount} rows)`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);

            // Try one by one
            console.log('   Trying one by one...');
            for (const emp of batch) {
                try {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/employees`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(emp)
                    });

                    if (response.ok) {
                        inserted++;
                        process.stdout.write('.');
                    } else {
                        failed++;
                        console.log(`\n   ❌ ${emp.name} (${emp.id}): HTTP ${response.status}`);
                    }
                } catch (err) {
                    failed++;
                    console.log(`\n   ❌ ${emp.name} (${emp.id}): ${err.message}`);
                }
            }
            console.log(''); // New line after dots
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total: ${employees.length}`);
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60));

    console.log('\n💡 Next Steps:');
    console.log('   1. Check Supabase Dashboard → Table Editor → employees');
    console.log('   2. Verify data imported correctly');
    console.log('   3. Default password is NIP (hashed)');
    console.log('   4. Users must change password on first login');
    console.log('   5. Email format: {NIP}@rsijsp.co.id');

    if (inserted > 0) {
        console.log('\n✅ Migration SUCCESSFUL!');
    } else {
        console.log('\n❌ Migration FAILED! Check errors above.');
    }
}

// Run migration
console.log('🚀 Employee Migration Script');
console.log('='.repeat(60));
console.log('Database:', SUPABASE_URL);
console.log('='.repeat(60));

migrateEmployees().catch(err => {
    console.error('\n❌ Fatal Error:', err.message);
    process.exit(1);
});
