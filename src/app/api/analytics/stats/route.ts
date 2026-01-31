import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Setup Supabase Service Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Query Params
        const { searchParams } = new URL(request.url);
        const hospitalId = searchParams.get('hospitalId');

        // 4. Determine Current Month Key (YYYY-MM)
        const now = new Date();
        const currentMonthKey = now.toISOString().slice(0, 7); // "2026-01"

        // 5. Execute Queries in Parallel
        const [
            totalEmployeesRes,
            activatedRes,
            mentorsRes,
            complianceRes,
            hospitalsRes
        ] = await Promise.all([
            // Total Active Employees (Numeric IDs only, Exclude Admin/Super-Admin)
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .filter('id', 'match', '^[0-9]+$')
                    .not('role', 'in', '(admin,super-admin)');
                if (hospitalId && hospitalId !== 'all') q = q.eq('hospital_id', hospitalId);
                return q;
            })(),

            // Activated This Month (Join with employees to ensure we only count real employees)
            (() => {
                let q = supabase
                    .from('mutabaah_activations')
                    .select('employee_id, employees!inner(id, role, is_active, hospital_id)', { count: 'exact', head: false })
                    .eq('month_key', currentMonthKey)
                    .eq('employees.is_active', true)
                    .filter('employees.id', 'match', '^[0-9]+$')
                    .not('employees.role', 'in', '(admin,super-admin)');
                if (hospitalId && hospitalId !== 'all') q = q.eq('employees.hospital_id', hospitalId);
                return q;
            })(),

            // Mentors (Numeric IDs only)
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .filter('id', 'match', '^[0-9]+$')
                    .or('role.in.(admin,super-admin),can_be_mentor.eq.true');
                if (hospitalId && hospitalId !== 'all') q = q.eq('hospital_id', hospitalId);
                return q;
            })(),

            // Compliance (Has entry in employee_monthly_reports for this month)
            (() => {
                let q = supabase.from('employee_monthly_reports')
                    .select('*, employees!inner(id, hospital_id)', { count: 'exact', head: false })
                    .not(`reports->${currentMonthKey}`, 'is', null);
                if (hospitalId && hospitalId !== 'all') q = q.eq('employees.hospital_id', hospitalId);
                return q;
            })(),

            // Hospitals list for name mapping
            supabase.from('hospitals').select('id, name, brand')
        ]);

        const hospitalDataMap: Record<string, any> = {};

        // 6. Aggregate by Hospital for Comparison View if in 'all' mode
        if (!hospitalId || hospitalId === 'all') {
            (hospitalsRes.data || []).forEach(h => {
                hospitalDataMap[h.id] = { id: h.id, brand: h.brand, name: h.name, total: 0, activated: 0, compliance: 0 };
            });

            // Count Totals
            (totalEmployeesRes.data || []).forEach(emp => {
                const hid = emp.hospital_id;
                if (hid && hospitalDataMap[hid]) hospitalDataMap[hid].total++;
            });

            // Count Activated
            (activatedRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const hid = emp?.hospital_id;
                if (hid && hospitalDataMap[hid]) hospitalDataMap[hid].activated++;
            });

            // Count Compliance
            (complianceRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const hid = emp?.hospital_id;
                if (hid && hospitalDataMap[hid]) hospitalDataMap[hid].compliance++;
            });
        }

        const stats = {
            totalEmployees: totalEmployeesRes.count || 0,
            activatedCount: activatedRes.count || 0,
            mentorCount: mentorsRes.count || 0,
            complianceCount: complianceRes.count || 0,
            notActivatedCount: (totalEmployeesRes.count || 0) - (activatedRes.count || 0),
            activationRate: totalEmployeesRes.count ? Math.round(((activatedRes.count || 0) / totalEmployeesRes.count) * 100) : 0,
            complianceRate: totalEmployeesRes.count ? Math.round(((complianceRes.count || 0) / totalEmployeesRes.count) * 100) : 0,
            hospitalBreakdown: Object.values(hospitalDataMap).filter(h => h.total > 0)
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('❌ [API] Analytics Stats Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
