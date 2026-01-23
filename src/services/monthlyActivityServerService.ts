import { createClient } from '@supabase/supabase-js';

/**
 * Server-side service to aggregate monthly activities from multiple sources.
 * This logic matches the aggregation in /api/monthly-activities route.
 */
export async function getAggregatedMonthlyActivities(employeeId: string) {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseServiceKey || !supabaseUrl) {
        throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const mergedActivities: Record<string, any> = {};

    try {
        // 1. Shalat Berjamaah
        const { data: attendanceData } = await supabase
            .from('attendance_records')
            .select('timestamp')
            .eq('employee_id', employeeId)
            .eq('status', 'hadir');

        if (attendanceData && attendanceData.length > 0) {
            attendanceData.forEach((record: any) => {
                const date = new Date(record.timestamp);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const dayKey = String(date.getDate()).padStart(2, '0');
                const monthKey = `${year}-${month}`;

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                mergedActivities[monthKey][dayKey]['shalat_berjamaah'] = true;
            });
        }

        // 2. Monthly Reports (Manual counters)
        const { data: monthlyReports } = await supabase
            .from('employee_monthly_reports')
            .select('reports')
            .eq('employee_id', employeeId)
            .maybeSingle();

        if (monthlyReports?.reports) {
            Object.entries(monthlyReports.reports).forEach(([monthKey, monthData]: [string, any]) => {
                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};

                Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
                    if (activityData.entries && Array.isArray(activityData.entries)) {
                        activityData.entries.forEach((entry: any) => {
                            const dayKey = entry.date.substring(8, 10);
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        });
                    }
                    if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                        activityData.bookEntries.forEach((entry: any) => {
                            const dayKey = entry.dateCompleted.substring(8, 10);
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        });
                    }
                    if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                        const completedDate = new Date(activityData.completedAt);
                        const dayKey = String(completedDate.getDate()).padStart(2, '0');
                        const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                        if (completedMonthKey === monthKey) {
                            if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                            mergedActivities[monthKey][dayKey][activityId] = true;
                        }
                    }
                });
            });
        }

        // 3. Tadarus Sessions
        const { data: tadarusSessions } = await supabase
            .from('tadarus_sessions')
            .select('date')
            .contains('present_mentee_ids', [employeeId]);

        if (tadarusSessions && tadarusSessions.length > 0) {
            tadarusSessions.forEach((session: any) => {
                const date = session.date;
                const monthKey = date.substring(0, 7);
                const dayKey = date.substring(8, 10);
                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};
                mergedActivities[monthKey][dayKey]['tadarus'] = true;
            });
        }

        // 4. Team Attendance Records (KIE & Doa Bersama)
        const { data: attendanceRecords } = await supabase
            .from('team_attendance_records')
            .select('session_type, session_date')
            .eq('user_id', employeeId);

        if (attendanceRecords && attendanceRecords.length > 0) {
            attendanceRecords.forEach((record: any) => {
                const date = record.session_date;
                const monthKey = date.substring(0, 7);
                const dayKey = date.substring(8, 10);
                const sessionType = record.session_type;

                if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
                if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

                if (sessionType === 'KIE') mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
                else if (sessionType === 'Doa Bersama') mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
            });
        }

    } catch (error) {
        console.error('Error aggregating monthly activities:', error);
    }

    return mergedActivities;
}
