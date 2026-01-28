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

export async function GET(request: NextRequest) {
    try {
        if (!serviceRoleClient) {
            return NextResponse.json(
                { error: 'Service role key not configured' },
                { status: 500 }
            );
        }

        // 🔥 ACCESS COOKIES DIRECTLY
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            console.error('❌ [/api/admin/reports/attendance] No session cookie found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie.value);

        if (!session) {
            console.error('❌ [/api/admin/reports/attendance] Token verification failed');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ [/api/admin/reports/attendance] Session verified for:', session.email);

        // Check if user has admin role
        const isAdmin = session.role === 'admin' || session.role === 'super-admin' || session.role === 'owner';

        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = serviceRoleClient
            .from('attendance_records')
            .select('*')
            .order('timestamp', { ascending: true });

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }
        if (endDate) {
            query = query.lte('timestamp', endDate + 'T23:59:59');
        }

        // Limit to prevent massive payload if no date range
        if (!startDate && !endDate) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.gte('timestamp', thirtyDaysAgo.toISOString()).limit(5000);
        } else {
            query = query.limit(10000);
        }

        const { data: attendanceRecords, error: attendanceError } = await query;

        if (attendanceError) {
            return NextResponse.json({ error: attendanceError.message }, { status: 500 });
        }

        // Also fetch team attendance records and activity attendance
        let teamQuery = serviceRoleClient.from('team_attendance_records').select('*');
        let activityQuery = serviceRoleClient.from('activity_attendance').select('*');

        if (startDate) {
            teamQuery = teamQuery.gte('session_date', startDate);
            activityQuery = activityQuery.gte('timestamp', startDate);
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
            teamQuery = teamQuery.gte('session_date', thirtyDaysAgoStr);
            activityQuery = activityQuery.gte('timestamp', thirtyDaysAgo.toISOString());
        }

        const [teamRes, activityRes] = await Promise.all([
            teamQuery.limit(5000),
            activityQuery.limit(5000)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                attendanceRecords: attendanceRecords || [],
                teamAttendanceRecords: teamRes.data || [],
                activityAttendanceRecords: activityRes.data || []
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
