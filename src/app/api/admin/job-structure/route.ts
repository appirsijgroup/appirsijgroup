import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth'

/**
 * GET /api/admin/job-structure
 * Fetch all job structure data using service role to bypass RLS
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('job_structure')
            .select('*');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('❌ [/api/admin/job-structure] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
