import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/jwt'

/**
 * POST /api/employees/bulk
 * Get multiple employees by their IDs
 */
export async function POST(request: NextRequest) {
    try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyToken(sessionCookie);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .in('id', ids);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ employees });
    } catch (error) {
        console.error('❌ [/api/employees/bulk] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
