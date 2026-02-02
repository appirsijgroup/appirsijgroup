import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity, TeamAttendanceSession, TeamAttendanceRecord } from '@/types';

interface ActivityState {
    activities: Activity[];
    teamAttendanceSessions: TeamAttendanceSession[];
    teamAttendanceRecords: TeamAttendanceRecord[]; // ⚡ TAMBAH: Records presensi
    isLoadingTeamAttendance: boolean;
    isLoadingActivities: boolean;
    teamAttendanceError: string | null;
    activitiesError: string | null;
    addActivity: (activity: Activity) => Promise<void>; // ⚡ UPDATE: Jadi async, insert ke Supabase
    updateActivity: (activityId: string, updates: Partial<Activity>) => Promise<void>; // ⚡ UPDATE: Jadi async
    deleteActivity: (activityId: string) => Promise<void>; // ⚡ UPDATE: Jadi async
    addTeamAttendanceSessions: (sessions: TeamAttendanceSession[]) => Promise<void>; // ⚡ UPDATE: Jadi async, insert ke Supabase
    // ⚡ UPDATE: Ganti updateTeamAttendanceSession dengan createTeamAttendanceRecord
    createTeamAttendanceRecord: (record: Omit<TeamAttendanceRecord, 'id' | 'createdAt'>) => Promise<void>;
    updateTeamAttendanceSessionData: (sessionId: string, updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentCount' | 'updatedAt'>) => Promise<void>;
    deleteTeamAttendanceSession: (sessionId: string) => Promise<void>;
    loadTeamAttendanceSessionsFromSupabase: (creatorId?: string) => Promise<void>;
    loadActivitiesFromSupabase: (employeeId?: string, creatorId?: string) => Promise<void>;
    // ⚡ TAMBAH: Fungsi helper untuk cek dan get attendance records
    hasUserAttendedSession: (sessionId: string, userId: string) => Promise<boolean>;
    getAttendanceRecordsForSession: (sessionId: string) => Promise<TeamAttendanceRecord[]>;
}

export const useActivityStore = create<ActivityState>()(
    persist(
        (set, get) => ({
            activities: [],
            teamAttendanceSessions: [],
            teamAttendanceRecords: [], // ⚡ TAMBAH: Initialize records array
            isLoadingTeamAttendance: false,
            isLoadingActivities: false,
            teamAttendanceError: null,
            activitiesError: null,
            addActivity: async (activity) => {
                try {
                    // ⚡ CRITICAL: Insert ke Supabase dulu, baru update local state
                    const { createActivity: createService } = await import('@/services/scheduledActivityService');

                    // Insert ke Supabase
                    const createdActivity = await createService(activity);

                    // Setelah berhasil insert ke Supabase, update local state
                    set((state) => ({ activities: [...state.activities, createdActivity] }));
                } catch (error) {
                    console.error('Failed to create activity:', error);
                    throw error; // Re-throw agar component bisa handle error
                }
            },

            updateActivity: async (activityId, updates) => {
                try {
                    // ⚡ UPDATE: Update ke Supabase dulu
                    const { updateActivity: updateService } = await import('@/services/scheduledActivityService');
                    await updateService(activityId, updates);

                    // Then update local state
                    set((state) => ({
                        activities: state.activities.map(act => act.id === activityId ? { ...act, ...updates } : act)
                    }));
                } catch (error) {
                    console.error('Failed to update activity:', error);
                    throw error;
                }
            },

            deleteActivity: async (activityId) => {
                try {
                    // ⚡ UPDATE: Delete dari Supabase dulu
                    const { deleteActivity: deleteService } = await import('@/services/scheduledActivityService');
                    await deleteService(activityId);

                    // Then update local state
                    set((state) => ({
                        activities: state.activities.filter(act => act.id !== activityId)
                    }));
                } catch (error) {
                    console.error('Failed to delete activity:', error);
                    throw error;
                }
            },
            addTeamAttendanceSessions: async (sessions) => {
                try {
                    // ⚡ CRITICAL: Insert ke Supabase dulu, baru update local state
                    const { createTeamAttendanceSession: createService } = await import('@/services/teamAttendanceService');

                    // Insert semua sessions ke Supabase
                    const createdSessions = await Promise.all(
                        sessions.map(session => createService(session))
                    );

                    // Setelah berhasil insert ke Supabase, update local state
                    set((state) => ({
                        teamAttendanceSessions: [...state.teamAttendanceSessions, ...createdSessions]
                    }));
                } catch (error) {
                    console.error('Failed to create team attendance sessions:', error);
                    throw error; // Re-throw agar component bisa handle error
                }
            },

            // ⚡ UPDATE: Fungsi baru untuk create attendance record (ganti updateTeamAttendanceSession)
            createTeamAttendanceRecord: async (record) => {
                try {
                    // Insert to Supabase first
                    const { createTeamAttendanceRecord: createService } = await import('@/services/teamAttendanceService');
                    const newRecord = await createService(record);

                    // Then update local state
                    set((state) => ({
                        teamAttendanceRecords: [...state.teamAttendanceRecords, newRecord],
                        // ⚡ UPDATE: Increment presentCount untuk session terkait
                        teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                            sess.id === record.sessionId
                                ? { ...sess, presentCount: (sess.presentCount || 0) + 1 }
                                : sess
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            updateTeamAttendanceSessionData: async (sessionId, updates) => {
                try {
                    // Update to Supabase first
                    const { updateTeamAttendanceSessionData: updateService } = await import('@/services/teamAttendanceService');
                    await updateService(sessionId, updates);

                    // Then update local state
                    set((state) => ({
                        teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                            sess.id === sessionId ? { ...sess, ...updates } : sess
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            deleteTeamAttendanceSession: async (sessionId) => {
                try {
                    // Delete from Supabase first
                    const { deleteTeamAttendanceSession: deleteService } = await import('@/services/teamAttendanceService');
                    await deleteService(sessionId);

                    // Then update local state
                    set((state) => ({
                        teamAttendanceSessions: state.teamAttendanceSessions.filter(sess => sess.id !== sessionId),
                        // ⚡ TAMBAH: Hapus semua records terkait session yang dihapus
                        teamAttendanceRecords: state.teamAttendanceRecords.filter(rec => rec.sessionId !== sessionId)
                    }));
                } catch (error) {
                    throw error;
                }
            },

            loadTeamAttendanceSessionsFromSupabase: async (creatorId?: string) => {
                set({ isLoadingTeamAttendance: true, teamAttendanceError: null });

                try {
                    // Dynamic import to avoid circular dependencies
                    const { getAllTeamAttendanceSessions } = await import('@/services/teamAttendanceService');
                    const sessions = await getAllTeamAttendanceSessions(creatorId);

                    set({
                        teamAttendanceSessions: sessions,
                        isLoadingTeamAttendance: false,
                        teamAttendanceError: null
                    });

                } catch (error) {
                    set({
                        teamAttendanceError: error instanceof Error ? error.message : 'Failed to load sessions',
                        isLoadingTeamAttendance: false
                    });
                }
            },

            loadActivitiesFromSupabase: async (employeeId?: string, creatorId?: string) => {
                set({ isLoadingActivities: true, activitiesError: null });

                try {
                    // Dynamic import to avoid circular dependencies
                    const { getAllActivities, getActivitiesForEmployee } = await import('@/services/scheduledActivityService');
                    let activities;

                    if (employeeId) {
                        // getActivitiesForEmployee expects employeeId as string, not employee object
                        activities = await getActivitiesForEmployee(employeeId);
                    } else {
                        // Get all activities (admin view) - support optional creatorId filtering
                        activities = await getAllActivities(creatorId);
                    }

                    set({
                        activities: activities,
                        isLoadingActivities: false,
                        activitiesError: null
                    });

                } catch (error) {
                    set({
                        activitiesError: error instanceof Error ? error.message : 'Failed to load activities',
                        isLoadingActivities: false
                    });
                }
            },

            // ⚡ TAMBAH: Helper function untuk cek apakah user sudah hadir
            hasUserAttendedSession: async (sessionId: string, userId: string) => {
                try {
                    const { hasUserAttendedSession: checkService } = await import('@/services/teamAttendanceService');
                    return await checkService(sessionId, userId);
                } catch (error) {
                    console.error('Error checking attendance:', error);
                    return false;
                }
            },

            // ⚡ TAMBAH: Helper function untuk get attendance records suatu session
            getAttendanceRecordsForSession: async (sessionId: string) => {
                try {
                    const { getAttendanceRecordsForSession: getService } = await import('@/services/teamAttendanceService');
                    return await getService(sessionId);
                } catch (error) {
                    console.error('Error getting attendance records:', error);
                    return [];
                }
            },
        }),
        {
            name: 'activity-storage',
        }
    )
);
