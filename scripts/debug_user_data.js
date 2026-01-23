
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const employeeId = '4659'; // ABDUL MUIS ST
    const monthKey = '2026-01';

    console.log(`Checking data for user ${employeeId} in month ${monthKey}...`);

    // 1. Check employee_monthly_reports (New table)
    const { data: reports, error: reportsError } = await supabase
        .from('employee_monthly_reports')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

    if (reportsError) console.error('Error fetching reports:', reportsError);

    if (reports) {
        console.log('\n--- employee_monthly_reports ---');
        const monthData = reports.reports?.[monthKey];
        if (monthData) {
            console.log(`Found data for ${monthKey}!`);
            const activities = Object.keys(monthData);
            console.log(`Activity keys count: ${activities.length}`);

            // Sample an activity to see entry dates
            const sampleActivity = activities[0];
            console.log(`Sample activity (${sampleActivity}):`, JSON.stringify(monthData[sampleActivity], null, 2));

            // Check if there are other days
            let allDates = new Set();
            activities.forEach(act => {
                const data = monthData[act];
                if (data.entries) {
                    data.entries.forEach(e => allDates.add(e.date));
                }
                if (data.bookEntries) {
                    data.bookEntries.forEach(e => allDates.add(e.dateCompleted));
                }
                if (data.completedAt) {
                    allDates.add(data.completedAt.substring(0, 10));
                }
            });
            console.log('Dates found in monthly_reports:', Array.from(allDates).sort());
        } else {
            console.log(`No data found for month ${monthKey} in reports.`);
        }
    } else {
        console.log('No row found in employee_monthly_reports.');
    }

    // 2. Check employee_monthly_activities (Old table)
    const { data: oldActivities, error: oldError } = await supabase
        .from('employee_monthly_activities')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('month_key', monthKey)
        .maybeSingle();

    if (oldError) {
        // Table might not exist or verify name
        console.log('Error/No table employee_monthly_activities (might be expected):', oldError.message);
    } else if (oldActivities) {
        console.log('\n--- employee_monthly_activities (OLD) ---');
        console.log('Found row:', oldActivities.id);
        console.log('Data keys:', Object.keys(oldActivities.activities || {}));
    } else {
        console.log('\n--- employee_monthly_activities (OLD) ---');
        console.log('No row found.');
    }

    // 3. Check attendance_records (Shalat)
    const { count, error: attError } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employeeId)
        .gte('timestamp', `${monthKey}-01`)
        .lte('timestamp', `${monthKey}-31`);

    console.log('\n--- attendance_records ---');
    console.log(`Count for ${monthKey}:`, count);
    if (attError) console.error(attError);

}

checkData();
