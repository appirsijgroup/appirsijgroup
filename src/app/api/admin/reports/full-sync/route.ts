import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/services/database.types';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

// Service role client - bypasses RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const serviceRoleClient = supabaseServiceKey
    ? createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

/**
 * Combined Admin API to fetch all necessary data for the dashboard in one go.
 * Using service role to bypass RLS and get full hospital visibility.
 */
export async function GET(request: NextRequest) {
    try {
        if (!serviceRoleClient) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie.value);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = session.role === 'admin' || session.role === 'super-admin' || session.role === 'owner';
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isSuperAdmin = session.role === 'super-admin' || session.role === 'owner';
        const managedHospitalIds = session.managedHospitalIds || [];

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        // 🔥 Determine Bounded Range
        let finalStart = startDate;
        let finalEnd: string | null = null;

        if (monthParam && yearParam) {
            const m = parseInt(monthParam);
            const y = parseInt(yearParam);
            finalStart = `${y}-${String(m).padStart(2, '0')}-01T00:00:00`;

            const lastDay = new Date(y, m, 0).getDate();
            finalEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
        } else if (startDate) {
            // If only startDate, we can infer end of month if it looks like a month start
            if (startDate.endsWith('-01') || startDate.endsWith('-01T00:00:00')) {
                const d = new Date(startDate);
                const m = d.getMonth() + 1;
                const y = d.getFullYear();
                const lastDay = new Date(y, m, 0).getDate();
                finalEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
            }
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const defaultStart = thirtyDaysAgo.toISOString();

        // 1. Fetch Sholat Records
        let sholatQuery = serviceRoleClient
            .from('attendance_records')
            .select('*')
            .order('timestamp', { ascending: true });

        // Filter by managed hospitals for regular admins
        if (!isSuperAdmin) {
            if (managedHospitalIds.length > 0) {
                sholatQuery = sholatQuery.in('hospital_id', managedHospitalIds);
            } else {
                return NextResponse.json({ success: true, data: { attendanceRecords: [], teamAttendanceRecords: [], activityAttendanceRecords: [], employees: [] } });
            }
        }

        if (finalStart) {
            sholatQuery = sholatQuery.gte('timestamp', finalStart);
        } else {
            sholatQuery = sholatQuery.gte('timestamp', defaultStart);
        }
        if (finalEnd) {
            sholatQuery = sholatQuery.lte('timestamp', finalEnd);
        }

        // 2. Fetch Team Records
        let teamQuery = serviceRoleClient.from('team_attendance_records').select('*').order('session_date', { ascending: true });
        if (!isSuperAdmin && managedHospitalIds.length > 0) {
            teamQuery = teamQuery.in('hospital_id', managedHospitalIds);
        }
        if (finalStart) {
            teamQuery = teamQuery.gte('session_date', finalStart.split('T')[0]);
        } else {
            teamQuery = teamQuery.gte('session_date', defaultStart.split('T')[0]);
        }
        if (finalEnd) {
            teamQuery = teamQuery.lte('session_date', finalEnd.split('T')[0]);
        }

        // 3. Fetch Manual Activity Records
        let activityQuery = serviceRoleClient.from('activity_attendance').select('*').order('timestamp', { ascending: true });
        if (!isSuperAdmin && managedHospitalIds.length > 0) {
            activityQuery = activityQuery.in('hospital_id', managedHospitalIds);
        }
        if (finalStart) {
            activityQuery = activityQuery.gte('timestamp', finalStart);
        } else {
            activityQuery = activityQuery.gte('timestamp', defaultStart);
        }
        if (finalEnd) {
            activityQuery = activityQuery.lte('timestamp', finalEnd);
        }

        // 4. Fetch Employees (Optional but recommended if we want full sync)
        const employeesQuery = serviceRoleClient
            .from('employees')
            .select(`
                *,
                mutabaah_activations (
                    month_key
                )
            `)
            .order('name');

        if (!isSuperAdmin && managedHospitalIds.length > 0) {
            employeesQuery.in('hospital_id', managedHospitalIds);
        }

        // 🚀 INCREASE LIMITS: Support large organizations
        // Sholat records are the most numerous (6/day/employee)
        // Others are typically 1-2/day/employee at most
        const [sholatRes, teamRes, activityRes, employeeRes] = await Promise.all([
            sholatQuery.limit(60000),
            teamQuery.limit(20000),
            activityQuery.limit(20000),
            employeesQuery
        ]);

        return NextResponse.json({
            success: true,
            data: {
                attendanceRecords: sholatRes.data || [],
                teamAttendanceRecords: teamRes.data || [],
                activityAttendanceRecords: activityRes.data || [],
                employees: employeeRes.data || []
            }
        });

    } catch (error: any) {
        console.error('❌ [/api/admin/reports/full-sync] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
