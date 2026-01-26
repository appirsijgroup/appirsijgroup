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
        const year = searchParams.get('year');
        const hospitalId = searchParams.get('hospitalId');
        const unit = searchParams.get('unit');
        const profession = searchParams.get('profession');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 });

        // 3. Setup Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Build Employee Query
        let empQuery = supabase.from('employees').select('id, name, unit, profession, hospital_id, mentor_id, profession_category', { count: 'exact' }).eq('is_active', true);

        if (hospitalId && hospitalId !== 'all') {
            // Find hospital brand/id to match
            const { data: hosp } = await supabase.from('hospitals').select('id, brand').eq('id', hospitalId).single();
            if (hosp) {
                empQuery = empQuery.or(`hospital_id.eq.${hosp.id},hospital_id.eq.${hosp.brand}`);
            }
        }

        if (unit && unit !== 'all') empQuery = empQuery.eq('unit', unit);
        if (profession && profession !== 'all') empQuery = empQuery.eq('profession', profession);
        if (search) empQuery = empQuery.or(`name.ilike.%${search}%,id.ilike.%${search}%`);

        // First, let's get the list of employees for the current page
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: employees, count: totalCount, error: empError } = await empQuery
            .order('name', { ascending: true })
            .range(from, to);

        if (empError) throw empError;
        if (!employees || employees.length === 0) {
            return NextResponse.json({ records: [], total: 0, totalPages: 0 });
        }

        const employeeIds = employees.map(e => e.id);

        // 5. Fetch Activity Reports for these employees for the WHOLE year
        // We fetch reports where key starts with the year
        const { data: reports, error: reportError } = await supabase
            .from('employee_monthly_reports')
            .select('employee_id, reports')
            .in('employee_id', employeeIds);

        if (reportError) throw reportError;

        // 6. Process Stats
        const sidiqActivities = DAILY_ACTIVITIES.filter(a => a.category === 'SIDIQ (Integritas)');
        const tablighActivities = DAILY_ACTIVITIES.filter(a => a.category === 'TABLIGH (Teamwork)');
        const amanahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'AMANAH (Disiplin)');
        const fatonahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'FATONAH (Belajar)');

        const monthlySidiqTarget = sidiqActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyTablighTarget = tablighActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyAmanahTarget = amanahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyFatonahTarget = fatonahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);

        // Map reports for easier access
        const reportMap = new Map();
        reports.forEach(r => reportMap.set(r.employee_id, r.reports || {}));

        // 7. Assemble final records
        const records = employees.map(emp => {
            const allReports = reportMap.get(emp.id) || {};

            let sidiqCount = 0;
            let tablighCount = 0;
            let amanahCount = 0;
            let fatonahCount = 0;
            let monthsCount = 0;

            // Iterate through months of the requested year
            for (let m = 1; m <= 12; m++) {
                const monthKey = `${year}-${String(m).padStart(2, '0')}`;
                const monthData = allReports[monthKey];

                if (monthData) {
                    monthsCount++;

                    // Helper to count entries for specific activity IDs 
                    const countForCategory = (activities: any[]) => {
                        return activities.reduce((sum, act) => sum + (monthData[act.id]?.count || 0), 0);
                    };

                    sidiqCount += countForCategory(sidiqActivities);
                    tablighCount += countForCategory(tablighActivities);
                    amanahCount += countForCategory(amanahActivities);
                    fatonahCount += countForCategory(fatonahActivities);
                }
            }

            const sidiqTarget = monthlySidiqTarget * monthsCount;
            const tablighTarget = monthlyTablighTarget * monthsCount;
            const amanahTarget = monthlyAmanahTarget * monthsCount;
            const fatonahTarget = monthlyFatonahTarget * monthsCount;
            const totalTarget = sidiqTarget + tablighTarget + amanahTarget + fatonahTarget;
            const totalCount = sidiqCount + tablighCount + amanahCount + fatonahCount;

            return {
                employeeId: emp.id,
                employeeName: emp.name,
                unit: emp.unit,
                profession: emp.profession,
                professionCategory: emp.profession_category,
                hospitalId: emp.hospital_id,
                monthKey: year,
                sidiqCount, sidiqTarget, sidiqPercentage: sidiqTarget > 0 ? Math.min(100, Math.round((sidiqCount / sidiqTarget) * 100)) : 0,
                tablighCount, tablighTarget, tablighPercentage: tablighTarget > 0 ? Math.min(100, Math.round((tablighCount / tablighTarget) * 100)) : 0,
                amanahCount, amanahTarget, amanahPercentage: amanahTarget > 0 ? Math.min(100, Math.round((amanahCount / amanahTarget) * 100)) : 0,
                fatonahCount, fatonahTarget, fatonahPercentage: fatonahTarget > 0 ? Math.min(100, Math.round((fatonahCount / fatonahTarget) * 100)) : 0,
                totalCount, totalTarget, totalPercentage: totalTarget > 0 ? Math.min(100, Math.round((totalCount / totalTarget) * 100)) : 0
            };
        });

        return NextResponse.json({
            records,
            total: totalCount || 0,
            totalPages: Math.ceil((totalCount || 0) / limit),
            page
        });

    } catch (error) {
        console.error('❌ [Mutabaah Report API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
