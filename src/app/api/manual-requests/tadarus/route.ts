import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

/**
 * API Route: /api/manual-requests/tadarus
 * Purpose: Handle tadarus requests (GET, POST, PATCH) using service role
 */

export async function GET(request: NextRequest) {
    try {
        let session;
        try {
            session = await getSession();
        } catch (e: any) {
            console.error('❌ [API Tadarus GET] getSession failed:', e);
            return NextResponse.json({ error: 'Auth Check Failed', details: e.message }, { status: 401 });
        }

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const menteeId = searchParams.get('menteeId');
        const menteeIds = searchParams.get('menteeIds')?.split(',');
        const mentorId = searchParams.get('mentorId');

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            console.error('❌ [API Tadarus GET] Missing Env Vars');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        let query = supabase.from('tadarus_requests').select('*').order('requested_at', { ascending: false });

        if (menteeIds && menteeIds.length > 0) {
            query = query.in('mentee_id', menteeIds);
        } else if (menteeId) {
            query = query.eq('mentee_id', menteeId);
        } else if (mentorId) {
            query = query.eq('mentor_id', mentorId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ [API Tadarus Requests GET] DB Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests GET] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data, error } = await supabase
            .from('tadarus_requests')
            .insert(body)
            .select()
            .single();

        if (error) {
            console.error('❌ [API Tadarus Requests POST] Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests POST] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, ...updates } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Update request status
        const { data, error } = await supabase
            .from('tadarus_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ [API Tadarus Requests PATCH] Error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        // SIDE EFFECT: If Approved, update employee_monthly_reports
        if (data && data.status === 'approved') {
            try {
                // 1. Get current reports
                const { data: reportData } = await supabase
                    .from('employee_monthly_reports')
                    .select('reports')
                    .eq('employee_id', data.mentee_id)
                    .single();

                let reports = reportData?.reports || {};
                const date = data.date;
                const category = data.category || 'UMUM';

                // Map category to official DAILY_ACTIVITIES IDs
                const categoryMap: Record<string, string> = {
                    'BBQ': 'tadarus',
                    'UMUM': 'tadarus',
                    'KIE': 'tepat_waktu_kie',
                    'DOA BERSAMA': 'doa_bersama',
                    'Doa Bersama': 'doa_bersama',
                    'KAJIAN SELASA': 'kajian_selasa',
                    'Kajian Selasa': 'kajian_selasa',
                    'PENGAJIAN PERSYARIKATAN': 'persyarikatan',
                    'Pengajian Persyarikatan': 'persyarikatan',
                    'Membaca Al-Quran dan buku': 'baca_alquran_buku'
                };
                const activityId = categoryMap[category] || 'tadarus';

                const dateObj = new Date(date + 'T12:00:00Z');
                const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!reports[monthKey]) reports[monthKey] = {};

                const activity = reports[monthKey][activityId] || { count: 0, entries: [] };
                if (!activity.entries) activity.entries = [];

                // Prevent duplicate
                if (!activity.entries.some((e: any) => e.date === date)) {
                    activity.entries.push({
                        date,
                        completedAt: new Date().toISOString(),
                        note: `Approved via Tadarus Request: ${id}`
                    });
                    activity.count = activity.entries.length;
                    activity.completedAt = new Date().toISOString();

                    reports[monthKey][activityId] = activity;

                    // Upsert
                    await supabase.from('employee_monthly_reports').upsert({
                        employee_id: data.mentee_id,
                        reports,
                        updated_at: new Date().toISOString()
                    });
                    console.log(`✅ [API Tadarus] Updated monthly report for ${data.mentee_id}`);

                    // 🔥 NEW: Insert into team_attendance_records so it shows up in official logs
                    try {
                        // 1. Ensure a "Manual Session" exists to link to (FK requirement)
                        const manualSessionId = '00000000-0000-0000-0000-000000000000';
                        const { data: sessionExists } = await supabase
                            .from('team_attendance_sessions')
                            .select('id')
                            .eq('id', manualSessionId)
                            .single();

                        if (!sessionExists) {
                            await supabase.from('team_attendance_sessions').insert({
                                id: manualSessionId,
                                creator_id: 'SYSTEM',
                                creator_name: 'System Approval',
                                type: 'UMUM',
                                date: '2000-01-01',
                                start_time: '00:00',
                                end_time: '23:59',
                                audience_type: 'public'
                            });
                        }

                        // 2. Insert the record
                        await supabase.from('team_attendance_records').insert({
                            session_id: manualSessionId,
                            user_id: data.mentee_id,
                            user_name: data.mentee_name || 'User',
                            attended_at: new Date().toISOString(),
                            session_type: (category.toUpperCase() === 'BBQ') ? 'BBQ' :
                                (category.toUpperCase() === 'KIE') ? 'KIE' :
                                    (category.toUpperCase() === 'DOA BERSAMA') ? 'Doa Bersama' :
                                        (category.toUpperCase() === 'KAJIAN SELASA') ? 'Kajian Selasa' :
                                            (category.toUpperCase() === 'PENGAJIAN PERSYARIKATAN') ? 'Pengajian Persyarikatan' : 'UMUM',
                            session_date: date,
                            session_start_time: '00:00',
                            session_end_time: '23:59'
                        });
                        console.log(`✅ [API Tadarus] Inserted record into team_attendance_records`);
                    } catch (teamError) {
                        console.error('⚠️ [API Tadarus] Failed to insert team attendance record:', teamError);
                    }
                }
            } catch (err) {
                console.error('⚠️ [API Tadarus] Failed to update monthly report:', err);
                // Non-blocking error
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ [API Tadarus Requests PATCH] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
