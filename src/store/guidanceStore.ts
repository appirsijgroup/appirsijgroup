import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MonthlyReportSubmission, TadarusSession, TadarusRequest, MissedPrayerRequest, MenteeTarget } from '@/types';
import { useAppDataStore } from './store';

interface GuidanceState {
    monthlyReportSubmissions: MonthlyReportSubmission[];
    tadarusSessions: TadarusSession[];
    tadarusRequests: TadarusRequest[];
    missedPrayerRequests: MissedPrayerRequest[];
    menteeTargets: MenteeTarget[];

    // Actions
    addOrUpdateMonthlyReportSubmission: (submission: MonthlyReportSubmission) => void;

    addTadarusSessions: (sessions: TadarusSession[]) => void;
    updateTadarusSession: (sessionId: string, updates: Partial<TadarusSession> | ((session: TadarusSession) => TadarusSession)) => Promise<void>;
    deleteTadarusSession: (sessionId: string) => Promise<void>;
    loadTadarusSessionsFromSupabase: () => Promise<void>;
    loadTadarusRequestsFromSupabase: () => Promise<void>;
    loadMissedPrayerRequestsFromSupabase: () => Promise<void>;
    loadMonthlyReportSubmissionsFromSupabase: () => Promise<void>;

    addOrUpdateTadarusRequest: (request: TadarusRequest) => Promise<void>;

    addOrUpdateMissedPrayerRequest: (request: MissedPrayerRequest) => void;

    addMenteeTarget: (target: MenteeTarget) => void;
    updateMenteeTarget: (targetId: string, updates: Partial<MenteeTarget>) => void;
    deleteMenteeTarget: (targetId: string) => void;
}

export const useGuidanceStore = create<GuidanceState>()(
    persist(
        (set, get) => ({
            monthlyReportSubmissions: [],
            tadarusSessions: [],
            tadarusRequests: [],
            missedPrayerRequests: [],
            menteeTargets: [],

            addOrUpdateMonthlyReportSubmission: (submission) => set((state) => {
                const index = state.monthlyReportSubmissions.findIndex(s => s.id === submission.id);
                if (index !== -1) {
                    const newSubmissions = [...state.monthlyReportSubmissions];
                    newSubmissions[index] = submission;
                    return { monthlyReportSubmissions: newSubmissions };
                }
                return { monthlyReportSubmissions: [...state.monthlyReportSubmissions, submission] };
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

                    if (!loggedInEmployee) return;

                    let requests;
                    // Broaden: If user has ANY superior role, load all to filter locally (safest)
                    if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeKaUnit || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllTadarusRequests();
                    } else {
                        // Regular user only sees their own
                        const { searchParams } = new URL(window.location.href); // Fallback: the API supports menteeId
                        const response = await fetch(`/api/manual-requests/tadarus?menteeId=${loggedInEmployee.id}`);
                        const result = await response.json();
                        requests = result.data || [];
                    }
                    set({ tadarusRequests: requests });
                } catch (error) {
                    throw error;
                }
            },

            loadMissedPrayerRequestsFromSupabase: async () => {
                try {
                    const { getAllMissedPrayerRequests, getMissedPrayerRequestsForMentor, getMissedPrayerRequestsForMentee } = await import('@/services/prayerRequestService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests;
                    if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeKaUnit || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllMissedPrayerRequests();
                    } else {
                        requests = await getMissedPrayerRequestsForMentee(loggedInEmployee.id);
                    }
                    set({ missedPrayerRequests: requests });
                } catch (error) {
                    throw error;
                }
            },

            loadMonthlyReportSubmissionsFromSupabase: async () => {
                try {
                    const { getMonthlyReportsForSuperior, getUserMonthlyReports, getMonthlyReportsByMenteeIds } = await import('@/services/monthlySubmissionService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;
                    const allUsersData = useAppDataStore.getState().allUsersData;

                    if (!loggedInEmployee) return;

                    let submissions: MonthlyReportSubmission[] = [];
                    const mergedSubmissions = new Map<string, MonthlyReportSubmission>();

                    // Aggregation for superiors
                    if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeManager || loggedInEmployee.canBeKaUnit || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {

                        // 1. Snapshot Search (Reports where I was officially assigned at the time)
                        const rolesToFetch: Array<'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId'> = [];
                        if (loggedInEmployee.canBeMentor) rolesToFetch.push('mentorId');
                        if (loggedInEmployee.canBeSupervisor) rolesToFetch.push('supervisorId');
                        if (loggedInEmployee.canBeManager) rolesToFetch.push('managerId');
                        if (loggedInEmployee.canBeKaUnit) rolesToFetch.push('kaUnitId');

                        const snapshotResults = await Promise.all(rolesToFetch.map(role => getMonthlyReportsForSuperior(loggedInEmployee.id, role)));
                        snapshotResults.flat().forEach(sub => mergedSubmissions.set(sub.id, sub));

                        // 2. Real-time Mentee Search (Fallback for "Data Lama" missing snapshots)
                        const currentMenteeIds: string[] = [];
                        Object.values(allUsersData).forEach(u => {
                            const emp = u.employee;
                            if (loggedInEmployee.canBeMentor && emp.mentorId === loggedInEmployee.id) currentMenteeIds.push(emp.id);
                            if (loggedInEmployee.canBeSupervisor && emp.supervisorId === loggedInEmployee.id) currentMenteeIds.push(emp.id);
                            if (loggedInEmployee.canBeManager && emp.managerId === loggedInEmployee.id) currentMenteeIds.push(emp.id);
                            if (loggedInEmployee.canBeKaUnit && emp.kaUnitId === loggedInEmployee.id) currentMenteeIds.push(emp.id);
                        });

                        if (currentMenteeIds.length > 0) {
                            const menteeResults = await getMonthlyReportsByMenteeIds(currentMenteeIds);
                            menteeResults.forEach(sub => mergedSubmissions.set(sub.id, sub));
                        }

                        // 3. Admin view (Optional: allow admins to see ALL if needed, but here we stick to assignments)
                    }

                    // If mentee also load my own
                    if (loggedInEmployee.role === 'user') {
                        const myReports = await getUserMonthlyReports(loggedInEmployee.id);
                        myReports.forEach(s => mergedSubmissions.set(s.id, s));
                    }

                    submissions = Array.from(mergedSubmissions.values());
                    set({ monthlyReportSubmissions: submissions });
                } catch (error) {
                    console.error("Failed to load monthly reports:", error);
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
