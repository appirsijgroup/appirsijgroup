import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/team-attendance/sessions
 * Purpose: Handle team attendance sessions creation with service role to bypass RLS issues
 */

export async function POST(request: NextRequest) {
    try {
        // Verify custom JWT authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins or super-admins can create sessions
        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const sessionData = await request.json();

        // Use service role to bypass RLS
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

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            console.error('❌ [API Team Attendance] Supabase error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Team Attendance] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { id, ...updates } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Permission check
        if (session.role !== 'super-admin') {
            const { data: existing, error: checkError } = await supabase
                .from('team_attendance_sessions')
                .select('creator_id')
                .eq('id', id)
                .single();

            if (checkError || !existing) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            if (existing.creator_id !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to update this session' }, { status: 403 });
            }
        }

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ [API Team Attendance PATCH] Supabase error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'admin' && session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Higher privilege required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Permission check
        if (session.role !== 'super-admin') {
            const { data: existing, error: checkError } = await supabase
                .from('team_attendance_sessions')
                .select('creator_id')
                .eq('id', id)
                .single();

            if (checkError || !existing) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            if (existing.creator_id !== (session.nip || session.userId)) {
                return NextResponse.json({ error: 'You do not have permission to delete this session' }, { status: 403 });
            }
        }

        const { error } = await supabase
            .from('team_attendance_sessions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [API Team Attendance DELETE] Supabase error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
