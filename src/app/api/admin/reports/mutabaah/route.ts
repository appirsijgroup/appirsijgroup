import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { DAILY_ACTIVITIES } from '@/data/monthlyActivities';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Auth Check
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const session = await verifyToken(sessionCookie);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 2. Query Params
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const hospitalId = searchParams.get('hospitalId');
        const unit = searchParams.get('unit');
        const profession = searchParams.get('profession');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 });

        // 3. Setup Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Build Employee Query
        let empQuery = supabase.from('employees')
            .select('id, name, unit, profession, hospital_id, mentor_id, profession_category', { count: 'exact' })
            .eq('is_active', true)
            .filter('id', 'match', '^[0-9]+$');

        if (hospitalId && hospitalId !== 'all') {
            // Find hospital brand/id to match
            const { data: hosp } = await supabase.from('hospitals')
                .select('id, brand')
                .ilike('id', hospitalId)
                .single();
            if (hosp) {
                empQuery = empQuery.or(`hospital_id.ilike.${hosp.id},hospital_id.ilike.${hosp.brand}`);
            }
        }

        if (unit && unit !== 'all') empQuery = empQuery.eq('unit', unit);
        if (profession && profession !== 'all') empQuery = empQuery.eq('profession', profession);
        if (search) empQuery = empQuery.or(`name.ilike.%${search}%,id.ilike.%${search}%`);

        // First, let's get the list of employees for the current page
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: employees, count: totalCount, error: empError } = await empQuery
            .order('name', { ascending: true })
            .range(from, to);

        if (empError) throw empError;
        if (!employees || employees.length === 0) {
            return NextResponse.json({ records: [], total: 0, totalPages: 0 });
        }

        const employeeIds = employees.map(e => e.id);

        // 5. Fetch all relevant data in bulk for these employees for the requested year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31T23:59:59`;

        // Fetch Mentor Names
        const mentorIds = [...new Set(employees.map(e => e.mentor_id).filter(Boolean))];
        let mentorMap: Record<string, string> = {};
        if (mentorIds.length > 0) {
            const { data: mentors } = await supabase
                .from('employees')
                .select('id, name')
                .in('id', mentorIds);
            mentors?.forEach(m => { mentorMap[m.id] = m.name; });
        }

        const [
            monthlyReportsRes,
            attendanceRecordsRes,
            teamAttendanceRes,
            activityAttendanceRes,
            submissionsRes
        ] = await Promise.all([
            // employee_monthly_reports
            supabase.from('employee_monthly_reports').select('employee_id, reports').in('employee_id', employeeIds),
            // attendance_records (shalat)
            supabase.from('attendance_records').select('employee_id, timestamp, status').in('employee_id', employeeIds).eq('status', 'hadir').gte('timestamp', startDate).lte('timestamp', endDate),
            // team_attendance_records (Doa Bersama, KIE)
            supabase.from('team_attendance_records').select('user_id, session_date, session_type').in('user_id', employeeIds).gte('session_date', startDate).lte('session_date', year + '-12-31'),
            // activity_attendance (Kajian Selasa, etc)
            supabase.from('activity_attendance').select('employee_id, activities!inner(date, activity_type)').in('employee_id', employeeIds).eq('status', 'hadir').gte('activities.date', startDate).lte('activities.date', year + '-12-31'),
            // monthly_report_submissions (Approval Status) - CRITICAL for Mutabaah Report validity
            supabase.from('monthly_report_submissions').select('mentee_id, month_key, status').in('mentee_id', employeeIds).eq('status', 'approved')
        ]);

        // 6. Process and Merge Stats
        const sidiqActivities = DAILY_ACTIVITIES.filter(a => a.category === 'SIDIQ (Integritas)');
        const tablighActivities = DAILY_ACTIVITIES.filter(a => a.category === 'TABLIGH (Teamwork)');
        const amanahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'AMANAH (Disiplin)');
        const fatonahActivities = DAILY_ACTIVITIES.filter(a => a.category === 'FATONAH (Belajar)');

        const monthlySidiqTarget = sidiqActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyTablighTarget = tablighActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyAmanahTarget = amanahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);
        const monthlyFatonahTarget = fatonahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0);

        // Pre-process merged data into a map: employeeId -> monthKey -> dayKey -> { activityId: true }
        const performanceMap: Record<string, Record<string, Record<string, Record<string, boolean>>>> = {};

        const addPerformance = (empId: string, monthKey: string, dayKey: string, activityId: string) => {
            if (!performanceMap[empId]) performanceMap[empId] = {};
            if (!performanceMap[empId][monthKey]) performanceMap[empId][monthKey] = {};
            if (!performanceMap[empId][monthKey][dayKey]) performanceMap[empId][monthKey][dayKey] = {};
            performanceMap[empId][monthKey][dayKey][activityId] = true;
        };

        // Process Attendance (Shalat)
        attendanceRecordsRes.data?.forEach(r => {
            const date = new Date(r.timestamp);
            const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dKey = String(date.getDate()).padStart(2, '0');
            addPerformance(r.employee_id, mKey, dKey, 'shalat_berjamaah');
        });

        // Process Team Attendance (Doa Bersama, KIE)
        teamAttendanceRes.data?.forEach(r => {
            const mKey = r.session_date.substring(0, 7);
            const dKey = r.session_date.substring(8, 10);
            const type = r.session_type?.toLowerCase().trim();
            if (type === 'kie') addPerformance(r.user_id, mKey, dKey, 'tepat_waktu_kie');
            else if (type === 'doa bersama') addPerformance(r.user_id, mKey, dKey, 'doa_bersama');
            else if (type === 'kajian selasa') addPerformance(r.user_id, mKey, dKey, 'kajian_selasa');
            else if (type === 'pengajian persyarikatan' || type === 'persyarikatan') addPerformance(r.user_id, mKey, dKey, 'persyarikatan');
        });

        // Process Activity Attendance (Kajian Selasa, etc)
        activityAttendanceRes.data?.forEach((r: any) => {
            if (!r.activities) return;
            const mKey = r.activities.date.substring(0, 7);
            const dKey = r.activities.date.substring(8, 10);
            const type = r.activities.activity_type?.toLowerCase().trim();
            if (type === 'kajian selasa') addPerformance(r.employee_id, mKey, dKey, 'kajian_selasa');
            else if (type === 'pengajian persyarikatan' || type === 'persyarikatan') addPerformance(r.employee_id, mKey, dKey, 'persyarikatan');
            else if (type === 'kie') addPerformance(r.employee_id, mKey, dKey, 'tepat_waktu_kie');
            else if (type === 'doa bersama') addPerformance(r.employee_id, mKey, dKey, 'doa_bersama');
            else if (type === 'bbq' || type === 'umum' || type === 'tadarus') addPerformance(r.employee_id, mKey, dKey, 'tadarus');
            else if (type === 'membaca al-quran dan buku' || type === 'baca alquran buku') addPerformance(r.employee_id, mKey, dKey, 'baca_alquran_buku');
        });

        // Pre-process Monthly Reports (Manual Counters) for unique days
        const manualReportMap: Record<string, any> = {};
        monthlyReportsRes.data?.forEach(r => {
            manualReportMap[r.employee_id] = r.reports || {};
            // Also merge manual reports into performanceMap for unified counting
            Object.entries(r.reports || {}).forEach(([mKey, mData]: [string, any]) => {
                Object.entries(mData).forEach(([actId, actData]: [string, any]) => {
                    if (actData.entries && Array.isArray(actData.entries)) {
                        actData.entries.forEach((e: any) => {
                            const dKey = e.date.substring(8, 10);
                            addPerformance(r.employee_id, mKey, dKey, actId);
                        });
                    }
                    if (actData.bookEntries && Array.isArray(actData.bookEntries)) {
                        actData.bookEntries.forEach((e: any) => {
                            const dKey = e.dateCompleted.substring(8, 10);
                            addPerformance(r.employee_id, mKey, dKey, actId);
                        });
                    }
                    if (!actData.entries && !actData.bookEntries && actData.completedAt) {
                        const date = new Date(actData.completedAt);
                        const dKey = String(date.getDate()).padStart(2, '0');
                        addPerformance(r.employee_id, mKey, dKey, actId);
                    }
                });
            });
        });
        // ✅ Map Approval Status: empId -> monthKey -> true (if approved)
        // CRITICAL: Laporan Mutaba'ah hanya menghitung data yang sudah di-approve oleh mentor
        // Ini memastikan data yang dilaporkan adalah data yang valid untuk penilaian akhir tahun
        const approvalMap: Record<string, Record<string, boolean>> = {};
        submissionsRes.data?.forEach((s: any) => {
            if (!approvalMap[s.mentee_id]) approvalMap[s.mentee_id] = {};
            approvalMap[s.mentee_id][s.month_key] = true;
        });

        // 🔍 Debug: Log approval data for troubleshooting
        console.log(`[Mutabaah Report] Year: ${year}, Total employees: ${employees.length}, Total approvals: ${submissionsRes.data?.length || 0}`);


        // 7. Assemble final records
        const records = employees.map(emp => {
            const empPerf = performanceMap[emp.id] || {};
            const allReports = manualReportMap[emp.id] || {};

            let sidiqCount = 0;
            let tablighCount = 0;
            let amanahCount = 0;
            let fatonahCount = 0;
            let monthsCount = 0;


            // Iterate through months of the requested year
            for (let m = 1; m <= 12; m++) {
                const monthKey = `${year}-${String(m).padStart(2, '0')}`;
                const monthData = empPerf[monthKey];
                const manualMonthData = allReports[monthKey];

                if (monthData || manualMonthData) {
                    monthsCount++;

                    // Count unique days for each activity in this month
                    const getCountForActivity = (activityId: string) => {
                        // 1. Count from performanceMap (combined from all tables)
                        let count = 0;
                        if (monthData) {
                            Object.values(monthData).forEach(day => {
                                if (day[activityId]) count++;
                            });
                        }

                        // 2. Also check if there's a raw count in employee_monthly_reports (compat)
                        if (manualMonthData && manualMonthData[activityId]?.count > count) {
                            count = manualMonthData[activityId].count;
                        }

                        return count;
                    };

                    const countForCategory = (activities: any[]) => {
                        // ✅ APPROVAL CHECK: Hanya hitung jika bulan ini sudah di-APPROVE oleh mentor
                        // Laporan Mutaba'ah adalah penilaian akhir tahun yang harus valid
                        // Data yang belum di-approve tidak dihitung karena belum terverifikasi
                        const isApproved = approvalMap[emp.id]?.[monthKey];
                        if (!isApproved) return 0;

                        return activities.reduce((sum, act) => sum + getCountForActivity(act.id), 0);
                    };

                    sidiqCount += countForCategory(sidiqActivities);
                    tablighCount += countForCategory(tablighActivities);
                    amanahCount += countForCategory(amanahActivities);
                    fatonahCount += countForCategory(fatonahActivities);
                }
            }

            const sidiqTarget = monthlySidiqTarget * monthsCount;
            const tablighTarget = monthlyTablighTarget * monthsCount;
            const amanahTarget = monthlyAmanahTarget * monthsCount;
            const fatonahTarget = monthlyFatonahTarget * monthsCount;
            const totalTarget = sidiqTarget + tablighTarget + amanahTarget + fatonahTarget;
            const totalCount = sidiqCount + tablighCount + amanahCount + fatonahCount;

            return {
                employeeId: emp.id,
                employeeName: emp.name,
                unit: emp.unit,
                profession: emp.profession,
                professionCategory: emp.profession_category,
                hospitalId: emp.hospital_id,
                mentorId: emp.mentor_id,
                mentorName: emp.mentor_id ? (mentorMap[emp.mentor_id] || emp.mentor_id) : '-',
                monthKey: year,
                sidiqCount, sidiqTarget, sidiqPercentage: sidiqTarget > 0 ? Math.min(100, Math.round((sidiqCount / sidiqTarget) * 100)) : 0,
                tablighCount, tablighTarget, tablighPercentage: tablighTarget > 0 ? Math.min(100, Math.round((tablighCount / tablighTarget) * 100)) : 0,
                amanahCount, amanahTarget, amanahPercentage: amanahTarget > 0 ? Math.min(100, Math.round((amanahCount / amanahTarget) * 100)) : 0,
                fatonahCount, fatonahTarget, fatonahPercentage: fatonahTarget > 0 ? Math.min(100, Math.round((fatonahCount / fatonahTarget) * 100)) : 0,
                totalCount, totalTarget, totalPercentage: totalTarget > 0 ? Math.min(100, Math.round((totalCount / totalTarget) * 100)) : 0
            };
        });

        return NextResponse.json({
            records,
            total: totalCount || 0,
            totalPages: Math.ceil((totalCount || 0) / limit),
            page
        });

    } catch (error) {
        console.error('❌ [Mutabaah Report API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
