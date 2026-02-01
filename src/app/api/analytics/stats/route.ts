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
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase();
        const month = searchParams.get('month'); // "01"
        const year = searchParams.get('year');   // "2026"

        // 4. Determine Current Month Key (YYYY-MM)
        const now = new Date();
        const currentMonthKey = (month && year)
            ? `${year}-${month.padStart(2, '0')}`
            : now.toISOString().slice(0, 7); // Default: "2026-01"

        // 5. Execute Queries in Parallel
        const [
            totalEmployeesRes,
            activatedRes,
            mentorsRes,
            complianceRes,
            hospitalsRes
        ] = await Promise.all([
            // Total Active Employees (Exclude Admin/Super-Admin)
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id, unit', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .not('role', 'in', '(admin,super-admin)');
                if (hospitalId && hospitalId !== 'all') q = q.ilike('hospital_id', hospitalId);
                return q;
            })(),

            // Activated This Month (Join with employees to ensure we only count real employees)
            (() => {
                let q = supabase
                    .from('mutabaah_activations')
                    .select('employee_id, employees!inner(id, role, is_active, hospital_id, unit)', { count: 'exact', head: false })
                    .eq('month_key', currentMonthKey)
                    .eq('employees.is_active', true)
                    .not('employees.role', 'in', '(admin,super-admin)');
                if (hospitalId && hospitalId !== 'all') q = q.ilike('employees.hospital_id', hospitalId);
                return q;
            })(),

            // Mentors
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .or('role.in.(admin,super-admin),can_be_mentor.eq.true');
                if (hospitalId && hospitalId !== 'all') q = q.ilike('hospital_id', hospitalId);
                return q;
            })(),

            // Compliance (Has entry in employee_monthly_reports for this month)
            (() => {
                let q = supabase.from('employee_monthly_reports')
                    .select('*, employees!inner(id, hospital_id, unit)', { count: 'exact', head: false })
                    .not(`reports->${currentMonthKey}`, 'is', null);
                if (hospitalId && hospitalId !== 'all') q = q.ilike('employees.hospital_id', hospitalId);
                return q;
            })(),

            // Hospitals list for name mapping
            supabase.from('hospitals').select('id, name, brand')
        ]);

        const breakdownDataMap: Record<string, any> = {};
        const isAllMode = !hospitalId || hospitalId === 'all';

        // 6. Aggregate by Hospital (Global) or Unit (Single Hospital)
        if (isAllMode) {
            const lowerCaseToId: Record<string, string> = {};
            (hospitalsRes.data || []).forEach(h => {
                const id = h.id;
                breakdownDataMap[id] = { id, brand: h.brand, name: h.name, total: 0, activated: 0, compliance: 0 };
                lowerCaseToId[id.toLowerCase()] = id;
            });

            (totalEmployeesRes.data || []).forEach(emp => {
                const rawHid = emp.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].total++;
            });

            (activatedRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const rawHid = emp?.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].activated++;
            });

            (complianceRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const rawHid = emp?.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].compliance++;
            });
        } else {
            // Aggregate by Unit when a specific hospital is selected
            (totalEmployeesRes.data || []).forEach(emp => {
                const unitName = emp.unit || 'Tanpa Unit';
                if (!breakdownDataMap[unitName]) {
                    breakdownDataMap[unitName] = { id: unitName, brand: unitName, name: unitName, total: 0, activated: 0, compliance: 0 };
                }
                breakdownDataMap[unitName].total++;
            });

            (activatedRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const unitName = emp?.unit || 'Tanpa Unit';
                if (!breakdownDataMap[unitName]) {
                    breakdownDataMap[unitName] = { id: unitName, brand: unitName, name: unitName, total: 0, activated: 0, compliance: 0 };
                }
                breakdownDataMap[unitName].activated++;
            });

            (complianceRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const unitName = emp?.unit || 'Tanpa Unit';
                if (!breakdownDataMap[unitName]) {
                    breakdownDataMap[unitName] = { id: unitName, brand: unitName, name: unitName, total: 0, activated: 0, compliance: 0 };
                }
                breakdownDataMap[unitName].compliance++;
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
            hospitalBreakdown: Object.values(breakdownDataMap)
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('❌ [API] Analytics Stats Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
