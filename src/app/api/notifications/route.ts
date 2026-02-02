import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

/**
 * API Route: /api/notifications
 * Purpose: Handle notification operations (DELETE and potentially UPDATE) safely using service role key.
 * This bypasses RLS policies to ensure notifications can be managed reliably.
 */

export async function DELETE(request: NextRequest) {
    try {
        // 1. Verify Authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const idsParam = searchParams.get('ids'); // comma separated list

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

        // 4. Determine operation (Clear All vs Specific IDs)
        if (userId && !idsParam) {
            // Check if user is clearing their own notifications or if they are admin
            if (session.userId !== userId && session.role !== 'admin' && session.role !== 'super-admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Perform Clear All for user
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('❌ [API Notifications Clear] Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'All notifications cleared' });
        }

        if (idsParam) {
            const notificationIds = idsParam.split(',');

            // For security, we should ideally verify each notification belongs to the session user
            // However, since we are using service role, we'll do a check that matches user_id if not admin
            let query = supabase
                .from('notifications')
                .delete()
                .in('id', notificationIds);

            if (session.role !== 'admin' && session.role !== 'super-admin') {
                query = query.eq('user_id', session.userId);
            }

            const { error } = await query;

            if (error) {
                console.error('❌ [API Notifications Delete] Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Notifications deleted' });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    } catch (error: any) {
        console.error('❌ [API Notifications Delete] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// Map POST to handle bulk actions or updates if needed
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { action, userId, notificationId } = body;

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        if (action === 'mark_read') {
            if (!notificationId) return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });

            // Security check
            let query = supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
            if (session.role !== 'admin' && session.role !== 'super-admin') {
                query = query.eq('user_id', session.userId);
            }

            const { error } = await query;
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (action === 'mark_all_read') {
            if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
            if (session.userId !== userId && session.role !== 'admin' && session.role !== 'super-admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
