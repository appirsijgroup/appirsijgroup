import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/monthly-activities
 * Purpose: Handle monthly activities GET operations with service role authentication
 * This bypasses RLS policies for authenticated users
 *
 * 🔥 FIX: Now merges data from multiple sources (NO CACHE):
 * - employee_monthly_reports (manual counter activities)
 * - tadarus_sessions (RSIJ bertadarus)
 * - team_attendance_records (KIE & Doa Bersama)
 * - attendance_records (shalat berjamaah)
 */

// Get monthly activities for an employee
export async function GET(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

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

    // Verify authorization: Admins and owners are always allowed
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      // Check if the requester is the mentor/supervisor/manager/kaunit of the target employee
      const { data: targetEmployee, error: empError } = await supabase
        .from('employees')
        .select('mentor_id, supervisor_id, manager_id, ka_unit_id, dirut_id')
        .eq('id', employeeId)
        .single();

      if (empError || !targetEmployee) {
        return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
      }

      const isAuthorizedRelation =
        targetEmployee.mentor_id === session.userId ||
        targetEmployee.supervisor_id === session.userId ||
        targetEmployee.manager_id === session.userId ||
        targetEmployee.ka_unit_id === session.userId ||
        targetEmployee.dirut_id === session.userId;

      if (!isAuthorizedRelation) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to view this data' }, { status: 403 });
      }
    }

    // 🔥 FIX: Start with empty object - NO CACHE, directly merge from all sources
    const mergedActivities: Record<string, any> = {};

    // 🔥 NEW: Merge data from attendance_records table (shalat berjamaah)
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('timestamp')
        .eq('employee_id', employeeId)
        .eq('status', 'hadir');

      if (attendanceError) {
        console.error('❌ [API] Error fetching attendance records:', attendanceError);
      } else if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach((record: any) => {
          const date = new Date(record.timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayOfMonth = date.getDate();
          const dayKey = String(dayOfMonth).padStart(2, '0');
          const monthKey = `${year}-${month}`;

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          mergedActivities[monthKey][dayKey]['shalat_berjamaah'] = true;
        });

        console.log('✅ [API] Merged attendance records (shalat berjamaah):', attendanceData.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching attendance records:', error);
    }

    // 🔥 NEW: Merge data from employee_monthly_reports table
    try {
      const { data: monthlyReports, error: reportsError } = await supabase
        .from('employee_monthly_reports')
        .select('reports')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (reportsError) {
        console.error('❌ [API] Error fetching monthly reports:', reportsError);
      } else if (monthlyReports?.reports) {
        // Helper function to convert reports to activities format
        const convertReportsToActivities = (reports: any): Record<string, any> => {
          const result: Record<string, any> = {};

          Object.entries(reports).forEach(([monthKey, monthData]: [string, any]) => {
            if (!result[monthKey]) {
              result[monthKey] = {};
            }

            Object.entries(monthData).forEach(([activityId, activityData]: [string, any]) => {
              // Process entries (manual reports per date)
              if (activityData.entries && Array.isArray(activityData.entries)) {
                activityData.entries.forEach((entry: any) => {
                  const dayKey = entry.date.substring(8, 10);

                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                });
              }

              // Process bookEntries (reading reports)
              if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                activityData.bookEntries.forEach((entry: any) => {
                  const dayKey = entry.dateCompleted.substring(8, 10);

                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                });
              }

              // Handle activities with only completedAt (no entries array)
              if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                const completedDate = new Date(activityData.completedAt);
                const dayKey = String(completedDate.getDate()).padStart(2, '0');
                const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;

                if (completedMonthKey === monthKey) {
                  if (!result[monthKey][dayKey]) {
                    result[monthKey][dayKey] = {};
                  }

                  result[monthKey][dayKey][activityId] = true;
                }
              }
            });
          });

          return result;
        };

        const monthlyReportsActivities = convertReportsToActivities(monthlyReports.reports);

        // Merge into result
        Object.entries(monthlyReportsActivities).forEach(([monthKey, monthData]) => {
          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          Object.entries(monthData).forEach(([dayKey, dayData]) => {
            if (!mergedActivities[monthKey][dayKey]) {
              mergedActivities[monthKey][dayKey] = {};
            }

            Object.assign(mergedActivities[monthKey][dayKey], dayData);
          });
        });

        console.log('✅ [API] Merged monthly reports data');
      }
    } catch (error) {
      console.error('❌ [API] Error fetching monthly reports:', error);
    }

    // 🔥 NEW: Merge data from tadarus_sessions table
    try {
      const { data: tadarusSessions, error: tadarusError } = await supabase
        .from('tadarus_sessions')
        .select('date')
        .contains('present_mentee_ids', [employeeId]);

      if (tadarusError) {
        console.error('❌ [API] Error fetching tadarus sessions:', tadarusError);
      } else if (tadarusSessions && tadarusSessions.length > 0) {
        tadarusSessions.forEach((session: any) => {
          const date = session.date; // YYYY-MM-DD
          const monthKey = date.substring(0, 7); // YYYY-MM
          const dayKey = date.substring(8, 10); // DD

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          mergedActivities[monthKey][dayKey]['tadarus'] = true;
        });

        console.log('✅ [API] Merged tadarus sessions data:', tadarusSessions.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching tadarus sessions:', error);
    }

    // 🔥 NEW: Merge data from team_attendance_records table
    try {
      const { data: attendanceRecords, error: teamAttendanceError } = await supabase
        .from('team_attendance_records')
        .select('session_type, session_date')
        .eq('user_id', employeeId);

      if (teamAttendanceError) {
        console.error('❌ [API] Error fetching team attendance records:', teamAttendanceError);
      } else if (attendanceRecords && attendanceRecords.length > 0) {
        attendanceRecords.forEach((record: any) => {
          const date = record.session_date; // YYYY-MM-DD
          const monthKey = date.substring(0, 7); // YYYY-MM
          const dayKey = date.substring(8, 10); // DD
          const sessionType = record.session_type; // 'KIE' or 'Doa Bersama'

          if (!mergedActivities[monthKey]) {
            mergedActivities[monthKey] = {};
          }

          if (!mergedActivities[monthKey][dayKey]) {
            mergedActivities[monthKey][dayKey] = {};
          }

          // Map session type to activity ID
          if (sessionType === 'KIE') {
            mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
          } else if (sessionType === 'Doa Bersama') {
            mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
          }
        });

        console.log('✅ [API] Merged team attendance data:', attendanceRecords.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching team attendance records:', error);
    }

    // 🔥 NEW: Merge APPROVED tadarus_requests
    try {
      const { data: approvedTadarus, error: tadarusReqError } = await supabase
        .from('tadarus_requests')
        .select('date')
        .eq('mentee_id', employeeId)
        .eq('status', 'approved');

      if (tadarusReqError) {
        console.error('❌ [API] Error fetching approved tadarus requests:', tadarusReqError);
      } else if (approvedTadarus && approvedTadarus.length > 0) {
        approvedTadarus.forEach((req: any) => {
          const monthKey = req.date.substring(0, 7);
          const dayKey = req.date.substring(8, 10);

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          mergedActivities[monthKey][dayKey]['tadarus'] = true;
        });
        console.log('✅ [API] Merged approved tadarus requests:', approvedTadarus.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching tadarus requests:', error);
    }

    // 🔥 NEW: Merge APPROVED missed_prayer_requests
    try {
      const { data: approvedPrayers, error: prayerReqError } = await supabase
        .from('missed_prayer_requests')
        .select('date, prayer_id')
        .eq('mentee_id', employeeId)
        .eq('status', 'approved');

      if (prayerReqError) {
        console.error('❌ [API] Error fetching approved prayer requests:', prayerReqError);
      } else if (approvedPrayers && approvedPrayers.length > 0) {
        approvedPrayers.forEach((req: any) => {
          const monthKey = req.date.substring(0, 7);
          const dayKey = req.date.substring(8, 10);

          // Map database IDs to Mutabaah activity IDs
          // subuh -> subuh-default, etc.
          const activityId = `${req.prayer_id}-default`;

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          mergedActivities[monthKey][dayKey][activityId] = true;
        });
        console.log('✅ [API] Merged approved prayer requests:', approvedPrayers.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching prayer requests:', error);
    }

    return NextResponse.json({ activities: mergedActivities });
  } catch (error) {
    console.error('GET /api/monthly-activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
