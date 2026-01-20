import { supabase } from '@/lib/supabase';

/**
 * Activity Stats Service
 * Menghitung statistics untuk Dashboard & Lembar Mutaba'ah
 * ✅ SUDAH DIPERBAIKI: Baca dari view unified_attendance (lebih simple!)
 */

export interface ActivityStats {
    kajianSelasa: number;
    pengajianPersyarikatan: number;
    kegiatanTerjadwal: number;
    kie: number;
    doaBersama: number;
    totalActivities: number; // Kajian + Pengajian
    totalTeamSessions: number; // KIE + Doa
}

export interface MonthlyStats {
    [monthKey: string]: ActivityStats;
}

/**
 * Get activity statistics untuk satu employee per bulan
 * Returns: Record<"2026-01", ActivityStats>
 */
export const getEmployeeActivityStats = async (
    employeeId: string,
    startDate?: string,
    endDate?: string
): Promise<MonthlyStats> => {
    try {
        console.log('🔍 getEmployeeActivityStats called:', { employeeId, startDate, endDate });

        // Default: 6 bulan terakhir
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log('📅 Query range:', { start, end });

        // ✅ PERBAIKAN: Baca dari view unified_attendance (SIMPLE!)
        const { data: unifiedAttendance, error } = await supabase
            .from('unified_attendance')
            .select('*')
            .eq('user_id', employeeId)
            .gte('date', start)
            .lte('date', end)
            .order('attended_at', { ascending: true });

        console.log('📊 Raw unified attendance:', unifiedAttendance);

        if (error) {
            console.error('❌ Error fetching unified attendance:', error);
            return {};
        }

        // PROSES DATA: Group by month dan hitung
        const stats: MonthlyStats = {};

        (unifiedAttendance || []).forEach((record: any) => {
            const date = record.date;
            const monthKey = date.substring(0, 7); // "2026-01"
            const fieldName = record.field_name;

            if (!stats[monthKey]) {
                stats[monthKey] = {
                    kajianSelasa: 0,
                    pengajianPersyarikatan: 0,
                    kegiatanTerjadwal: 0,
                    kie: 0,
                    doaBersama: 0,
                    totalActivities: 0,
                    totalTeamSessions: 0
                };
            }

            // Increment berdasarkan field_name
            if (fieldName === 'kajianSelasa') {
                stats[monthKey].kajianSelasa++;
                stats[monthKey].totalActivities++;
            } else if (fieldName === 'pengajianPersyarikatan') {
                stats[monthKey].pengajianPersyarikatan++;
                stats[monthKey].totalActivities++;
            } else if (fieldName === 'kie') {
                stats[monthKey].kie++;
                stats[monthKey].totalTeamSessions++;
            } else if (fieldName === 'doaBersama') {
                stats[monthKey].doaBersama++;
                stats[monthKey].totalTeamSessions++;
            } else if (fieldName === 'kegiatanTerjadwal') {
                stats[monthKey].kegiatanTerjadwal++;
                stats[monthKey].totalActivities++;
            }
        });

        console.log('📊 Computed activity stats:', stats);
        return stats;
    } catch (error) {
        console.error('Error in getEmployeeActivityStats:', error);
        return {};
    }
};

/**
 * Get activity stats untuk bulan tertentu saja
 */
export const getEmployeeActivityStatsForMonth = async (
    employeeId: string,
    monthKey: string // "2026-01"
): Promise<ActivityStats> => {
    const stats = await getEmployeeActivityStats(
        employeeId,
        `${monthKey}-01`,
        `${monthKey}-31`
    );

    return stats[monthKey] || {
        kajianSelasa: 0,
        pengajianPersyarikatan: 0,
        kegiatanTerjadwal: 0,
        kie: 0,
        doaBersama: 0,
        totalActivities: 0,
        totalTeamSessions: 0
    };
};

/**
 * Get current month stats
 */
export const getCurrentMonthStats = async (employeeId: string): Promise<ActivityStats> => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return getEmployeeActivityStatsForMonth(employeeId, monthKey);
};
