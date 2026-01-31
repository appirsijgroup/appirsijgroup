import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check (Only super-admin or similar should run this)
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session || session.role !== 'super-admin') {
            return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
        }

        // 2. Setup Supabase Service Client (Bypass RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const logs: string[] = [];

        // --- STEP 1: Normalize Hospitals ---
        logs.push("Step 1: Fetching current hospitals...");
        const { data: hospitals, error: hError } = await supabase.from('hospitals').select('*');
        if (hError) throw hError;

        for (const h of hospitals) {
            const lowerId = h.id.toLowerCase();
            if (h.id !== lowerId) {
                logs.push(`Normalizing hospital: ${h.id} -> ${lowerId}`);

                // We can't just update the ID if it's a primary key without cascading.
                // Safest way: Create new, move references, delete old.
                const { error: insertError } = await supabase.from('hospitals').upsert({
                    ...h,
                    id: lowerId
                });
                if (insertError) {
                    logs.push(`Error upserting ${lowerId}: ${insertError.message}`);
                    continue;
                }
            }
        }

        // --- STEP 2: Normalize Employees hospital_id ---
        logs.push("Step 2: Fetching employees to normalize hospital_id...");
        const { data: employees, error: eError } = await supabase.from('employees').select('id, hospital_id');
        if (eError) throw eError;

        let empUpdateCount = 0;
        for (const emp of employees) {
            if (emp.hospital_id && emp.hospital_id !== emp.hospital_id.toLowerCase()) {
                const { error: upError } = await supabase.from('employees')
                    .update({ hospital_id: emp.hospital_id.toLowerCase() })
                    .eq('id', emp.id);

                if (!upError) empUpdateCount++;
            }
        }
        logs.push(`Updated ${empUpdateCount} employees.`);

        // --- STEP 3: Cleanup Old Hospital IDs ---
        logs.push("Step 3: Cleaning up old uppercase hospital IDs...");
        for (const h of hospitals) {
            if (h.id !== h.id.toLowerCase()) {
                const { error: delError } = await supabase.from('hospitals').delete().eq('id', h.id);
                if (delError) {
                    logs.push(`Could not delete old ID ${h.id} (likely still referenced): ${delError.message}`);
                } else {
                    logs.push(`Deleted old hospital record: ${h.id}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            logs
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
