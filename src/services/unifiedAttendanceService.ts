import { supabase } from '@/lib/supabase';

/**
 * Unified Attendance Service
 * Mengambil data dari view public.unified_attendance untuk laporan
 */

export interface UnifiedAttendanceRecord {
    record_id: string;
    entity_id: string;
    user_id: string;
    attendance_type: 'activity' | 'session';
    status: string;
    attended_at: string;
    created_at: string;
    updated_at: string;
    entity_name: string;
    activity_type: string;
    date: string;
    field_name: string;
}

/**
 * Get all unified attendance records untuk laporan kegiatan
 */
export const getAllUnifiedAttendance = async (
    startDate?: string,
    endDate?: string
): Promise<UnifiedAttendanceRecord[]> => {
    try {
        let query = supabase
            .from('unified_attendance')
            .select('*')
            .order('attended_at', { ascending: false });

        if (startDate) {
            query = query.gte('date', startDate);
        }

        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching unified attendance:', error);
            return [];
        }

        return (data || []) as UnifiedAttendanceRecord[];
    } catch (error) {
        console.error('Error in getAllUnifiedAttendance:', error);
        return [];
    }
};

/**
 * Get unified attendance records untuk user tertentu
 */
export const getUserUnifiedAttendance = async (
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<UnifiedAttendanceRecord[]> => {
    try {
        let query = supabase
            .from('unified_attendance')
            .select('*')
            .eq('user_id', userId)
            .order('attended_at', { ascending: false });

        if (startDate) {
            query = query.gte('date', startDate);
        }

        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching user unified attendance:', error);
            return [];
        }

        return (data || []) as UnifiedAttendanceRecord[];
    } catch (error) {
        console.error('Error in getUserUnifiedAttendance:', error);
        return [];
    }
};

/**
 * Get unified attendance untuk activity type tertentu
 */
export const getActivityTypeAttendance = async (
    activityType: string,
    startDate?: string,
    endDate?: string
): Promise<UnifiedAttendanceRecord[]> => {
    try {
        let query = supabase
            .from('unified_attendance')
            .select('*')
            .eq('activity_type', activityType)
            .order('attended_at', { ascending: false });

        if (startDate) {
            query = query.gte('date', startDate);
        }

        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching activity type attendance:', error);
            return [];
        }

        return (data || []) as UnifiedAttendanceRecord[];
    } catch (error) {
        console.error('Error in getActivityTypeAttendance:', error);
        return [];
    }
};
