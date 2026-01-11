'use client';

import React, { useEffect, useState } from 'react';
import { ActivityTable } from '@/components/ActivityTable';
import { useAppDataStore, useActivityStore } from '@/store/store';
import { getEmployeeAttendance, submitAttendance, type AttendanceRecord } from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';
import { type Attendance } from '@/types';

export default function KegiatanPage() {
    const { loggedInEmployee } = useAppDataStore();
    const { activities } = useActivityStore();
    const [attendance, setAttendance] = useState<Attendance>({});
    const [teamAttendanceSessions, setTeamAttendanceSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load attendance data and team sessions on mount
    useEffect(() => {
        if (loggedInEmployee) {
            loadAttendanceData();
            loadTeamSessions();
        }
    }, [loggedInEmployee]);

    const loadAttendanceData = async () => {
        if (!loggedInEmployee) return;

        try {
            const data = await getEmployeeAttendance(loggedInEmployee.id);

            // Convert AttendanceRecord to AttendanceStatus format
            const convertedAttendance: Attendance = {};
            Object.entries(data).forEach(([key, record]) => {
                convertedAttendance[key] = {
                    status: record.status,
                    reason: record.reason,
                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                    submitted: true,
                    isLateEntry: record.is_late_entry
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

    const handleHadir = async (activityId: string) => {
        if (!loggedInEmployee) return;

        // Find activity name
        const activity = activities.find(a => a.id === activityId);
        const teamSession = teamAttendanceSessions.find((s: any) => `team-${s.id}` === activityId);

        const activityName = activity?.name || teamSession?.type || 'Kegiatan';

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
    };

    const handleTidakHadir = async (activity: { id: string; name: string }) => {
        if (!loggedInEmployee) return;

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
    };

    const handleUbah = async (activityId: string) => {
        // TODO: Implement edit functionality
        console.log('Edit attendance for:', activityId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Memuat data kegiatan...</div>
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
