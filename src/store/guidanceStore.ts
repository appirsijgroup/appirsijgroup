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
    loadTeamReadingHistoryFromSupabase: () => Promise<void>;

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
                    const { getAllTadarusRequests, getTadarusRequestsForMentor, getTadarusRequestsByMenteeIds } = await import('@/services/tadarusService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests: TadarusRequest[] = [];
                    // 🔥 FIX: Restricted fetching. Admins load ALL, others load only THEIR assigned AND team requests.
                    if (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllTadarusRequests();
                    } else if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeKaUnit || loggedInEmployee.canBeManager || loggedInEmployee.canBeDirut) {
                        // 1. Fetch by Mentor ID (for history/assigned)
                        const assignedRequests = await getTadarusRequestsForMentor(loggedInEmployee.id);

                        // 2. Fetch by current Team (so it follows the mentee if they move)
                        const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);

                        const teamRequests = await getTadarusRequestsByMenteeIds(currentMenteeIds);

                        // Merge unique
                        const requestMap = new Map<string, TadarusRequest>();
                        assignedRequests.forEach(r => requestMap.set(r.id, r));
                        teamRequests.forEach(r => requestMap.set(r.id, r));
                        requests = Array.from(requestMap.values());
                    } else {
                        // Regular user only sees their own
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
                    const { getAllMissedPrayerRequests, getMissedPrayerRequestsForMentor, getMissedPrayerRequestsForMentee, getMissedPrayerRequestsByMenteeIds } = await import('@/services/prayerRequestService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests: MissedPrayerRequest[] = [];
                    if (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllMissedPrayerRequests();
                    } else if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeKaUnit || loggedInEmployee.canBeManager || loggedInEmployee.canBeDirut) {
                        // 1. Fetch by Mentor ID
                        const assignedRequests = await getMissedPrayerRequestsForMentor(loggedInEmployee.id);

                        // 2. Fetch by current Team
                        const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);

                        const teamRequests = await getMissedPrayerRequestsByMenteeIds(currentMenteeIds);

                        // Merge unique
                        const requestMap = new Map<string, MissedPrayerRequest>();
                        assignedRequests.forEach(r => requestMap.set(r.id, r));
                        teamRequests.forEach(r => requestMap.set(r.id, r));
                        requests = Array.from(requestMap.values());
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
                    const { getMonthlyReportsForSuperiorCombined, getUserMonthlyReports, getMonthlyReportsByMenteeIds } = await import('@/services/monthlySubmissionService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    const mergedSubmissions = new Map<string, MonthlyReportSubmission>();

                    // --- PHASE 1: SNAPSHOT & OWN REPORTS (FASTEST) ---
                    // Load reports where this user is explicitly assigned as superior (Handles history accurately)
                    const rolesToFetch: Array<'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId'> = [];
                    if (loggedInEmployee.canBeMentor) rolesToFetch.push('mentorId');
                    if (loggedInEmployee.canBeSupervisor) rolesToFetch.push('supervisorId');
                    if (loggedInEmployee.canBeManager) rolesToFetch.push('managerId');
                    if (loggedInEmployee.canBeKaUnit) rolesToFetch.push('kaUnitId');

                    // Fetch my own reports and snapshot-assigned reports in parallel
                    const [snapshotResults, myReports] = await Promise.all([
                        getMonthlyReportsForSuperiorCombined(loggedInEmployee.id, rolesToFetch),
                        getUserMonthlyReports(loggedInEmployee.id)
                    ]);

                    snapshotResults.forEach(sub => mergedSubmissions.set(sub.id, sub));
                    myReports.forEach(sub => mergedSubmissions.set(sub.id, sub));

                    // 🔥 OPTIMISTIC UPDATE: Show immediate results to user
                    if (mergedSubmissions.size > 0) {
                        set({ monthlyReportSubmissions: Array.from(mergedSubmissions.values()) });
                    }

                    // --- PHASE 2: REAL-TIME MENTEE FALLBACK (ACCURACY FOR OLD DATA) ---
                    // Some old reports might have empty snapshot IDs. We find them via current mentoring relations.
                    // Instead of waiting for the massive allUsersData load, we query IDs directly.
                    const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);

                    if (currentMenteeIds.length > 0) {
                        const menteeResults = await getMonthlyReportsByMenteeIds(currentMenteeIds);

                        let hasNew = false;
                        menteeResults.forEach(sub => {
                            if (!mergedSubmissions.has(sub.id)) {
                                mergedSubmissions.set(sub.id, sub);
                                hasNew = true;
                            }
                        });

                        if (hasNew || mergedSubmissions.size === 0) {
                            set({ monthlyReportSubmissions: Array.from(mergedSubmissions.values()) });
                        }
                    } else if (mergedSubmissions.size === 0) {
                        // Ensure state is set even if empty
                        set({ monthlyReportSubmissions: [] });
                    }
                } catch (error) {
                    console.error("❌ [loadMonthlyReportSubmissions] Failed:", error);
                }
            },

            loadTeamReadingHistoryFromSupabase: async () => {
                try {
                    const { getReadingHistoryByEmployeeIds, getQuranReadingHistoryByEmployeeIds } = await import('@/services/readingHistoryService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAppDataStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    const menteeIds = await getManagedEmployeeIds(loggedInEmployee.id);
                    if (menteeIds.length === 0) return;

                    const [bookHistory, quranHistory] = await Promise.all([
                        getReadingHistoryByEmployeeIds(menteeIds),
                        getQuranReadingHistoryByEmployeeIds(menteeIds)
                    ]);

                    // Update AppDataStore's allUsersData in bulk
                    const appDataStore = useAppDataStore.getState();
                    const nextAllUsersData = { ...appDataStore.allUsersData };

                    // 🔥 OPTIMIZED MAPPING: Group histories by ID once
                    const bookHistoryMap = new Map<string, any[]>();
                    const quranHistoryMap = new Map<string, any[]>();

                    bookHistory.forEach(h => {
                        if (!bookHistoryMap.has(h.userId)) bookHistoryMap.set(h.userId, []);
                        bookHistoryMap.get(h.userId)!.push(h);
                    });

                    quranHistory.forEach((h: any) => {
                        const uid = h.employee_id || h.userId || h.employeeId;
                        if (!uid) return;
                        if (!quranHistoryMap.has(uid)) quranHistoryMap.set(uid, []);
                        quranHistoryMap.get(uid)!.push({
                            ...h,
                            userId: uid // Normalize
                        });
                    });

                    menteeIds.forEach(id => {
                        if (nextAllUsersData[id]) {
                            const employee = nextAllUsersData[id].employee;
                            nextAllUsersData[id] = {
                                ...nextAllUsersData[id],
                                employee: {
                                    ...employee,
                                    readingHistory: (bookHistoryMap.get(id) || []) as any,
                                    quranReadingHistory: (quranHistoryMap.get(id) || []) as any
                                }
                            };
                        }
                    });

                    useAppDataStore.setState({ allUsersData: nextAllUsersData });
                } catch (error) {
                    console.error("❌ [loadTeamReadingHistory] Failed:", error);
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
