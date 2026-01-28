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

        // 3. Determine Current Month Key (YYYY-MM)
        const now = new Date();
        const currentMonthKey = now.toISOString().slice(0, 7); // "2026-01"

        // 4. Execute Queries in Parallel
        const [
            totalEmployeesRes,
            activatedRes,
            mentorsRes,
            complianceRes
        ] = await Promise.all([
            // Total Active Employees
            supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),

            // Activated This Month (Join with mutabaah_activations table)
            supabase
                .from('mutabaah_activations')
                .select('employee_id', { count: 'exact', head: true })
                .eq('month_key', currentMonthKey),

            // Mentors
            supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true).or('role.in.(admin,super-admin),can_be_mentor.eq.true'),

            // Compliance (Has entry in employee_monthly_reports for this month)
            // Note: This assumes 'reports' column is JSONB and has month keys
            // Since filtering JSONB keys via RPC/Postgrest is tricky, we might need a workaround or count non-null
            // For now, we'll try checking if the record exists for the employee. 
            // Actually, employee_monthly_reports usually has one row per employee with 'reports' jsonb.
            // We want to count rows where reports->'2026-01' is not null.
            // Supabase filter for jsonb keys existence: .not('reports->' + currentMonthKey, 'is', null)
            supabase.from('employee_monthly_reports').select('*', { count: 'exact', head: true }).not(`reports->${currentMonthKey}`, 'is', null)
        ]);

        const stats = {
            totalEmployees: totalEmployeesRes.count || 0,
            activatedCount: activatedRes.count || 0,
            mentorCount: mentorsRes.count || 0,
            complianceCount: complianceRes.count || 0,
            // Fallback calculation in case activated logic differs
            notActivatedCount: (totalEmployeesRes.count || 0) - (activatedRes.count || 0),
            // Rates
            activationRate: totalEmployeesRes.count ? Math.round(((activatedRes.count || 0) / totalEmployeesRes.count) * 100) : 0,
            complianceRate: totalEmployeesRes.count ? Math.round(((complianceRes.count || 0) / totalEmployeesRes.count) * 100) : 0
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('❌ [API] Analytics Stats Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
