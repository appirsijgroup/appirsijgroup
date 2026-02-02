import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

/**
 * API Route: /api/attendance/batch
 * Purpose: Handle batch attendance submission safely using service role key
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { employeeId, records } = body;

        if (!employeeId || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // 3. Use Service Role Client for DB Operations (Bypass RLS)
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 4. Perform Upsert
        const { data, error } = await supabase
            .from('attendance_records')
            .upsert(records, { onConflict: 'employee_id,entity_id' })
            .select();

        if (error) {
            console.error('❌ [API Attendance Batch] Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        // 5. Return Data
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Attendance Batch] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
