'use client';

import React, { useEffect, useState } from 'react';
import { ActivityTable } from '@/components/ActivityTable';
import { useAppDataStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { getEmployeeAttendance, submitAttendance, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployeeActivitiesAttendance, submitScheduledAttendance } from '@/services/scheduledActivityService';
import { supabase } from '@/lib/supabase';
import { type Attendance } from '@/types';

export default function KegiatanPage() {
    const { loggedInEmployee } = useAppDataStore();
    const { activities } = useActivityStore();
    const [attendance, setAttendance] = useState<Attendance>({});
    const [teamAttendanceSessions, setTeamAttendanceSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load attendance data, team sessions, and activities on mount
    useEffect(() => {
        if (loggedInEmployee) {
            loadAttendanceData();
            loadTeamSessions();
            loadActivities();
        }
    }, [loggedInEmployee]);

    const loadAttendanceData = async () => {
        if (!loggedInEmployee) return;

        try {
            // Load team session attendance (from attendance_records table)
            const teamAttendanceData = await getEmployeeAttendance(loggedInEmployee.id);

            // Load scheduled activities attendance (from activity_attendance table)
            const activitiesAttendanceData = await getEmployeeActivitiesAttendance(loggedInEmployee.id);

            // Merge both attendance data
            const convertedAttendance: Attendance = {};

            // Convert team session attendance
            Object.entries(teamAttendanceData).forEach(([key, record]) => {
                convertedAttendance[key] = {
                    status: record.status,
                    reason: record.reason,
                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                    submitted: true,
                    isLateEntry: record.is_late_entry
                };
            });

            // Convert activities attendance
            Object.entries(activitiesAttendanceData).forEach(([key, record]) => {
                convertedAttendance[key] = {
                    status: (record.status === 'hadir' || record.status === 'tidak-hadir') ? record.status : null,
                    reason: undefined,
                    timestamp: null,
                    submitted: record.submitted,
                    isLateEntry: record.isLateEntry
                };
            });

            setAttendance(convertedAttendance);
        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('team_attendance_sessions')
                .select('*')
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) throw error;
            setTeamAttendanceSessions(data || []);
        } catch (error) {
            console.error('Error loading team sessions:', error);
        }
    };

    const loadActivities = async () => {
        if (!loggedInEmployee) return;

        try {
            // Load activities from store
            await useActivityStore.getState().loadActivitiesFromSupabase(loggedInEmployee.id);
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    };

    const handleHadir = async (activityId: string) => {
        if (!loggedInEmployee) return;

        // Check if this is a team session or a scheduled activity
        const isTeamSession = activityId.startsWith('team-');

        try {
            if (isTeamSession) {
                // Use existing attendance service for team sessions
                const teamSession = teamAttendanceSessions.find((s: any) => `team-${s.id}` === activityId);
                const activityName = teamSession?.type || 'Kegiatan';

                const result = await submitAttendance(
                    loggedInEmployee.id,
                    activityId,
                    'hadir',
                    activityName
                );

                if (result) {
                    // Update local state - convert AttendanceRecord to AttendanceStatus
                    setAttendance(prev => ({
                        ...prev,
                        [activityId]: {
                            status: result.status,
                            reason: result.reason,
                            timestamp: result.timestamp ? new Date(result.timestamp).getTime() : null,
                            submitted: true,
                            isLateEntry: result.is_late_entry
                        }
                    }));
                } else {
                    alert('Gagal menyimpan presensi. Silakan coba lagi.');
                }
            } else {
                // Use scheduled activity service for scheduled activities
                const result = await submitScheduledAttendance(
                    activityId,
                    loggedInEmployee.id,
                    'hadir'
                );

                // Update local state
                setAttendance(prev => ({
                    ...prev,
                    [activityId]: {
                        status: (result.status === 'hadir' || result.status === 'tidak-hadir') ? result.status : null,
                        reason: result.reason,
                        timestamp: result.submittedAt ? new Date(result.submittedAt).getTime() : null,
                        submitted: true,
                        isLateEntry: result.isLateEntry
                    }
                }));
            }
        } catch (error) {
            console.error('Error submitting attendance:', error);
            alert('Gagal menyimpan presensi. Silakan coba lagi.');
        }
    };

    const handleTidakHadir = async (activity: { id: string; name: string }) => {
        if (!loggedInEmployee) return;

        // Check if this is a team session or a scheduled activity
        const isTeamSession = activity.id.startsWith('team-');

        try {
            if (isTeamSession) {
                // Use existing attendance service for team sessions
                const result = await submitAttendance(
                    loggedInEmployee.id,
                    activity.id,
                    'tidak-hadir',
                    activity.name
                );

                if (result) {
                    // Update local state - convert AttendanceRecord to AttendanceStatus
                    setAttendance(prev => ({
                        ...prev,
                        [activity.id]: {
                            status: result.status,
                            reason: result.reason,
                            timestamp: result.timestamp ? new Date(result.timestamp).getTime() : null,
                            submitted: true,
                            isLateEntry: result.is_late_entry
                        }
                    }));
                } else {
                    alert('Gagal menyimpan presensi. Silakan coba lagi.');
                }
            } else {
                // Use scheduled activity service for scheduled activities
                const result = await submitScheduledAttendance(
                    activity.id,
                    loggedInEmployee.id,
                    'tidak-hadir'
                );

                // Update local state
                setAttendance(prev => ({
                    ...prev,
                    [activity.id]: {
                        status: (result.status === 'hadir' || result.status === 'tidak-hadir') ? result.status : null,
                        reason: result.reason,
                        timestamp: result.submittedAt ? new Date(result.submittedAt).getTime() : null,
                        submitted: true,
                        isLateEntry: result.isLateEntry
                    }
                }));
            }
        } catch (error) {
            console.error('Error submitting attendance:', error);
            alert('Gagal menyimpan presensi. Silakan coba lagi.');
        }
    };

    const handleUbah = async (activityId: string) => {
        // TODO: Implement edit functionality
        console.log('Edit attendance for:', activityId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
            </div>
        );
    }

    return (
        <ActivityTable
            activities={activities}
            teamAttendanceSessions={teamAttendanceSessions}
            attendance={attendance}
            loggedInEmployee={loggedInEmployee!}
            onHadir={handleHadir}
            onTidakHadir={handleTidakHadir}
            onUbah={handleUbah}
        />
    );
}
