import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import type { Database } from '@/services/database.types';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // 2. Parse request body
        const updates = await request.json();
        const { id, ...allowedUpdates } = updates;

        // Security: Users can only update their own record unless they are admin
        const targetUserId = id || session.userId;

        // 3. Initialize Supabase with service role to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey);

        // Safety check: if standard user is trying to update someone else
        if (targetUserId !== session.userId) {
            const { data: currentUser, error: userError } = await (supabase
                .from('employees') as any)
                .select('role')
                .eq('id', session.userId)
                .single();

            if (userError || !currentUser || !['admin', 'super-admin'].includes(currentUser.role?.toLowerCase() || '')) {
                return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
            }
        }

        // 4. Update the record
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ success: true, message: 'No fields to update' });
        }

        const { data, error } = await (supabase
            .from('employees') as any)
            .update(allowedUpdates)
            .eq('id', targetUserId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error updating employee:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            console.error('Update failed: Target employee record not found or no rows updated', { targetUserId });
            return NextResponse.json({ error: 'Employee record not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Unexpected error in employee update API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
