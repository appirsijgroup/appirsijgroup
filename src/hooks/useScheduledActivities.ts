import { useEffect, useState, useCallback } from 'react';
import {
    getScheduledActivitiesForEmployee,
    submitScheduledAttendance,
    getEmployeeActivityAttendance,
    type ScheduledActivity,
    type ScheduledActivityAttendance
} from '@/services/scheduledActivityService';

/**
 * Hook untuk mengelola scheduled activities dan attendance
 * Digunakan di Dashboard dan Lembar Mutaba'ah
 */
export const useScheduledActivities = (employeeId: string | null) => {
    const [activities, setActivities] = useState<ScheduledActivity[]>([]);
    const [attendance, setAttendance] = useState<Record<string, ScheduledActivityAttendance>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load activities untuk employee
    const loadActivities = useCallback(async () => {
        if (!employeeId) return;

        setIsLoading(true);
        setError(null);

        try {
            const acts = await getScheduledActivitiesForEmployee(employeeId);
            setActivities(acts);

            // 🔥 FIX: Load attendance untuk current employee untuk setiap activity
            const attendanceData: Record<string, ScheduledActivityAttendance> = {};
            for (const act of acts) {
                try {
                    const att = await getEmployeeActivityAttendance(act.id, employeeId);
                    if (att) {
                        // Hanya simpan jika employee sudah submit attendance
                        attendanceData[act.id] = att;
                    }
                } catch (err) {
                }
            }

            setAttendance(attendanceData);
        } catch (err) {
            setError('Gagal memuat kegiatan terjadwal');
        } finally {
            setIsLoading(false);
        }
    }, [employeeId]);

    // Submit attendance
    const submitAttendance = useCallback(async (
        activityId: string,
        status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit',
        reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!employeeId) return { success: false, error: 'Employee ID tidak ditemukan' };

        try {
            const result = await submitScheduledAttendance(activityId, employeeId, status, reason);

            // Update local state
            setAttendance(prev => ({
                ...prev,
                [activityId]: result
            }));

            // Reload activities untuk refresh data
            await loadActivities();

            return { success: true };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan presensi. Silakan coba lagi.';
            return { success: false, error: errorMessage };
        }
    }, [employeeId, loadActivities]);

    // Load on mount
    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    return {
        activities,
        attendance,
        isLoading,
        error,
        loadActivities,
        submitAttendance,
    };
};
