/**
 * Attendance Audit Service
 * Menggunakan sistem APPEND-ONLY (tidak ada data yang tertimpa)
 * Setiap perubahan membuat record BARU
 */

import { supabase } from '@/lib/supabase';

/**
 * Record attendance menggunakan fungsi append-only
 * Ini akan membuat record BARU setiap kali dipanggil, tidak pernah mengupdate record lama
 */
export const recordAttendance = async (params: {
    employeeId: string;
    entityId: string; // 'subuh', 'dzuhur', etc.
    date: string; // 'YYYY-MM-DD'
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';
    reason?: string;
    location?: string; // JSON stringified geolocation
    source?: string; // 'manual', 'auto', 'admin_edit'
    changedBy?: string; // User ID yang menginput
}): Promise<{ success: boolean; error?: string; recordId?: string }> => {
    try {
        const { data, error } = await supabase.rpc('record_attendance', {
            p_employee_id: params.employeeId,
            p_entity_id: params.entityId,
            p_date: params.date,
            p_status: params.status,
            p_reason: params.reason || null,
            p_location: params.location || null,
            p_source: params.source || 'manual',
            p_changed_by: params.changedBy || params.employeeId
        });

        if (error) {
            console.error('❌ Error recording attendance:', error);
            return { success: false, error: error.message };
        }

        return { success: true, recordId: data as string };
    } catch (error: any) {
        console.error('❌ Exception in recordAttendance:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get attendance records (hanya yang TERBARU - is_latest=true)
 */
export const getLatestAttendance = async (params: {
    employeeId: string;
    entityId?: string;
    startDate?: string; // 'YYYY-MM-DD'
    endDate?: string; // 'YYYY-MM-DD'
}): Promise<Record<string, any>> => {
    try {
        const { data, error } = await supabase.rpc('get_latest_attendance', {
            p_employee_id: params.employeeId,
            p_entity_id: params.entityId || null,
            p_start_date: params.startDate || null,
            p_end_date: params.endDate || null
        });

        if (error) {
            throw error;
        }

        // Convert array to map: date -> status
        const attendanceMap: Record<string, any> = {};
        if (data) {
            (data as any[]).forEach((record: any) => {
                const key = `${record.date}_${record.entity_id}`;
                attendanceMap[key] = {
                    date: record.date,
                    entityId: record.entity_id,
                    status: record.status,
                    reason: record.reason,
                    recordedAt: record.recorded_at
                };
            });
        }

        return attendanceMap;
    } catch (error) {
        console.error('❌ Error getting latest attendance:', error);
        throw error;
    }
};

/**
 * Get attendance history (SEMUA riwayat perubahan)
 * Berguna untuk melihat kapan user mengubah status hadir → izin → hadir lagi
 */
export const getAttendanceHistory = async (params: {
    employeeId: string;
    entityId?: string;
    date?: string; // 'YYYY-MM-DD'
}): Promise<any[]> => {
    try {
        let query = supabase
            .from('attendance_records_history')
            .select('*')
            .eq('employee_id', params.employeeId)
            .order('recorded_at', { ascending: true }); // Dari yang paling lama

        if (params.entityId) {
            query = query.eq('entity_id', params.entityId);
        }

        if (params.date) {
            query = query.eq('date', params.date);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return (data as any[]) || [];
    } catch (error) {
        console.error('❌ Error getting attendance history:', error);
        throw error;
    }
};

/**
 * Get attendance changes log (dari audit table)
 * Menampilkan riwayat perubahan yang lebih mudah dibaca
 */
export const getAttendanceChanges = async (params: {
    employeeId: string;
    limit?: number;
}): Promise<any[]> => {
    try {
        let query = supabase
            .from('v_attendance_changes')
            .select('*')
            .eq('employee_id', params.employeeId)
            .order('changed_at', { ascending: false });

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return (data as any[]) || [];
    } catch (error) {
        console.error('❌ Error getting attendance changes:', error);
        throw error;
    }
};

/**
 * Get monthly activities audit history
 */
export const getMonthlyActivitiesHistory = async (params: {
    employeeId: string;
    monthKey?: string; // 'YYYY-MM'
    limit?: number;
}): Promise<any[]> => {
    try {
        let query = supabase
            .from('employee_monthly_activities_audit')
            .select('*')
            .eq('employee_id', params.employeeId)
            .order('changed_at', { ascending: false });

        if (params.monthKey) {
            query = query.eq('month_key', params.monthKey);
        }

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return (data as any[]) || [];
    } catch (error) {
        console.error('❌ Error getting monthly activities history:', error);
        throw error;
    }
};

/**
 * Restore employee activities from audit
 * Hanya untuk admin - mengembalikan data ke kondisi sebelumnya
 */
export const restoreEmployeeActivities = async (auditId: string): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('restore_employee_activities_from_audit', {
            p_audit_id: auditId
        });

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('❌ Error restoring employee activities:', error);
        throw error;
    }
};

/**
 * Get daily activity changes summary
 */
export const getDailyActivityChanges = async (params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<any[]> => {
    try {
        let query = supabase
            .from('v_daily_activity_changes')
            .select('*')
            .order('change_date', { ascending: false });

        if (params.employeeId) {
            query = query.eq('employee_id', params.employeeId);
        }

        if (params.startDate) {
            query = query.gte('change_date', params.startDate);
        }

        if (params.endDate) {
            query = query.lte('change_date', params.endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return (data as any[]) || [];
    } catch (error) {
        console.error('❌ Error getting daily activity changes:', error);
        throw error;
    }
};

// Types untuk TypeScript
export interface AttendanceRecord {
    id: string;
    employeeId: string;
    entityId: string;
    date: string;
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';
    reason?: string;
    recordedAt: string;
    isLatest: boolean;
}

export interface AttendanceChangeLog {
    employeeId: string;
    entityId: string;
    date: string;
    oldStatus: string | null;
    newStatus: string;
    changeType: 'INSERT' | 'UPDATE' | 'DELETE';
    changedAt: string;
    changeDescription: string;
}

export interface MonthlyActivitiesAudit {
    id: string;
    employeeId: string;
    activitiesSnapshot: Record<string, any>;
    monthKey: string | null;
    changeType: 'INITIAL' | 'DAILY_UPDATE' | 'FULL_SAVE' | 'MERGE';
    changedAt: string;
    oldValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
}
