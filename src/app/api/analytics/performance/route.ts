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
        const hospitalId = searchParams.get('hospitalId');
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

        // 4. Fetch Targeted Employee IDs based on filters
        let employeeQuery = supabase.from('employees').select('id').eq('is_active', true);

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
        // Priority 1: Manual Counter Activities (employee_monthly_reports)
        // Priority 2: Prayers (attendance_records)
        // Priority 3: Team Sessions (team_attendance_records)

        const [monthlyReportsRes, attendanceRes, teamRecordsRes] = await Promise.all([
            // Fetch reports for all target employees
            supabase.from('employee_monthly_reports').select('employee_id, reports').in('employee_id', employeeIds),
            // Fetch specific month attendance
            supabase.from('attendance_records').select('employee_id, entity_id').in('employee_id', employeeIds).eq('status', 'hadir').gte('timestamp', startOfMonth).lte('timestamp', endOfMonth + 'T23:59:59'),
            // Fetch session records
            supabase.from('team_attendance_records').select('user_id, session_type').in('user_id', employeeIds).eq('session_date', startOfMonth) // Simplified for session
        ]);

        // 6. Processing Engine
        const activityTotals: Record<string, { achieved: number; target: number }> = {};
        DAILY_ACTIVITIES.forEach(act => {
            activityTotals[act.id] = { achieved: 0, target: employeeIds.length * act.monthlyTarget };
        });

        // Process Manual Reports entries
        monthlyReportsRes.data?.forEach(row => {
            const reports = row.reports || {};
            const monthData = reports[monthKey] || {};
            Object.entries(monthData).forEach(([actId, data]: [string, any]) => {
                if (activityTotals[actId]) {
                    activityTotals[actId].achieved += (data.count || 0);
                }
            });
        });

        // Process Attendance (Prayers)
        attendanceRes.data?.forEach(row => {
            // entity_id usually matches sholat ids like 'subuh', 'dzuhur'
            // In DAILY_ACTIVITIES, we might have IDs like 'subuh-default'
            const prayerId = row.entity_id;
            const activityId = `${prayerId}-default`;
            if (activityTotals[activityId]) {
                activityTotals[activityId].achieved += 1;
            }
        });

        // Map results back to chart format
        const performanceByActivity = DAILY_ACTIVITIES.map(act => {
            const totals = activityTotals[act.id];
            const percentage = totals.target > 0 ? Math.min(100, Math.round((totals.achieved / totals.target) * 100)) : 0;
            return { name: act.title, category: act.category, percentage };
        });

        const categoryTotals: Record<string, { totalPercentage: number; count: number }> = {};
        performanceByActivity.forEach(item => {
            const categoryName = item.category || 'Lainnya';
            if (!categoryTotals[categoryName]) categoryTotals[categoryName] = { totalPercentage: 0, count: 0 };
            categoryTotals[categoryName].totalPercentage += item.percentage;
            categoryTotals[categoryName].count++;
        });

        const performanceByCategory = Object.entries(categoryTotals).map(([name, stats]) => ({
            name,
            Persentase: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
        }));

        const groupedPerformanceByActivity = performanceByActivity.reduce((acc, item) => {
            const categoryName = item.category || 'Lainnya';
            if (!acc[categoryName]) acc[categoryName] = [];
            acc[categoryName].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        return NextResponse.json({
            performanceByCategory,
            groupedPerformanceByActivity,
            employeeCount: employeeIds.length
        });

    } catch (error) {
        console.error('❌ [API] Performance API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
