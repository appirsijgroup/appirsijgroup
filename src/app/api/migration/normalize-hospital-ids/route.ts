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
                const { error: insertError } = await supabase.from('hospitals').upsert({ ...h, id: lowerId });
                if (insertError) logs.push(`Error upserting ${lowerId}: ${insertError.message}`);
            }
        }

        // --- STEP 2: Normalizing employee hospital references... ---
        logs.push("Step 2: Normalizing employee hospital references...");
        const { data: employees, error: eError } = await supabase.from('employees').select('id, hospital_id, managed_hospital_ids');
        if (eError) throw eError;

        let empUpdateCount = 0;
        for (const emp of employees) {
            const updates: any = {};
            if (emp.hospital_id && emp.hospital_id !== emp.hospital_id.toLowerCase()) {
                updates.hospital_id = emp.hospital_id.toLowerCase();
            }
            if (emp.managed_hospital_ids && Array.isArray(emp.managed_hospital_ids)) {
                const lowerManaged = emp.managed_hospital_ids.map((id: string) => id.toLowerCase());
                if (JSON.stringify(lowerManaged) !== JSON.stringify(emp.managed_hospital_ids)) {
                    updates.managed_hospital_ids = lowerManaged;
                }
            }

            if (Object.keys(updates).length > 0) {
                const { error: upError } = await supabase.from('employees').update(updates).eq('id', emp.id);
                if (!upError) empUpdateCount++;
            }
        }
        logs.push(`Updated ${empUpdateCount} employees.`);

        // --- STEP 3: Normalize Announcements ---
        logs.push("Step 3: Normalizing announcement targets...");
        const { data: announcements, error: annError } = await supabase.from('announcements').select('id, target_hospital_ids');
        if (!annError && announcements) {
            let annUpdateCount = 0;
            for (const ann of announcements) {
                if (ann.target_hospital_ids && Array.isArray(ann.target_hospital_ids)) {
                    const lowerTargets = ann.target_hospital_ids.map((id: string) => id.toLowerCase());
                    if (JSON.stringify(lowerTargets) !== JSON.stringify(ann.target_hospital_ids)) {
                        const { error: upError } = await supabase.from('announcements').update({ target_hospital_ids: lowerTargets }).eq('id', ann.id);
                        if (!upError) annUpdateCount++;
                    }
                }
            }
            logs.push(`Updated ${annUpdateCount} announcements.`);
        }

        // --- STEP 4: Cleanup Old Hospital IDs ---
        logs.push("Step 4: Cleaning up old uppercase hospital IDs...");
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
