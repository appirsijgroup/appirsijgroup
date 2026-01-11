/**
 * Script to check and fix is_active status for super-admin accounts
 * Run with: npx tsx check-employee.ts
 */

import { supabase } from './src/lib/supabase';

async function checkAndFixSuperAdmin() {
    try {
        console.log('🔍 Checking super-admin accounts...\n');

        // Get all employees with explicit column selection
        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, name, email, role, is_active')
            .eq('role', 'super-admin');

        if (error) {
            console.error('❌ Error fetching employees:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return;
        }

        if (!employees || employees.length === 0) {
            console.log('❌ No super-admin accounts found!');
            return;
        }

        console.log(`Found ${employees.length} super-admin account(s):\n`);

        // Display current status
        employees.forEach(emp => {
            console.log('ID:', emp.id);
            console.log('Name:', emp.name);
            console.log('Email:', emp.email);
            console.log('is_active:', emp.is_active);
            console.log('---');
        });

        // Check if any need to be activated (note: using is_active for database)
        const inactiveAdmins = employees.filter(emp => !emp.is_active);

        if (inactiveAdmins.length > 0) {
            console.log(`\n⚠️  Found ${inactiveAdmins.length} inactive super-admin account(s).`);
            console.log('Activating now...\n');

            // Update all inactive super-admins using database column name
            for (const admin of inactiveAdmins) {
                const { error: updateError } = await supabase
                    .from('employees')
                    .update({ is_active: true })  // Using snake_case for database
                    .eq('id', admin.id);

                if (updateError) {
                    console.error(`❌ Failed to activate ${admin.id}:`, updateError);
                } else {
                    console.log(`✅ Activated ${admin.id} (${admin.name})`);
                }
            }

            console.log('\n✅ Fix completed! Please try logging in again.');
        } else {
            console.log('\n✅ All super-admin accounts are already active!');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

// Run the function
checkAndFixSuperAdmin();
