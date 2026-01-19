import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyReportSubmission, TadarusSession, TadarusRequest, MissedPrayerRequest, MenteeTarget } from '@/types';

interface GuidanceState {
    weeklyReportSubmissions: WeeklyReportSubmission[];
    tadarusSessions: TadarusSession[];
    tadarusRequests: TadarusRequest[];
    missedPrayerRequests: MissedPrayerRequest[];
    menteeTargets: MenteeTarget[];

    // Actions
    addOrUpdateWeeklyReportSubmission: (submission: WeeklyReportSubmission) => void;

    addTadarusSessions: (sessions: TadarusSession[]) => void;
    updateTadarusSession: (sessionId: string, updates: Partial<TadarusSession> | ((session: TadarusSession) => TadarusSession)) => Promise<void>;
    deleteTadarusSession: (sessionId: string) => Promise<void>;
    loadTadarusSessionsFromSupabase: () => Promise<void>;
    loadTadarusRequestsFromSupabase: () => Promise<void>;

    addOrUpdateTadarusRequest: (request: TadarusRequest) => Promise<void>;

    addOrUpdateMissedPrayerRequest: (request: MissedPrayerRequest) => void;

    addMenteeTarget: (target: MenteeTarget) => void;
    updateMenteeTarget: (targetId: string, updates: Partial<MenteeTarget>) => void;
    deleteMenteeTarget: (targetId: string) => void;
}

export const useGuidanceStore = create<GuidanceState>()(
    persist(
        (set) => ({
            weeklyReportSubmissions: [],
            tadarusSessions: [],
            tadarusRequests: [],
            missedPrayerRequests: [],
            menteeTargets: [],

            addOrUpdateWeeklyReportSubmission: (submission) => set((state) => {
                const index = state.weeklyReportSubmissions.findIndex(s => s.id === submission.id);
                if (index !== -1) {
                    const newSubmissions = [...state.weeklyReportSubmissions];
                    newSubmissions[index] = submission;
                    return { weeklyReportSubmissions: newSubmissions };
                }
                return { weeklyReportSubmissions: [...state.weeklyReportSubmissions, submission] };
            }),

            addTadarusSessions: (sessions) => set((state) => ({
                tadarusSessions: [...state.tadarusSessions, ...sessions]
            })),

            updateTadarusSession: async (sessionId, updates) => {
                try {
                    // Update to Supabase first
                    const { updateTadarusSession: updateService } = await import('@/services/tadarusService');
                    const updateData = typeof updates === 'function' ? updates(null) : updates;
                    await updateService(sessionId, updateData);

                    // Then update local state
                    set((state) => ({
                        tadarusSessions: state.tadarusSessions.map(session =>
                            session.id === sessionId
                                ? typeof updates === 'function'
                                    ? updates(session)
                                    : { ...session, ...updates }
                                : session
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            deleteTadarusSession: async (sessionId) => {
                try {
                    // Delete from Supabase first
                    const { deleteTadarusSession: deleteService } = await import('@/services/tadarusService');
                    await deleteService(sessionId);

                    // Then update local state
                    set((state) => ({
                        tadarusSessions: state.tadarusSessions.filter(s => s.id !== sessionId)
                    }));
                } catch (error) {
                    throw error;
                }
            },

            loadTadarusSessionsFromSupabase: async () => {
                try {
                    const { getAllTadarusSessions } = await import('@/services/tadarusService');
                    const sessions = await getAllTadarusSessions();
                    set({ tadarusSessions: sessions });
                } catch (error) {
                    throw error;
                }
            },

            loadTadarusRequestsFromSupabase: async () => {
                try {
                    const { getAllTadarusRequests } = await import('@/services/tadarusService');
                    const requests = await getAllTadarusRequests();
                    set({ tadarusRequests: requests });
                } catch (error) {
                    throw error;
                }
            },

            addOrUpdateTadarusRequest: async (request) => {
                try {
                    // Save to Supabase first
                    const { createTadarusRequest, updateTadarusRequest } = await import('@/services/tadarusService');

                    const existingRequest = await new Promise<any>((resolve) => {
                        set((state) => {
                            const found = state.tadarusRequests.find(r => r.id === request.id);
                            resolve(found);
                        });
                    });

                    if (!existingRequest) {
                        // Create new request
                        await createTadarusRequest(request);
                    } else if (existingRequest.status !== request.status) {
                        // Update status only
                        await updateTadarusRequest(request.id, {
                            status: request.status,
                            reviewedAt: request.reviewedAt
                        });
                    }

                    // Then update local state
                    set((state) => {
                        const index = state.tadarusRequests.findIndex(r => r.id === request.id);
                        if (index !== -1) {
                            const newRequests = [...state.tadarusRequests];
                            newRequests[index] = request;
                            return { tadarusRequests: newRequests };
                        }
                        return { tadarusRequests: [...state.tadarusRequests, request] };
                    });
                } catch (error) {
                    throw error;
                }
            },

            addOrUpdateMissedPrayerRequest: (request) => set((state) => {
                const index = state.missedPrayerRequests.findIndex(r => r.id === request.id);
                if (index !== -1) {
                    const newRequests = [...state.missedPrayerRequests];
                    newRequests[index] = request;
                    return { missedPrayerRequests: newRequests };
                }
                return { missedPrayerRequests: [...state.missedPrayerRequests, request] };
            }),
            
            addMenteeTarget: (target) => set((state) => ({
                menteeTargets: [...state.menteeTargets, target]
            })),

            updateMenteeTarget: (targetId, updates) => set((state) => ({
                menteeTargets: state.menteeTargets.map(t => t.id === targetId ? { ...t, ...updates } : t)
            })),

            deleteMenteeTarget: (targetId) => set((state) => ({
                menteeTargets: state.menteeTargets.filter(t => t.id !== targetId)
            })),
        }),
        {
            name: 'guidance-storage',
        }
    )
);
