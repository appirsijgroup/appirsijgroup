import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/admin/bulk-monthly-activities
 * Purpose: Fetch monthly activities for ALL employees in bulk (Admin only)
 */
export async function GET(request: NextRequest) {
    try {
        // Verify authorization (Admin or Mentor/Supervisor/KaUnit)
        const session = await getSession();
        const isAdmin = session && (session.role === 'admin' || session.role === 'super-admin' || session.role === 'owner');
        const isMentor = session && (session.canBeMentor || session.canBeSupervisor || session.canBeKaUnit);

        if (!session || (!isAdmin && !isMentor)) {
            return NextResponse.json({ error: 'Unauthorized - Adequate role required' }, { status: 401 });
        }

        // Get target employee IDs (all if admin, only mentees if mentor)
        let targetEmployeeIds: string[] | null = null;

        // Use service role to bypass RLS
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        if (!isAdmin) {
            // Get mentee IDs for this mentor/supervisor/kaunit
            const { data: mentees } = await supabase
                .from('employees')
                .select('id')
                .or(`mentor_id.eq.${session.userId},supervisor_id.eq.${session.userId},ka_unit_id.eq.${session.userId}`);

            targetEmployeeIds = [session.userId, ...(mentees?.map(m => m.id) || [])];
        }

        // 1. Fetch attendance_records (hadir only)
        let attendanceQuery = supabase
            .from('attendance_records')
            .select('employee_id, timestamp, entity_id')
            .eq('status', 'hadir');

        if (targetEmployeeIds) {
            attendanceQuery = attendanceQuery.in('employee_id', targetEmployeeIds);
        }
        const { data: attendanceData } = await attendanceQuery;

        // 2. Fetch employee_monthly_reports
        let monthlyReportsQuery = supabase
            .from('employee_monthly_reports')
            .select('employee_id, reports');

        if (targetEmployeeIds) {
            monthlyReportsQuery = monthlyReportsQuery.in('employee_id', targetEmployeeIds);
        }
        const { data: monthlyReports } = await monthlyReportsQuery;

        // 3. Fetch tadarus_sessions (all, we'll filter present_mentee_ids in memory)
        const { data: tadarusSessions } = await supabase
            .from('tadarus_sessions')
            .select('date, present_mentee_ids');

        // 4. Fetch team_attendance_records
        let teamAttendanceQuery = supabase
            .from('team_attendance_records')
            .select('user_id, session_type, session_date');

        if (targetEmployeeIds) {
            teamAttendanceQuery = teamAttendanceQuery.in('user_id', targetEmployeeIds);
        }
        const { data: teamAttendance } = await teamAttendanceQuery;

        // Merge everything into a map: employee_id -> monthKey -> dayKey -> { [activity_id]: true }
        const allActivitiesMap: Record<string, Record<string, any>> = {};

        const getEmployeeRecord = (empId: string) => {
            if (!allActivitiesMap[empId]) allActivitiesMap[empId] = {};
            return allActivitiesMap[empId];
        };

        const addActivityEntry = (empId: string, monthKey: string, dayKey: string, activityId: string) => {
            const empRecord = getEmployeeRecord(empId);
            if (!empRecord[monthKey]) empRecord[monthKey] = {};
            if (!empRecord[monthKey][dayKey]) empRecord[monthKey][dayKey] = {};
            empRecord[monthKey][dayKey][activityId] = true;
        };

        // Process attendance records (shalat)
        if (attendanceData) {
            attendanceData.forEach(record => {
                const date = new Date(record.timestamp);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const dayKey = String(date.getDate()).padStart(2, '0');
                // If entity_id is a shalat name, we might want to map it, but the existing API maps 'hadir' status items.
                // The existing API uses 'shalat_berjamaah' as a catch-all for attendance_records? 
                // No, in MutabaahReport.tsx it checks specific IDs.
                // Actually, in the single-user API it uses: record.entity_id or 'shalat_berjamaah'
                // Let's use 'shalat_berjamaah' if it's a prayer, or the entity_id itself.
                addActivityEntry(record.employee_id, monthKey, dayKey, 'shalat_berjamaah');
                // Also add specific entity_id for backward compatibility
                addActivityEntry(record.employee_id, monthKey, dayKey, record.entity_id);
            });
        }

        // Process monthly reports (manual counters)
        if (monthlyReports) {
            monthlyReports.forEach(report => {
                const empId = report.employee_id;
                const reports = report.reports;
                if (!reports) return;

                Object.entries(reports).forEach(([monthKey, monthData]: [string, any]) => {
                    Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
                        if (activityData.entries && Array.isArray(activityData.entries)) {
                            activityData.entries.forEach((entry: any) => {
                                const dayKey = entry.date.substring(8, 10);
                                addActivityEntry(empId, monthKey, dayKey, activityId);
                            });
                        }
                        if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                            activityData.bookEntries.forEach((entry: any) => {
                                const dayKey = entry.dateCompleted.substring(8, 10);
                                addActivityEntry(empId, monthKey, dayKey, activityId);
                            });
                        }
                        if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                            const completedDate = new Date(activityData.completedAt);
                            const dayKey = String(completedDate.getDate()).padStart(2, '0');
                            const cMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                            if (cMonthKey === monthKey) {
                                addActivityEntry(empId, monthKey, dayKey, activityId);
                            }
                        }
                    });
                });
            });
        }

        // Process tadarus sessions
        if (tadarusSessions) {
            tadarusSessions.forEach(session => {
                const date = session.date; // YYYY-MM-DD
                const monthKey = date.substring(0, 7);
                const dayKey = date.substring(8, 10);
                const menteeIds = session.present_mentee_ids || [];
                menteeIds.forEach((empId: string) => {
                    addActivityEntry(empId, monthKey, dayKey, 'tadarus');
                });
            });
        }

        // Process team attendance
        if (teamAttendance) {
            teamAttendance.forEach(record => {
                const date = record.session_date;
                const monthKey = date.substring(0, 7);
                const dayKey = date.substring(8, 10);
                const activityId = record.session_type === 'KIE' ? 'tepat_waktu_kie' : (record.session_type === 'Doa Bersama' ? 'doa_bersama' : record.session_type);
                addActivityEntry(record.user_id, monthKey, dayKey, activityId);
            });
        }

        // All filtering done at query level now
        const finalActivitiesMap = allActivitiesMap;

        return NextResponse.json({ allActivities: finalActivitiesMap });
    } catch (error) {
        console.error('Error in bulk-monthly-activities:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
