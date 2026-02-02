import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/tadarus/sessions
 * Purpose: Handle tadarus sessions creation with service role to bypass RLS issues 401/42501
 */

export async function POST(request: NextRequest) {
    try {
        // Verify custom JWT authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins or super-admins can create sessions for others
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
            .from('tadarus_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            console.error('❌ [API Tadarus] Supabase error:', error);
            return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('❌ [API Tadarus] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
