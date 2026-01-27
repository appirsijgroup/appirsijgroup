const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('Starting migration of activated_months...');

    // 1. Fetch all employees with activated_months
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, activated_months')
        .not('activated_months', 'is', null);

    if (error) {
        console.error('Error fetching employees:', error);
        process.exit(1);
    }

    console.log(`Found ${employees.length} employees with potential data.`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let errors = 0;

    for (const emp of employees) {
        if (!emp.activated_months || !Array.isArray(emp.activated_months) || emp.activated_months.length === 0) {
            continue;
        }

        console.log(`Processing user ${emp.id}: ${emp.activated_months.length} months`);

        for (const month of emp.activated_months) {
            try {
                // Check if already exists (idempotency)
                const { data: existing } = await supabase
                    .from('mutabaah_activations')
                    .select('id')
                    .eq('employee_id', emp.id)
                    .eq('month_key', month)
                    .maybeSingle();

                if (!existing) {
                    const { error: insertError } = await supabase
                        .from('mutabaah_activations')
                        .insert({
                            employee_id: emp.id,
                            month_key: month,
                            created_at: new Date().toISOString() // Or prompt for date? Default to now is fine for migration.
                        });

                    if (insertError) {
                        console.error(`Failed to insert ${month} for user ${emp.id}:`, insertError.message);
                        errors++;
                    } else {
                        totalInserted++;
                    }
                } else {
                    totalSkipped++;
                }
            } catch (err) {
                console.error(`Exception processing ${month} for user ${emp.id}:`, err);
                errors++;
            }
        }
    }

    console.log('------------------------------------------------');
    console.log('Migration Complete');
    console.log(`Total Records Inserted: ${totalInserted}`);
    console.log(`Total Records Skipped (Already Existed): ${totalSkipped}`);
    console.log(`Errors: ${errors}`);
    console.log('------------------------------------------------');
}

migrate();
