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
                    console.error(`Error loading attendance for ${act.id}:`, err);
                }
            }

            setAttendance(attendanceData);
        } catch (err) {
            console.error('Error loading scheduled activities:', err);
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
    ): Promise<boolean> => {
        if (!employeeId) return false;

        try {
            const result = await submitScheduledAttendance(activityId, employeeId, status, reason);

            // Update local state
            setAttendance(prev => ({
                ...prev,
                [activityId]: result
            }));

            // Reload activities untuk refresh data
            await loadActivities();

            return true;
        } catch (err) {
            console.error('Error submitting attendance:', err);
            alert('Gagal menyimpan presensi. Silakan coba lagi.');
            return false;
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
