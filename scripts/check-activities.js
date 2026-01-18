/**
 * NODE SCRIPT: Check and verify activities table
 * Run with: node scripts/check-activities.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env.local');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActivitiesTable() {
    console.log('🔍 Checking activities table...\n');

    try {
        // Check if table exists by trying to select from it
        const { data, error, status } = await supabase
            .from('activities')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Error accessing activities table:');
            console.error('   Code:', error.code);
            console.error('   Message:', error.message);
            console.error('   Hint:', error.hint);

            if (error.code === '42P01') {
                console.log('\n⚠️ Table does not exist!');
                console.log('Please run the migration: supabase-migrations/ensure-activities-table.sql');
            }
            return;
        }

        console.log('✅ Activities table exists!\n');

        // Get count
        const { count, error: countError } = await supabase
            .from('activities')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Error counting activities:', countError);
        } else {
            console.log(`📊 Total activities: ${count || 0}\n`);
        }

        // Get all activities
        const { data: activities, error: fetchError } = await supabase
            .from('activities')
            .select('*')
            .order('date', { ascending: true });

        if (fetchError) {
            console.error('❌ Error fetching activities:', fetchError);
            return;
        }

        if (!activities || activities.length === 0) {
            console.log('⚠️ No activities found in the table.\n');
            console.log('💡 You can insert sample data using:');
            console.log('   supabase-migrations/verify-and-insert-activities.sql\n');
            return;
        }

        console.log('📋 Activities List:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        activities.forEach((activity, index) => {
            console.log(`${index + 1}. ${activity.name}`);
            console.log(`   ID: ${activity.id}`);
            console.log(`   Type: ${activity.activity_type}`);
            console.log(`   Date: ${activity.date}`);
            console.log(`   Time: ${activity.start_time} - ${activity.end_time}`);
            console.log(`   Audience: ${activity.audience_type}`);
            console.log(`   Status: ${activity.status}`);
            console.log(`   Creator: ${activity.created_by_name}`);
            if (activity.zoom_url) console.log(`   Zoom: ${activity.zoom_url}`);
            if (activity.youtube_url) console.log(`   YouTube: ${activity.youtube_url}`);
            console.log('');
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Check structure
        console.log('🔍 Table Structure:\n');
        const firstActivity = activities[0];
        const columns = Object.keys(firstActivity);
        console.log('Columns:', columns.join(', '));
        console.log('\n');

        // Test insert a sample activity
        console.log('🧪 Testing insert functionality...\n');

        // Get a random employee for testing
        const { data: employees } = await supabase
            .from('employees')
            .select('id, name')
            .limit(1);

        const testEmployee = employees?.[0];
        if (!testEmployee) {
            console.log('⚠️ No employees found to test insert. Skipping test.\n');
        } else {
            const testActivity = {
                name: 'Test Activity - Please Delete Me',
                description: 'This is a test activity to verify inserts work.',
                date: new Date().toISOString().split('T')[0],
                start_time: '14:00',
                end_time: '15:00',
                created_by: testEmployee.id,
                created_by_name: testEmployee.name,
                activity_type: 'Umum',
                audience_type: 'public',
                status: 'scheduled'
            };

            const { data: inserted, error: insertError } = await supabase
                .from('activities')
                .insert(testActivity)
                .select()
                .single();

            if (insertError) {
                console.error('❌ Insert test FAILED:');
                console.error('   ', insertError.message);
            } else {
                console.log('✅ Insert test SUCCEEDED!');
                console.log(`   Inserted activity ID: ${inserted.id}\n`);

                // Clean up test data
                const { error: deleteError } = await supabase
                    .from('activities')
                    .delete()
                    .eq('id', inserted.id);

                if (deleteError) {
                    console.error('⚠️ Cleanup failed:', deleteError.message);
                } else {
                    console.log('✅ Test activity cleaned up.\n');
                }
            }
        }

        console.log('✅ Verification complete!\n');

    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

// Run the check
checkActivitiesTable().then(() => {
    console.log('Done.');
    process.exit(0);
});
