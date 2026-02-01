const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeHospitalIds() {
    console.log('Starting hospital ID normalization to UPPERCASE...');

    // 1. Fetch all hospitals
    const { data: hospitals, error: hError } = await supabase
        .from('hospitals')
        .select('*');

    if (hError) {
        console.error('Error fetching hospitals:', hError);
        return;
    }

    console.log(`Found ${hospitals.length} hospitals.`);

    for (const hospital of hospitals) {
        const currentId = hospital.id;
        const newId = currentId.toUpperCase();

        if (currentId !== newId) {
            console.log(`Normalizing ${currentId} -> ${newId}`);

            // Check if uppercase version already exists (conflict)
            const exists = hospitals.find(h => h.id === newId && h.id !== currentId);
            if (exists) {
                console.warn(`⚠️ Conflict: Hospital with ID ${newId} already exists! Skipping update for ${currentId}. Manual intervention needed.`);
                continue;
            }

            try {
                // 1. Create new hospital record with uppercase ID (copy)
                const { error: createError } = await supabase
                    .from('hospitals')
                    .insert({
                        ...hospital,
                        id: newId
                    });

                if (createError) {
                    console.error(`Failed to create new hospital ${newId}:`, createError);
                    continue;
                }

                // 2. Update employees to point to new ID
                const { error: updateEmpError } = await supabase
                    .from('employees')
                    .update({ hospital_id: newId })
                    .eq('hospital_id', currentId);

                if (updateEmpError) throw updateEmpError;

                // 2b. Update managed_hospital_ids in employees table
                const { data: employeesWithManaged, error: fetchManagedError } = await supabase
                    .from('employees')
                    .select('id, managed_hospital_ids')
                    .contains('managed_hospital_ids', [currentId]);

                if (fetchManagedError) {
                    console.error(`Error fetching employees with managed hospital ${currentId}:`, fetchManagedError);
                } else if (employeesWithManaged && employeesWithManaged.length > 0) {
                    console.log(`Updating ${employeesWithManaged.length} employees with managed_hospital_ids containing ${currentId}...`);
                    for (const emp of employeesWithManaged) {
                        const newManagedIds = emp.managed_hospital_ids.map(id => id === currentId ? newId : id);
                        // Deduplicate just in case
                        const uniqueManagedIds = [...new Set(newManagedIds)];

                        const { error: updateManagedError } = await supabase
                            .from('employees')
                            .update({ managed_hospital_ids: uniqueManagedIds })
                            .eq('id', emp.id);

                        if (updateManagedError) {
                            console.error(`Failed to update managed_hospital_ids for employee ${emp.id}:`, updateManagedError);
                        }
                    }
                }

                // 3. Delete old hospital record
                const { error: deleteError } = await supabase
                    .from('hospitals')
                    .delete()
                    .eq('id', currentId);

                if (deleteError) {
                    console.error(`Failed to delete old hospital ${currentId}:`, deleteError);
                } else {
                    console.log(`✅ Successfully migrated ${currentId} to ${newId}`);
                }

            } catch (err) {
                console.error(`Error processing ${currentId}:`, err);
            }
        } else {
            console.log(`Hospital ${currentId} is already normalized.`);
        }
    }

    console.log('Done.');
}

normalizeHospitalIds();
