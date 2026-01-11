import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity, TeamAttendanceSession } from '@/types';

interface ActivityState {
    activities: Activity[];
    teamAttendanceSessions: TeamAttendanceSession[];
    isLoadingTeamAttendance: boolean;
    teamAttendanceError: string | null;
    addActivity: (activity: Activity) => void;
    updateActivity: (activityId: string, updates: Partial<Activity>) => void;
    deleteActivity: (activityId: string) => void;
    addTeamAttendanceSessions: (sessions: TeamAttendanceSession[]) => void;
    updateTeamAttendanceSession: (sessionId: string, updates: Partial<TeamAttendanceSession>) => void;
    deleteTeamAttendanceSession: (sessionId: string) => void;
    loadTeamAttendanceSessionsFromSupabase: () => Promise<void>;
}

export const useActivityStore = create<ActivityState>()(
    persist(
        (set, get) => ({
            activities: [],
            teamAttendanceSessions: [],
            isLoadingTeamAttendance: false,
            teamAttendanceError: null,
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
        }),
        {
            name: 'activity-storage',
        }
    )
);
