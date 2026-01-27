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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // 🔥 NEW: Filter logic for date ranges
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (month && year) {
      startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

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
      let query = supabase
        .from('attendance_records')
        .select('timestamp')
        .eq('employee_id', employeeId)
        .eq('status', 'hadir');

      if (startDate && endDate) {
        query = query.gte('timestamp', startDate).lte('timestamp', endDate + 'T23:59:59');
      }

      const { data: attendanceData, error: attendanceError } = await query;

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
      let query = supabase
        .from('tadarus_sessions')
        .select('date')
        .contains('present_mentee_ids', [employeeId]);

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data: tadarusSessions, error: tadarusError } = await query;

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
      let query = supabase
        .from('team_attendance_records')
        .select('session_type, session_date')
        .eq('user_id', employeeId);

      if (startDate && endDate) {
        query = query.gte('session_date', startDate).lte('session_date', endDate);
      }

      const { data: attendanceRecords, error: teamAttendanceError } = await query;

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

          // Map session type to activity ID (Case-insensitive)
          const typeLower = sessionType?.toLowerCase().trim();
          if (typeLower === 'kie') {
            mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
          } else if (typeLower === 'doa bersama') {
            mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
          } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
            mergedActivities[monthKey][dayKey]['tadarus'] = true;
          } else if (typeLower === 'kajian selasa') {
            mergedActivities[monthKey][dayKey]['kajian_selasa'] = true;
          } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
            mergedActivities[monthKey][dayKey]['persyarikatan'] = true;
          } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
            mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
          }
        });

        console.log('✅ [API] Merged team attendance data:', attendanceRecords.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching team attendance records:', error);
    }

    // 🔥 NEW: Merge data from activity_attendance table (Scheduled Activities: Kajian Selasa, etc)
    try {
      let query = supabase
        .from('activity_attendance')
        .select('status, activities!inner(date, activity_type)')
        .eq('employee_id', employeeId)
        .eq('status', 'hadir');

      if (startDate && endDate) {
        // Using !inner specifies that activities filter should apply
        query = query.gte('activities.date', startDate).lte('activities.date', endDate);
      }

      const { data: scheduledAttData, error: scheduledError } = await query;

      if (scheduledError) {
        console.error('❌ [API] Error fetching scheduled activities:', scheduledError);
      } else if (scheduledAttData && scheduledAttData.length > 0) {
        scheduledAttData.forEach((record: any) => {
          if (!record.activities) return;

          const date = record.activities.date; // YYYY-MM-DD
          const monthKey = date.substring(0, 7);
          const dayKey = date.substring(8, 10);
          const activityType = record.activities.activity_type;
          const typeLower = activityType?.toLowerCase().trim();

          if (!mergedActivities[monthKey]) mergedActivities[monthKey] = {};
          if (!mergedActivities[monthKey][dayKey]) mergedActivities[monthKey][dayKey] = {};

          if (typeLower === 'kajian selasa') {
            mergedActivities[monthKey][dayKey]['kajian_selasa'] = true;
          } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
            mergedActivities[monthKey][dayKey]['persyarikatan'] = true;
          } else if (typeLower === 'kie') {
            mergedActivities[monthKey][dayKey]['tepat_waktu_kie'] = true;
          } else if (typeLower === 'doa bersama') {
            mergedActivities[monthKey][dayKey]['doa_bersama'] = true;
          } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
            mergedActivities[monthKey][dayKey]['tadarus'] = true;
          } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
            mergedActivities[monthKey][dayKey]['baca_alquran_buku'] = true;
          }
        });
        console.log('✅ [API] Merged scheduled activity records:', scheduledAttData.length);
      }
    } catch (error) {
      console.error('❌ [API] Error fetching activity_attendance:', error);
    }

    // 🔥 NEW: Merge APPROVED tadarus_requests
    try {
      let query = supabase
        .from('tadarus_requests')
        .select('date')
        .eq('mentee_id', employeeId)
        .eq('status', 'approved');

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data: approvedTadarus, error: tadarusReqError } = await query;

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
      let query = supabase
        .from('missed_prayer_requests')
        .select('date, prayer_id')
        .eq('mentee_id', employeeId)
        .eq('status', 'approved');

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data: approvedPrayers, error: prayerReqError } = await query;

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
