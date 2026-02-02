import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

/**
 * API Route: /api/attendance/submit
 * Purpose: Handle attendance submission (upsert) safely using service role key
 * This bypasses RLS policies to ensure user attendance is always recorded
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
        const { employee_id, entity_id, status, reason, timestamp, is_late_entry, location } = body;

        // 3. Validation
        if (!employee_id || !entity_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Use Service Role Client for DB Operations (Bypass RLS)
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

        // 5. Perform Upsert
        const { data, error } = await supabase
            .from('attendance_records')
            .upsert({
                employee_id,
                entity_id,
                status,
                reason,
                timestamp,
                is_late_entry: is_late_entry || false,
                location: location || null
            }, { onConflict: 'employee_id,entity_id' }) // Ensure upsert is based on composite key or index
            .select()
            .single();

        if (error) {
            console.error('❌ [API Attendance Submit] Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        // 6. Return Data
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Attendance Submit] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Params
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const entityId = searchParams.get('entityId');

        if (!employeeId || !entityId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Check if user is deleting their own attendance or if they are admin
        if (session.userId !== employeeId && session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Use Service Role Client
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 4. Perform Delete
        const { error } = await supabase
            .from('attendance_records')
            .delete()
            .eq('employee_id', employeeId)
            .eq('entity_id', entityId);

        if (error) {
            console.error('❌ [API Attendance Delete] Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('❌ [API Attendance Delete] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
