'use client';

import React, { useEffect, useState } from 'react';
import { ActivityTable } from '@/components/ActivityTable';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { getEmployeeAttendance, submitAttendance, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployeeActivitiesAttendance, submitScheduledAttendance } from '@/services/scheduledActivityService';
import { getAllTeamAttendanceSessions } from '@/services/teamAttendanceService';
import { type Attendance } from '@/types';
import { getTodayLocalDateString } from '@/utils/dateUtils';

export default function KegiatanPage() {
    const { loggedInEmployee, refreshActivityStats } = useAppDataStore(); // 🔥 NEW: Import refreshActivityStats untuk real-time update
    const { activities, teamAttendanceSessions, teamAttendanceRecords } = useActivityStore(); // ⚡ FIX: Ambil juga teamAttendanceRecords
    const { addToast } = useUIStore();
    const [attendance, setAttendance] = useState<Attendance>({});
    const [loading, setLoading] = useState(true);

    // Load attendance data, team sessions, and activities on mount
    useEffect(() => {
        if (loggedInEmployee) {
            loadAttendanceData();
            loadTeamSessions();
            loadActivities();
        }
        // ⚡ FIX: Only run once, don't depend on functions
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedInEmployee?.id]); // Only re-run if employee ID changes

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

            // ⚡ FIX: Load team attendance records untuk user yang sedang login
            const { getAllTeamAttendanceRecordsForUser } = await import('@/services/teamAttendanceService');
            const teamRecords = await getAllTeamAttendanceRecordsForUser(loggedInEmployee.id);

            // Convert team attendance records
            teamRecords.forEach(record => {
                const activityId = `team-${record.sessionId}`;
                convertedAttendance[activityId] = {
                    status: 'hadir',
                    reason: null,
                    timestamp: record.attendedAt,
                    submitted: true,
                    isLateEntry: false
                };
            });

            setAttendance(convertedAttendance);
            console.log('✅ Attendance loaded:', Object.keys(convertedAttendance).length, 'items');
        } catch (error) {
            console.error('❌ Failed to load attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamSessions = async () => {
        try {
            // ⚡ FIX: Load dari store untuk konsistensi
            await useActivityStore.getState().loadTeamAttendanceSessionsFromSupabase();

            console.log('✅ Team sessions loaded from Supabase');
        } catch (error) {
            console.error('❌ Failed to load team sessions:', error);
        }
    };

    const loadActivities = async () => {
        if (!loggedInEmployee) return;

        try {
            console.log('🔍 Loading activities for employee:', loggedInEmployee.id);
            // Load activities from store
            await useActivityStore.getState().loadActivitiesFromSupabase(loggedInEmployee.id);

            // Debug: Cek hasil load
            const activities = useActivityStore.getState().activities;
            console.log('✅ Loaded activities:', activities);
            console.log('📊 Total activities:', activities.length);

            // Debug: Cek team sessions
            const teamSessions = useActivityStore.getState().teamAttendanceSessions;
            console.log('📊 Total team sessions:', teamSessions.length);
        } catch (error) {
            console.error('❌ Failed to load activities:', error);
        }
    };

    const handleHadir = async (activityId: string) => {
        if (!loggedInEmployee) return;

        // ⚡ FIX: Check if already attended
        if (attendance[activityId]?.submitted) {
            addToast('Anda sudah menandai kehadiran untuk kegiatan ini', 'error');
            return;
        }

        // Check if this is a team session or a scheduled activity
        const isTeamSession = activityId.startsWith('team-');

        try {
            if (isTeamSession) {
                const sessionId = activityId.replace('team-', '');
                const teamSession = teamAttendanceSessions.find((s: any) => s.id === sessionId);

                if (!teamSession) {
                    addToast('Sesi tidak ditemukan', 'error');
                    return;
                }

                // ⚡ FIX: Check if user already has record in teamAttendanceRecords
                const existingRecord = teamAttendanceRecords.find(
                    r => r.sessionId === sessionId && r.userId === loggedInEmployee.id
                );

                if (existingRecord) {
                    addToast('Anda sudah hadir di sesi ini', 'error');
                    return;
                }

                // Import dan gunakan createTeamAttendanceRecord
                const { createTeamAttendanceRecord } = await import('@/services/teamAttendanceService');

                const recordData = {
                    sessionId: teamSession.id,
                    userId: loggedInEmployee.id,
                    userName: loggedInEmployee.name,
                    attendedAt: Date.now(),
                    sessionType: teamSession.type,
                    sessionDate: teamSession.date,
                    sessionStartTime: teamSession.startTime,
                    sessionEndTime: teamSession.endTime
                };

                await createTeamAttendanceRecord(recordData);

                // 🔥 FIX: Reload attendance data dari Supabase untuk sinkronisasi
                await loadAttendanceData();

                // 🔥 NEW: Trigger Dashboard stats refresh
                refreshActivityStats();
            } else {
                // Use scheduled activity service for scheduled activities
                const result = await submitScheduledAttendance(
                    activityId,
                    loggedInEmployee.id,
                    'hadir'
                );

                // 🔥 FIX: Reload attendance data dari Supabase untuk sinkronisasi
                await loadAttendanceData();

                // 🔥 NEW: Trigger Dashboard stats refresh
                refreshActivityStats();
            }
        } catch (error) {
            addToast('Gagal menyimpan presensi. Silakan coba lagi.', 'error');
        }
    };

    const handleTidakHadir = async (activity: { id: string; name: string }) => {
        if (!loggedInEmployee) return;

        // Check if this is a team session or a scheduled activity
        const isTeamSession = activity.id.startsWith('team-');

        try {
            if (isTeamSession) {
                // ⚡ NOTE: Untuk team sessions, kita hanya mencatat yang HADIR di team_attendance_records
                // Yang tidak hadir tidak perlu dicatat
                addToast('Untuk sesi tim (KIE/Doa Bersama), hanya presensi HADIR yang dicatat.', 'error');
                return;
            } else {
                // Use scheduled activity service for scheduled activities
                const result = await submitScheduledAttendance(
                    activity.id,
                    loggedInEmployee.id,
                    'tidak-hadir'
                );

                // 🔥 FIX: Reload attendance data dari Supabase untuk sinkronisasi
                await loadAttendanceData();

                // 🔥 NEW: Trigger Dashboard stats refresh
                refreshActivityStats();
            }
        } catch (error) {
            addToast('Gagal menyimpan presensi. Silakan coba lagi.', 'error');
        }
    };

    const handleUbah = async (activityId: string) => {
        // TODO: Implement edit functionality
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
