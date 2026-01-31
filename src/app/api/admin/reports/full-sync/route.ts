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

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const defaultStart = thirtyDaysAgo.toISOString();

        // 1. Fetch Sholat Records
        let sholatQuery = serviceRoleClient
            .from('attendance_records')
            .select('*')
            .order('timestamp', { ascending: true });

        if (startDate) {
            sholatQuery = sholatQuery.gte('timestamp', startDate);
        } else {
            sholatQuery = sholatQuery.gte('timestamp', defaultStart);
        }

        // 2. Fetch Team Records
        let teamQuery = serviceRoleClient.from('team_attendance_records').select('*');
        if (startDate) {
            teamQuery = teamQuery.gte('session_date', startDate.split('T')[0]);
        } else {
            teamQuery = teamQuery.gte('session_date', defaultStart.split('T')[0]);
        }

        // 3. Fetch Manual Activity Records
        let activityQuery = serviceRoleClient.from('activity_attendance').select('*');
        if (startDate) {
            activityQuery = activityQuery.gte('timestamp', startDate);
        } else {
            activityQuery = activityQuery.gte('timestamp', defaultStart);
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
            .order('name')
            .limit(10000); // 🔥 Increase limit to ensure all employees are included in full sync report

        const [sholatRes, teamRes, activityRes, employeeRes] = await Promise.all([
            sholatQuery.limit(10000),
            teamQuery.limit(5000),
            activityQuery.limit(5000),
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
