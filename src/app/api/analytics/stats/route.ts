import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Setup Supabase Service Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Query Params
        const { searchParams } = new URL(request.url);
        const hospitalId = searchParams.get('hospitalId')?.toLowerCase();
        const month = searchParams.get('month'); // "01"
        const year = searchParams.get('year');   // "2026"

        // 4. User Role & Access Check (Server-side Enforcement)
        const { data: user } = await supabase
            .from('employees')
            .select('role, hospital_id, functional_roles, managed_hospital_ids')
            .eq('id', session.userId)
            .single();

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Normalize roles and functional roles
        const isBPH = (user.functional_roles || []).includes('BPH');
        const isSuper = user.role === 'super-admin';
        const canSeeGlobal = isBPH || isSuper;

        let enforcedHospitalId = hospitalId;

        // Security Enforcement: If not SuperAdmin/BPH, restrict to authorized hospitals only
        if (!canSeeGlobal) {
            const allowedHospitals = [user.hospital_id, ...(user.managed_hospital_ids || [])].filter(Boolean).map(id => id.toLowerCase());

            if (!enforcedHospitalId || enforcedHospitalId === 'all') {
                // Default to their primary hospital if they try to access 'all'
                enforcedHospitalId = user.hospital_id?.toLowerCase() || 'unknown';
            } else if (!allowedHospitals.includes(enforcedHospitalId)) {
                // Attempting to access a hospital they don't manage
                return NextResponse.json({ error: 'Access Denied: You do not have permission to view this data' }, { status: 403 });
            }
        }

        // 5. Determine Current Month Key (YYYY-MM)
        const now = new Date();
        const currentMonthKey = (month && year)
            ? `${year}-${month.padStart(2, '0')}`
            : now.toISOString().slice(0, 7); // Default: "2026-01"

        // 5. Execute Queries in Parallel
        const [
            totalEmployeesRes,
            activatedRes,
            mentorsRes,
            complianceRes,
            quranRes,
            hospitalsRes
        ] = await Promise.all([
            // Total Active Employees (Exclude Admin/Super-Admin)
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id, unit', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .not('role', 'in', '(admin,super-admin)');
                if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                    q = q.ilike('hospital_id', `${enforcedHospitalId}%`);
                }
                return q;
            })(),

            // Activated This Month
            (() => {
                let q = supabase
                    .from('mutabaah_activations')
                    .select('employee_id, employees!inner(id, role, is_active, hospital_id, unit)', { count: 'exact', head: false })
                    .eq('month_key', currentMonthKey)
                    .eq('employees.is_active', true)
                    .not('employees.role', 'in', '(admin,super-admin)');
                if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                    q = q.ilike('employees.hospital_id', `${enforcedHospitalId}%`);
                }
                return q;
            })(),

            // Mentors
            (() => {
                let q = supabase.from('employees')
                    .select('id, hospital_id', { count: 'exact', head: false })
                    .eq('is_active', true)
                    .eq('can_be_mentor', true)
                    .not('role', 'in', '(admin,super-admin)');
                if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                    q = q.ilike('hospital_id', `${enforcedHospitalId}%`);
                }
                return q;
            })(),

            // Compliance
            (() => {
                let q = supabase.from('employee_monthly_reports')
                    .select('*, employees!inner(id, hospital_id, unit)', { count: 'exact', head: false })
                    .not(`reports->${currentMonthKey}`, 'is', null);
                if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                    q = q.ilike('employees.hospital_id', `${enforcedHospitalId}%`);
                }
                return q;
            })(),

            // Quran Competency Data
            (() => {
                let q = supabase.from('employee_quran_competency')
                    .select('*, employees!inner(id, hospital_id, unit)', { count: 'exact', head: false });
                if (enforcedHospitalId && enforcedHospitalId !== 'all') {
                    q = q.ilike('employees.hospital_id', `${enforcedHospitalId}%`);
                }
                return q;
            })(),

            // Hospitals list for name mapping
            supabase.from('hospitals').select('id, name, brand')
        ]);

        const breakdownDataMap: Record<string, any> = {};
        const isAllMode = !enforcedHospitalId || enforcedHospitalId === 'all';

        // 6. Aggregate by Hospital (Global) or Unit (Single Hospital)
        if (isAllMode) {
            const lowerCaseToId: Record<string, string> = {};
            (hospitalsRes.data || []).forEach(h => {
                const id = h.id;
                breakdownDataMap[id] = {
                    id, brand: h.brand, name: h.name,
                    total: 0, activated: 0, compliance: 0,
                    quranAssessed: 0, quranCompetent: 0 // Competent: Reading >= R2
                };
                lowerCaseToId[id.toLowerCase()] = id;
            });

            (totalEmployeesRes.data || []).forEach(emp => {
                const rawHid = emp.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].total++;
            });

            (activatedRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const rawHid = emp?.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].activated++;
            });

            (complianceRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const rawHid = emp?.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) breakdownDataMap[hid].compliance++;
            });

            // Aggregate Quran Stats
            (quranRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const rawHid = emp?.hospital_id;
                if (!rawHid) return;
                const hid = lowerCaseToId[rawHid.toLowerCase()] || rawHid;
                if (breakdownDataMap[hid]) {
                    breakdownDataMap[hid].quranAssessed++;
                    // Check competency (R2 or higher)
                    const level = row.reading_level || 'R0';
                    if (['R2', 'R3'].includes(level)) {
                        breakdownDataMap[hid].quranCompetent++;
                    }
                }
            });

        } else {
            // Aggregate by Unit when a specific hospital is selected
            const ensureUnit = (unitName: string) => {
                if (!breakdownDataMap[unitName]) {
                    breakdownDataMap[unitName] = {
                        id: unitName, brand: unitName, name: unitName,
                        total: 0, activated: 0, compliance: 0,
                        quranAssessed: 0, quranCompetent: 0
                    };
                }
            };

            (totalEmployeesRes.data || []).forEach(emp => {
                const unitName = emp.unit || 'Tanpa Unit';
                ensureUnit(unitName);
                breakdownDataMap[unitName].total++;
            });

            (activatedRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const unitName = emp?.unit || 'Tanpa Unit';
                ensureUnit(unitName);
                breakdownDataMap[unitName].activated++;
            });

            (complianceRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const unitName = emp?.unit || 'Tanpa Unit';
                ensureUnit(unitName);
                breakdownDataMap[unitName].compliance++;
            });

            // Aggregate Quran Stats by Unit
            (quranRes.data || []).forEach((row: any) => {
                const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
                const unitName = emp?.unit || 'Tanpa Unit';
                ensureUnit(unitName);
                breakdownDataMap[unitName].quranAssessed++;
                const level = row.reading_level || 'R0';
                if (['R2', 'R3'].includes(level)) {
                    breakdownDataMap[unitName].quranCompetent++;
                }
            });
        }

        // Calculate Global Quran Metrics
        const quranData = quranRes.data || [];
        const quranTotalAssessed = quranData.length;

        // Advanced: Reading R3 OR Memorization >= H1 (Role Model / Hafiz potential)
        const quranAdvancedCount = quranData.filter((r: any) =>
            r.reading_level === 'R3' || ['H1', 'H2', 'H3', 'H4', 'H5'].includes(r.memorization_level)
        ).length;

        // Competent: Reading R2 (Good but not advanced yet) AND NOT counted in Advanced
        const quranCompetentCount = quranData.filter((r: any) => {
            const isAdvanced = r.reading_level === 'R3' || ['H1', 'H2', 'H3', 'H4', 'H5'].includes(r.memorization_level);
            return r.reading_level === 'R2' && !isAdvanced;
        }).length;

        // Basic: Reading R0 or R1
        const quranBasicCount = quranTotalAssessed - (quranAdvancedCount + quranCompetentCount);

        // Calculate Average Score (R0=0, R1=33, R2=66, R3=100 for simplicity index)
        const scoreMap: Record<string, number> = { 'R0': 0, 'R1': 33, 'R2': 66, 'R3': 100 };
        const totalScore = quranData.reduce((sum: number, r: any) => sum + (scoreMap[r.reading_level] || 0), 0);
        const quranIndex = quranTotalAssessed > 0 ? Math.round(totalScore / quranTotalAssessed) : 0;

        const stats = {
            totalEmployees: totalEmployeesRes.count || 0,
            activatedCount: activatedRes.count || 0,
            mentorCount: mentorsRes.count || 0,
            complianceCount: complianceRes.count || 0,
            notActivatedCount: (totalEmployeesRes.count || 0) - (activatedRes.count || 0),
            activationRate: totalEmployeesRes.count ? Math.round(((activatedRes.count || 0) / totalEmployeesRes.count) * 100) : 0,
            complianceRate: totalEmployeesRes.count ? Math.round(((complianceRes.count || 0) / totalEmployeesRes.count) * 100) : 0,

            // New Quran Metrics
            quranStats: {
                totalAssessed: quranTotalAssessed,
                competentCount: quranCompetentCount, // R2 (Standard)
                advancedCount: quranAdvancedCount, // R3 or Hafiz (Role Model)
                basicCount: quranBasicCount, // R0-R1 (Need training)
                indexScore: quranIndex, // 0-100 scale

                // Percentages
                competentRate: quranTotalAssessed > 0 ? Math.round((quranCompetentCount / quranTotalAssessed) * 100) : 0,
                advancedRate: quranTotalAssessed > 0 ? Math.round((quranAdvancedCount / quranTotalAssessed) * 100) : 0,
                basicRate: quranTotalAssessed > 0 ? Math.round((quranBasicCount / quranTotalAssessed) * 100) : 0
            },

            hospitalBreakdown: Object.values(breakdownDataMap)
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('❌ [API] Analytics Stats Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
