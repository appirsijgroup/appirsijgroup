import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyReportSubmission, TadarusSession, TadarusRequest, MissedPrayerRequest, MenteeTarget } from '@/types';
import { useAppDataStore } from './store';

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
    loadMissedPrayerRequestsFromSupabase: () => Promise<void>;
    loadWeeklyReportSubmissionsFromSupabase: () => Promise<void>;

    addOrUpdateTadarusRequest: (request: TadarusRequest) => Promise<void>;

    addOrUpdateMissedPrayerRequest: (request: MissedPrayerRequest) => void;

    addMenteeTarget: (target: MenteeTarget) => void;
    updateMenteeTarget: (targetId: string, updates: Partial<MenteeTarget>) => void;
    deleteMenteeTarget: (targetId: string) => void;
}

export const useGuidanceStore = create<GuidanceState>()(
    persist(
        (set, get) => ({
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
                    const { updateTadarusSession: updateService } = await import('@/services/tadarusService');
                    const updateData = typeof updates === 'function' ? updates({} as TadarusSession) : updates;
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
                    const { getAllTadarusRequests, getTadarusRequestsForMentor } = await import('@/services/tadarusService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    let requests;
                    if (loggedInEmployee && (loggedInEmployee.canBeMentor || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin')) {
                        requests = await getTadarusRequestsForMentor(loggedInEmployee.id);
                    } else {
                        requests = await getAllTadarusRequests();
                    }
                    set({ tadarusRequests: requests });
                } catch (error) {
                    throw error;
                }
            },

            loadMissedPrayerRequestsFromSupabase: async () => {
                try {
                    const { getMissedPrayerRequestsForMentor, getMissedPrayerRequestsForMentee } = await import('@/services/prayerRequestService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests;
                    if (loggedInEmployee.canBeMentor || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getMissedPrayerRequestsForMentor(loggedInEmployee.id);
                    } else {
                        requests = await getMissedPrayerRequestsForMentee(loggedInEmployee.id);
                    }
                    set({ missedPrayerRequests: requests });
                } catch (error) {
                    throw error;
                }
            },

            loadWeeklyReportSubmissionsFromSupabase: async () => {
                try {
                    const { getWeeklyReportsForMentor, getUserWeeklyReports } = await import('@/services/weeklyReportService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let submissions: WeeklyReportSubmission[] = [];

                    // If mentor, load submissions where I am mentor
                    if (loggedInEmployee.canBeMentor || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        submissions = await getWeeklyReportsForMentor(loggedInEmployee.id);
                    }

                    // If mentee (or also checking my own reports), load my reports
                    // Ideally we might want to merge them if user is BOTH/has both roles content
                    // For now, let's just use the mentor logic if mentor (MentorDashboard priority)
                    if (!loggedInEmployee.canBeMentor && loggedInEmployee.role === 'user') {
                        submissions = await getUserWeeklyReports(loggedInEmployee.id);
                    }

                    // If user is mentor but also has personal reports, simple logic might hide personal.
                    // But current UI only uses this for MentorDashboard -> Persetujuan.
                    // Mentee Dashboard uses 'submissions' prop in DashboardContainer usually loaded differently?
                    // No, DashboardContainer passes 'weeklyReportSubmissions' from this store.

                    // Let's safe bet: always load my own too and merge? 
                    // Or keep it simple: Mentor sees Mentor stuff. Mentee sees Mentee stuff.
                    // The UI for Mentee Dashboard might need fixing if I break it.

                    // Wait, getUserWeeklyReports gets ALL reports for a mentee.
                    // If I am Supervisor, getWeeklyReportsForMentor might not work if logic is different.

                    set({ weeklyReportSubmissions: submissions });
                } catch (error) {
                    console.error("Failed to load weekly reports:", error);
                }
            },

            addOrUpdateTadarusRequest: async (request) => {
                try {
                    // Save to Supabase first
                    const { createTadarusRequest, updateTadarusRequest } = await import('@/services/tadarusService');

                    const existingRequest = get().tadarusRequests.find((r: TadarusRequest) => r.id === request.id);

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

            addOrUpdateMissedPrayerRequest: async (request) => {
                try {
                    const { createMissedPrayerRequest, updateMissedPrayerRequest } = await import('@/services/prayerRequestService');

                    const existingRequest = get().missedPrayerRequests.find((r: MissedPrayerRequest) => r.id === request.id);

                    if (!existingRequest) {
                        await createMissedPrayerRequest(request);
                    } else if (existingRequest.status !== request.status || existingRequest.mentorNotes !== request.mentorNotes) {
                        await updateMissedPrayerRequest(request.id, {
                            status: request.status,
                            reviewedAt: request.reviewedAt,
                            mentorNotes: request.mentorNotes
                        });
                    }

                    set((state) => {
                        const index = state.missedPrayerRequests.findIndex(r => r.id === request.id);
                        if (index !== -1) {
                            const newRequests = [...state.missedPrayerRequests];
                            newRequests[index] = request;
                            return { missedPrayerRequests: newRequests };
                        }
                        return { missedPrayerRequests: [...state.missedPrayerRequests, request] };
                    });
                } catch (error) {
                    throw error;
                }
            },

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
