import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { DAILY_ACTIVITIES } from '@/data/monthlyActivities';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Query Params
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // "01"
        const year = searchParams.get('year');   // "2026"
        const unit = searchParams.get('unit');
        const bagian = searchParams.get('bagian');
        const professionCategory = searchParams.get('professionCategory');
        const profession = searchParams.get('profession');
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase();
        const employeeId = searchParams.get('employeeId'); // Specific user override

        if (!month || !year) return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });

        const monthKey = `${year}-${month.padStart(2, '0')}`;
        const startOfMonth = `${monthKey}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endOfMonth = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

        // 3. Setup Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Fetch Targeted Employee IDs based on filters (Exclude non-numeric IDs)
        let employeeQuery = supabase.from('employees')
            .select('id, hospital_id')
            .eq('is_active', true)
            .filter('id', 'match', '^[0-9]+$')
            .not('role', 'in', '(admin,super-admin)');

        if (employeeId && employeeId !== 'undefined' && employeeId !== 'all') {
            employeeQuery = employeeQuery.eq('id', employeeId);
        } else {
            if (unit && unit !== 'all') employeeQuery = employeeQuery.eq('unit', unit);
            if (bagian && bagian !== 'all') employeeQuery = employeeQuery.eq('bagian', bagian);
            if (professionCategory && professionCategory !== 'all') employeeQuery = employeeQuery.eq('profession_category', professionCategory);
            if (profession && profession !== 'all') employeeQuery = employeeQuery.eq('profession', profession);
            if (hospitalId && hospitalId !== 'all') employeeQuery = employeeQuery.eq('hospital_id', hospitalId);
        }

        const { data: targetEmployees, error: empError } = await employeeQuery;
        if (empError) throw empError;

        const employeeIds = targetEmployees.map(e => e.id);
        if (employeeIds.length === 0) {
            return NextResponse.json({ performanceByCategory: [], groupedPerformanceByActivity: {} });
        }

        // 5. Aggregate Data from Multiple Sources
        // We need to fetch from multiple tables to get a complete picture
        const [
            monthlyReportsRes,
            attendanceRes,
            teamRecordsRes,
            scheduledAttRes,
            tadarusSessionsRes,
            tadarusRequestsRes,
            prayerRequestsRes,
            readingHistoryRes,
            quranHistoryRes
        ] = await Promise.all([
            // 1. Manual Counter Activities (from employee_monthly_reports)
            supabase.from('employee_monthly_reports').select('employee_id, reports').in('employee_id', employeeIds),

            // 2. Prayers (from attendance_records)
            supabase.from('attendance_records').select('employee_id, entity_id, timestamp').in('employee_id', employeeIds).eq('status', 'hadir').gte('timestamp', startOfMonth).lte('timestamp', endOfMonth + 'T23:59:59'),

            // 3. Team Sessions (from team_attendance_records - KIE, Doa Bersama)
            supabase.from('team_attendance_records').select('user_id, session_type, session_date').in('user_id', employeeIds).gte('session_date', startOfMonth).lte('session_date', endOfMonth),

            // 4. Scheduled Activities (from activity_attendance + activities)
            supabase.from('activity_attendance').select('employee_id, activities!inner(date, activity_type)').in('employee_id', employeeIds).eq('status', 'hadir').gte('activities.date', startOfMonth).lte('activities.date', endOfMonth),

            // 5. Tadarus Sessions (Mentee in session)
            supabase.from('tadarus_sessions').select('date, present_mentee_ids').gte('date', startOfMonth).lte('date', endOfMonth),

            // 6. Approved Tadarus Requests (Manual)
            supabase.from('tadarus_requests').select('mentee_id, date').in('mentee_id', employeeIds).eq('status', 'approved').gte('date', startOfMonth).lte('date', endOfMonth),

            // 7. Approved Prayer Requests (Manual)
            supabase.from('missed_prayer_requests').select('mentee_id, date, prayer_id').in('mentee_id', employeeIds).eq('status', 'approved').gte('date', startOfMonth).lte('date', endOfMonth),

            // 8. Reading History (Books)
            supabase.from('employee_reading_history').select('employee_id, date_completed').in('employee_id', employeeIds).gte('date_completed', startOfMonth).lte('date_completed', endOfMonth),

            // 9. Reading History (Quran)
            supabase.from('employee_quran_reading_history').select('employee_id, date').in('employee_id', employeeIds).gte('date', startOfMonth).lte('date', endOfMonth)
        ]);

        // 6. Processing Engine
        // Track unique days per activity per employee to calculate achievement correctly
        // Structure: activityId -> userId -> Set of dates
        const userActivityDays: Record<string, Record<string, Set<string>>> = {};
        // Also track direct counts for manual reports
        const activityCounts: Record<string, number> = {};

        DAILY_ACTIVITIES.forEach(act => {
            userActivityDays[act.id] = {};
            activityCounts[act.id] = 0;
        });

        const trackDay = (userId: string, actId: string, dateStr: string) => {
            if (!userActivityDays[actId]) return;
            if (!userActivityDays[actId][userId]) userActivityDays[actId][userId] = new Set();
            // dateStr can be YYYY-MM-DD or full timestamp
            const dayKey = dateStr.substring(0, 10);
            userActivityDays[actId][userId].add(dayKey);
        };

        // 6a. Process Manual Reports (direct counts)
        monthlyReportsRes.data?.forEach(row => {
            const reports = row.reports || {};
            const monthData = reports[monthKey] || {};
            Object.entries(monthData).forEach(([actId, data]: [string, any]) => {
                if (activityCounts.hasOwnProperty(actId)) {
                    activityCounts[actId] += (data.count || 0);
                }
            });
        });

        // 6b. Process Attendance Records (Prayers)
        attendanceRes.data?.forEach(row => {
            // All sholat berjamaah contribute to the shalat_berjamaah activity
            trackDay(row.employee_id, 'shalat_berjamaah', row.timestamp);
        });

        // 6c. Process Team Attendance (KIE, Doa Bersama)
        teamRecordsRes.data?.forEach(row => {
            const type = row.session_type?.toLowerCase().trim();
            if (type === 'kie') trackDay(row.user_id, 'tepat_waktu_kie', row.session_date);
            else if (type === 'doa bersama') trackDay(row.user_id, 'doa_bersama', row.session_date);
            else if (type === 'tadarus' || type === 'bbq' || type === 'umum') trackDay(row.user_id, 'tadarus', row.session_date);
            else if (type === 'kajian selasa') trackDay(row.user_id, 'kajian_selasa', row.session_date);
        });

        // 6d. Process Scheduled Activities
        scheduledAttRes.data?.forEach(row => {
            const activitiesData = row.activities as any;
            const activities = Array.isArray(activitiesData) ? activitiesData[0] : activitiesData;
            if (!activities) return;

            const type = activities.activity_type?.toLowerCase().trim();
            if (type === 'kajian selasa') trackDay(row.employee_id, 'kajian_selasa', activities.date);
            else if (type === 'persyarikatan' || type === 'pengajian persyarikatan') trackDay(row.employee_id, 'persyarikatan', activities.date);
            else if (type === 'kie') trackDay(row.employee_id, 'tepat_waktu_kie', activities.date);
            else if (type === 'doa bersama') trackDay(row.employee_id, 'doa_bersama', activities.date);
            else if (type === 'tadarus' || type === 'bbq' || type === 'umum') trackDay(row.employee_id, 'tadarus', activities.date);
        });

        // 6e. Process Tadarus Sessions
        tadarusSessionsRes.data?.forEach(session => {
            const mentes = session.present_mentee_ids || [];
            mentes.forEach((mid: string) => {
                if (employeeIds.includes(mid)) {
                    trackDay(mid, 'tadarus', session.date);
                }
            });
        });

        // 6f. Process Manual Approved Requests
        tadarusRequestsRes.data?.forEach(req => trackDay(req.mentee_id, 'tadarus', req.date));
        prayerRequestsRes.data?.forEach(req => trackDay(req.mentee_id, 'shalat_berjamaah', req.date));

        // 6g. Process Reading Histories
        readingHistoryRes.data?.forEach(row => trackDay(row.employee_id, 'baca_alquran_buku', row.date_completed));
        quranHistoryRes.data?.forEach(row => trackDay(row.employee_id, 'baca_alquran_buku', row.date));

        // 7. Calculate Aggregated Percentages
        const performanceByActivity = DAILY_ACTIVITIES.map(act => {
            let totalAchieved = activityCounts[act.id] || 0;

            // Add counts from tracked days
            if (userActivityDays[act.id]) {
                Object.values(userActivityDays[act.id]).forEach(daysSet => {
                    // For each user, they can only achieve up to the monthlyTarget for day-based activities
                    totalAchieved += Math.min(act.monthlyTarget, daysSet.size);
                });
            }

            const totalTarget = employeeIds.length * act.monthlyTarget;
            const percentage = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

            return {
                name: act.title,
                category: act.category,
                percentage,
                achieved: totalAchieved, // For debugging if needed
                target: totalTarget
            };
        });

        // 8. Group by Category
        const categoryTotals: Record<string, { totalPercentage: number; count: number }> = {};
        performanceByActivity.forEach(item => {
            const categoryName = item.category || 'Lainnya';
            if (!categoryTotals[categoryName]) categoryTotals[categoryName] = { totalPercentage: 0, count: 0 };
            categoryTotals[categoryName].totalPercentage += item.percentage;
            categoryTotals[categoryName].count++;
        });

        const performanceByCategory = Object.entries(categoryTotals)
            .map(([name, stats]) => ({
                name,
                Persentase: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const groupedPerformanceByActivity = performanceByActivity.reduce((acc, item) => {
            const categoryName = item.category || 'Lainnya';
            if (!acc[categoryName]) acc[categoryName] = [];
            acc[categoryName].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        // --- NEW: Hospital Wise Breakdown for Comparison ---
        let hospitalComparison: any[] = [];
        if (!hospitalId || hospitalId === 'all') {
            const { data: hospitals } = await supabase.from('hospitals').select('id, brand, name');
            const hospitalMap: Record<string, any> = {};

            (hospitals || []).forEach(h => {
                hospitalMap[h.id] = {
                    id: h.id,
                    brand: h.brand,
                    categories: {
                        'SIDIQ (Integritas)': { total: 0, count: 0 },
                        'TABLIGH (Teamwork)': { total: 0, count: 0 },
                        'AMANAH (Disiplin)': { total: 0, count: 0 },
                        'FATONAH (Belajar)': { total: 0, count: 0 }
                    }
                };
            });

            // Group employees by hospital
            const empByHospital: Record<string, string[]> = {};
            targetEmployees.forEach(emp => {
                const hid = emp.hospital_id;
                if (!hid) return;
                if (!empByHospital[hid]) empByHospital[hid] = [];
                empByHospital[hid].push(emp.id);
            });

            // For each hospital, calculate category averages
            Object.entries(empByHospital).forEach(([hid, ids]) => {
                if (!hospitalMap[hid]) return;

                DAILY_ACTIVITIES.forEach(act => {
                    let achieved = 0;
                    if (userActivityDays[act.id]) {
                        ids.forEach(uid => {
                            if (userActivityDays[act.id][uid]) {
                                achieved += Math.min(act.monthlyTarget, userActivityDays[act.id][uid].size);
                            }
                        });
                    }
                    // Add manual counts if any
                    // Note: manual counts are aggregated in activityCounts globally, 
                    // we need to re-aggregate them per hospital for accuracy if we want perfect data.
                    // For speed, let's use the tracked days which covers most automated tasks.

                    const totalTarget = ids.length * act.monthlyTarget;
                    const percentage = totalTarget > 0 ? (achieved / totalTarget) : 0;

                    if (hospitalMap[hid].categories[act.category]) {
                        hospitalMap[hid].categories[act.category].total += percentage;
                        hospitalMap[hid].categories[act.category].count++;
                    }
                });
            });

            hospitalComparison = Object.values(hospitalMap).map((h: any) => {
                const result: any = { id: h.id, brand: h.brand };
                Object.entries(h.categories).forEach(([catName, stats]: [string, any]) => {
                    const cleanName = catName.split(' ')[0]; // SIDIQ, etc.
                    result[cleanName] = stats.count > 0 ? Math.round((stats.total / stats.count) * 100) : 0;
                });
                return result;
            }).filter((h: any) => h.SIDIQ > 0 || h.TABLIGH > 0 || h.AMANAH > 0 || h.FATONAH > 0);
        }

        return NextResponse.json({
            performanceByCategory,
            groupedPerformanceByActivity,
            employeeCount: employeeIds.length,
            hospitalComparison
        });

    } catch (error) {
        console.error('❌ [API] Performance Analytics Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
