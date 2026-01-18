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
    updateTeamAttendanceSession: (sessionId: string, updates: Partial<TeamAttendanceSession>) => void;
    deleteTeamAttendanceSession: (sessionId: string) => void;
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
            updateTeamAttendanceSession: (sessionId, updates) => set((state) => ({
                teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                    sess.id === sessionId ? { ...sess, ...updates } : sess
                )
            })),
            deleteTeamAttendanceSession: (sessionId) => set((state) => ({
                teamAttendanceSessions: state.teamAttendanceSessions.filter(sess => sess.id !== sessionId)
            })),
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

                    console.log(`✅ Loaded ${sessions.length} team attendance sessions from Supabase`);
                } catch (error) {
                    console.error('❌ Error loading team attendance sessions:', error);
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

                    console.log(`✅ Loaded ${activities.length} activities from Supabase`);
                } catch (error) {
                    console.error('❌ Error loading activities:', {
                        message: error instanceof Error ? error.message : 'Unknown error',
                        error: error,
                        stack: error instanceof Error ? error.stack : undefined
                    });
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
