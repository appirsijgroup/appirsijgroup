import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity, TeamAttendanceSession } from '@/types';

interface ActivityState {
    activities: Activity[];
    teamAttendanceSessions: TeamAttendanceSession[];
    isLoadingTeamAttendance: boolean;
    isLoadingActivities: boolean;
    teamAttendanceError: string | null;
    activitiesError: string | null;
    addActivity: (activity: Activity) => void;
    updateActivity: (activityId: string, updates: Partial<Activity>) => void;
    deleteActivity: (activityId: string) => void;
    addTeamAttendanceSessions: (sessions: TeamAttendanceSession[]) => void;
    updateTeamAttendanceSession: (sessionId: string, updates: Partial<TeamAttendanceSession>) => Promise<void>;
    updateTeamAttendanceSessionData: (sessionId: string, updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>) => Promise<void>;
    deleteTeamAttendanceSession: (sessionId: string) => Promise<void>;
    loadTeamAttendanceSessionsFromSupabase: () => Promise<void>;
    loadActivitiesFromSupabase: (employeeId?: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>()(
    persist(
        (set, get) => ({
            activities: [],
            teamAttendanceSessions: [],
            isLoadingTeamAttendance: false,
            isLoadingActivities: false,
            teamAttendanceError: null,
            activitiesError: null,
            addActivity: (activity) => set((state) => ({ activities: [...state.activities, activity] })),
            updateActivity: (activityId, updates) => set((state) => ({
                activities: state.activities.map(act => act.id === activityId ? { ...act, ...updates } : act)
            })),
            deleteActivity: (activityId) => set((state) => ({
                activities: state.activities.filter(act => act.id !== activityId)
            })),
            addTeamAttendanceSessions: (sessions) => set((state) => ({
                teamAttendanceSessions: [...state.teamAttendanceSessions, ...sessions]
            })),
            updateTeamAttendanceSession: async (sessionId, updates) => {
                try {
                    // Update to Supabase first
                    const { updateTeamAttendanceSession: updateService } = await import('@/services/teamAttendanceService');
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
                        teamAttendanceSessions: state.teamAttendanceSessions.filter(sess => sess.id !== sessionId)
                    }));
                } catch (error) {
                    throw error;
                }
            },
            loadTeamAttendanceSessionsFromSupabase: async () => {
                set({ isLoadingTeamAttendance: true, teamAttendanceError: null });

                try {
                    // Dynamic import to avoid circular dependencies
                    const { getAllTeamAttendanceSessions } = await import('@/services/teamAttendanceService');
                    const sessions = await getAllTeamAttendanceSessions();

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
            loadActivitiesFromSupabase: async (employeeId?: string) => {
                set({ isLoadingActivities: true, activitiesError: null });

                try {
                    // Dynamic import to avoid circular dependencies
                    const { getAllActivities, getActivitiesForEmployee } = await import('@/services/scheduledActivityService');
                    let activities;

                    if (employeeId) {
                        // getActivitiesForEmployee expects employeeId as string, not employee object
                        activities = await getActivitiesForEmployee(employeeId);
                    } else {
                        // Get all activities (admin view)
                        activities = await getAllActivities();
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
        }),
        {
            name: 'activity-storage',
        }
    )
);
