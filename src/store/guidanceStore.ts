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
    updateTadarusSession: (sessionId: string, updates: Partial<TadarusSession> | ((session: TadarusSession) => TadarusSession)) => void;
    deleteTadarusSession: (sessionId: string) => void;
    
    addOrUpdateTadarusRequest: (request: TadarusRequest) => void;
    
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

            updateTadarusSession: (sessionId, updates) => set((state) => ({
                tadarusSessions: state.tadarusSessions.map(session =>
                    session.id === sessionId
                        ? typeof updates === 'function'
                            ? updates(session)
                            : { ...session, ...updates }
                        : session
                )
            })),

            deleteTadarusSession: (sessionId) => set((state) => ({
                tadarusSessions: state.tadarusSessions.filter(s => s.id !== sessionId)
            })),
            
            addOrUpdateTadarusRequest: (request) => set((state) => {
                const index = state.tadarusRequests.findIndex(r => r.id === request.id);
                 if (index !== -1) {
                    const newRequests = [...state.tadarusRequests];
                    newRequests[index] = request;
                    return { tadarusRequests: newRequests };
                }
                return { tadarusRequests: [...state.tadarusRequests, request] };
            }),

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
