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
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase().trim();
        const employeeId = searchParams.get('employeeId'); // Specific user override

        // 2a. Role-Based Security Check
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: user } = await supabase
            .from('employees')
            .select('role, hospital_id, functional_roles, managed_hospital_ids')
            .eq('id', session.userId)
            .single();

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isBPH = (user.functional_roles || []).includes('BPH');
        const isSuper = user.role === 'super-admin';
        const canSeeGlobal = isBPH || isSuper;

        let enforcedHospitalId = hospitalId;
        if (!canSeeGlobal) {
            const allowedHospitals = [user.hospital_id, ...(user.managed_hospital_ids || [])].filter(Boolean).map(id => id.toLowerCase());
            if (!enforcedHospitalId || enforcedHospitalId === 'all') {
                enforcedHospitalId = user.hospital_id?.toLowerCase() || 'unknown';
            } else if (!allowedHospitals.includes(enforcedHospitalId)) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }
        }

        if (!month || !year) return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });

        const monthKey = `${year}-${month.padStart(2, '0')}`;

        // 4. Fetch Targeted Employee IDs based on filters (Exclude non-numeric IDs)
        let employeeQuery = supabase.from('employees')
            .select('id, hospital_id, unit')
            .eq('is_active', true)
            .not('role', 'in', '(admin,super-admin)');

        if (employeeId && employeeId !== 'undefined' && employeeId !== 'all') {
            employeeQuery = employeeQuery.eq('id', employeeId);
        } else {
            if (unit && unit !== 'all') employeeQuery = employeeQuery.eq('unit', unit);
            if (bagian && bagian !== 'all') employeeQuery = employeeQuery.eq('bagian', bagian);
            if (professionCategory && professionCategory !== 'all') employeeQuery = employeeQuery.eq('profession_category', professionCategory);
            if (profession && profession !== 'all') employeeQuery = employeeQuery.eq('profession', profession);
            if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                // Use a more resilient match to handle trailing spaces or minor variations
                employeeQuery = employeeQuery.or(`hospital_id.ilike.${enforcedHospitalId},hospital_id.ilike."${enforcedHospitalId} "`);
            }
        }

        const { data: targetEmployees, error: empError } = await employeeQuery;
        if (empError) throw empError;

        const employeeIds = targetEmployees.map(e => e.id);

        // Preparation of categories even for 0 results
        const emptyGroupedPerformance: Record<string, any[]> = {};
        DAILY_ACTIVITIES.forEach(act => {
            if (!emptyGroupedPerformance[act.category]) emptyGroupedPerformance[act.category] = [];
            emptyGroupedPerformance[act.category].push({
                name: act.title,
                category: act.category,
                percentage: 0,
                achieved: 0,
                target: 0
            });
        });

        if (employeeIds.length === 0) {
            const defaultPerformance = Object.entries(emptyGroupedPerformance).map(([name]) => ({
                name,
                Persentase: 0
            })).sort((a, b) => a.name.localeCompare(b.name));

            return NextResponse.json({
                performanceByCategory: defaultPerformance,
                groupedPerformanceByActivity: emptyGroupedPerformance,
                employeeCount: 0,
                hospitalComparison: []
            });
        }

        const startOfMonth = `${monthKey}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endOfMonth = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

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
        // Track direct counts for manual reports per user
        // Structure: activityId -> userId -> count
        const userActivityCounts: Record<string, Record<string, number>> = {};

        DAILY_ACTIVITIES.forEach(act => {
            userActivityDays[act.id] = {};
            userActivityCounts[act.id] = {};
        });

        const trackDay = (userId: string, actId: string, dateStr: string) => {
            if (!userActivityDays[actId]) return;
            if (!userActivityDays[actId][userId]) userActivityDays[actId][userId] = new Set();
            // dateStr can be YYYY-MM-DD or full timestamp
            const dayKey = dateStr.substring(0, 10);
            userActivityDays[actId][userId].add(dayKey);
        };

        const trackCount = (userId: string, actId: string, count: number) => {
            if (!userActivityCounts[actId]) return;
            if (!userActivityCounts[actId][userId]) userActivityCounts[actId][userId] = 0;
            userActivityCounts[actId][userId] += count;
        };

        // 6a. Process Manual Reports (direct counts per user)
        monthlyReportsRes.data?.forEach(row => {
            const reports = row.reports || {};
            const monthData = reports[monthKey] || {};
            Object.entries(monthData).forEach(([actId, data]: [string, any]) => {
                if (userActivityCounts.hasOwnProperty(actId)) {
                    trackCount(row.employee_id, actId, data.count || 0);
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
            let totalAchieved = 0;

            // 1. Add counts from userActivityCounts (manual reports)
            if (userActivityCounts[act.id]) {
                Object.values(userActivityCounts[act.id]).forEach(count => {
                    totalAchieved += count;
                });
            }

            // 2. Add counts from tracked days (automated/session activities)
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

        // --- NEW: Hospital/Unit Breakdown for Comparison ---
        let hospitalComparison: any[] = [];
        const isAllMode = !enforcedHospitalId || enforcedHospitalId === 'all';

        if (isAllMode) {
            const { data: hospitals } = await supabase.from('hospitals').select('id, brand, name');
            const hospitalMap: Record<string, any> = {};

            (hospitals || []).forEach(h => {
                const lowerId = h.id.toLowerCase();
                hospitalMap[lowerId] = {
                    id: h.id,
                    brand: h.brand,
                    categories: {
                        'SIDIQ': { total: 0, count: 0 },
                        'TABLIGH': { total: 0, count: 0 },
                        'AMANAH': { total: 0, count: 0 },
                        'FATONAH': { total: 0, count: 0 }
                    }
                };
            });

            // Group employees for hospital calculation
            const employeesByHospital: Record<string, string[]> = {};
            targetEmployees.forEach(emp => {
                const hid = emp.hospital_id?.toLowerCase().trim();
                if (hid && hospitalMap[hid]) {
                    if (!employeesByHospital[hid]) employeesByHospital[hid] = [];
                    employeesByHospital[hid].push(emp.id);
                }
            });

            // Calculate each hospital performance
            Object.entries(employeesByHospital).forEach(([hid, empIds]) => {
                DAILY_ACTIVITIES.forEach(act => {
                    let achievedForHospital = 0;
                    if (userActivityCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityCounts[act.id][eid]) achievedForHospital += userActivityCounts[act.id][eid]; });
                    }
                    if (userActivityDays[act.id]) {
                        empIds.forEach(eid => { if (userActivityDays[act.id][eid]) achievedForHospital += Math.min(act.monthlyTarget, userActivityDays[act.id][eid].size); });
                    }
                    const totalTarget = empIds.length * act.monthlyTarget;
                    const activityPercentage = totalTarget > 0 ? Math.min(100, Math.round((achievedForHospital / totalTarget) * 100)) : 0;
                    const shortCat = Object.keys(hospitalMap[hid].categories).find(c => act.category.startsWith(c));
                    if (shortCat) {
                        hospitalMap[hid].categories[shortCat].total += activityPercentage;
                        hospitalMap[hid].categories[shortCat].count++;
                    }
                });
            });

            hospitalComparison = (hospitals || []).map(h => {
                const lowerId = h.id.toLowerCase();
                const hData = hospitalMap[lowerId];
                const result: any = { id: h.id, brand: h.brand };
                ['SIDIQ', 'TABLIGH', 'AMANAH', 'FATONAH'].forEach(cat => {
                    const stats = hData.categories[cat];
                    result[cat] = stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
                });
                return result;
            }).sort((a, b) => a.brand.localeCompare(b.brand));
        } else {
            // Aggregate by UNIT for the selected hospital
            const units = Array.from(new Set(targetEmployees.map(e => e.unit || 'Tanpa Unit'))).sort();
            const unitMap: Record<string, any> = {};
            units.forEach(u => {
                unitMap[u] = {
                    id: u,
                    brand: u,
                    categories: {
                        'SIDIQ': { total: 0, count: 0 },
                        'TABLIGH': { total: 0, count: 0 },
                        'AMANAH': { total: 0, count: 0 },
                        'FATONAH': { total: 0, count: 0 }
                    }
                };
            });

            const employeesByUnit: Record<string, string[]> = {};
            targetEmployees.forEach(emp => {
                const u = emp.unit || 'Tanpa Unit';
                if (!employeesByUnit[u]) employeesByUnit[u] = [];
                employeesByUnit[u].push(emp.id);
            });

            Object.entries(employeesByUnit).forEach(([unit, empIds]) => {
                DAILY_ACTIVITIES.forEach(act => {
                    let achievedForUnit = 0;
                    if (userActivityCounts[act.id]) {
                        empIds.forEach(eid => { if (userActivityCounts[act.id][eid]) achievedForUnit += userActivityCounts[act.id][eid]; });
                    }
                    if (userActivityDays[act.id]) {
                        empIds.forEach(eid => { if (userActivityDays[act.id][eid]) achievedForUnit += Math.min(act.monthlyTarget, userActivityDays[act.id][eid].size); });
                    }
                    const totalTarget = empIds.length * act.monthlyTarget;
                    const activityPercentage = totalTarget > 0 ? Math.min(100, Math.round((achievedForUnit / totalTarget) * 100)) : 0;
                    const shortCat = Object.keys(unitMap[unit].categories).find(c => act.category.startsWith(c));
                    if (shortCat) {
                        unitMap[unit].categories[shortCat].total += activityPercentage;
                        unitMap[unit].categories[shortCat].count++;
                    }
                });
            });

            hospitalComparison = units.map(u => {
                const result: any = { id: u, brand: u };
                ['SIDIQ', 'TABLIGH', 'AMANAH', 'FATONAH'].forEach(cat => {
                    const stats = unitMap[u].categories[cat];
                    result[cat] = stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
                });
                return result;
            });
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
