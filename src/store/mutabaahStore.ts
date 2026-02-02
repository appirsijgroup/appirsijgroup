import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MutabaahLockingMode, Employee, MonthlyActivityProgress, MonthlyReportSubmission } from '@/types';
import { getAppSetting, updateAppSetting } from '@/services/appSettingsService';
import { supabase, setSupabaseSession } from '@/lib/supabase';
import {
    activateMonth as activateMonthService,
    updateMonthlyProgress as updateMonthlyProgressService
} from '@/services/monthlyActivityService';

// We need to import useAppDataStore dynamically or use getState only when needed to avoid circular dependency issues at import time
// But for type definitions we can import normally
import { useAppDataStore } from '@/store/store';

export interface MutabaahState {
    // Setting State
    mutabaahLockingMode: MutabaahLockingMode;

    // User Data State
    isCurrentMonthActivated: boolean;
    activatedMonths: string[];
    monthlyProgressData: Record<string, MonthlyActivityProgress>;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    isLoading: boolean;
    error: string | null;

    // Actions
    setMutabaahLockingMode: (mode: MutabaahLockingMode, isSuperAdmin?: boolean, userId?: string) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    subscribeToRealtime: () => () => void; // Returns unsubscribe function

    // Core Mutabaah Logic
    initializeFromEmployee: (employee: Employee | null) => Promise<void>;
    refreshData: () => Promise<void>;
    activateMonth: (monthKey: string) => Promise<boolean>;
    updateMonthlyProgress: (monthKey: string, progress: MonthlyActivityProgress) => Promise<boolean>;
    checkCurrentMonthActivation: () => void;
    setMonthlyReportSubmissions: (submissions: MonthlyReportSubmission[]) => void;
}

export const useMutabaahStore = create<MutabaahState>()(
    persist(
        (set, get) => ({
            // Initial State
            mutabaahLockingMode: 'weekly',
            isCurrentMonthActivated: false,
            activatedMonths: [],
            monthlyProgressData: {},
            monthlyReportSubmissions: [],
            isLoading: false,
            error: null,

            // --- SETTINGS MANAGEMENT ---

            loadFromSupabase: async () => {
                try {
                    const value = await getAppSetting('mutabaah_locking_mode');
                    if (value && (value === 'weekly' || value === 'monthly')) {
                        set({ mutabaahLockingMode: value as MutabaahLockingMode });
                    }
                } catch (error) {
                    console.error('Error loading mutabaah settings:', error);
                }
            },

            subscribeToRealtime: () => {
                const channel = supabase
                    .channel('mutabaah-settings-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'app_settings',
                            filter: 'key=eq.mutabaah_locking_mode'
                        },
                        async (payload) => {
                            const newValue = payload.new.value as MutabaahLockingMode;
                            if (newValue === 'weekly' || newValue === 'monthly') {
                                set({ mutabaahLockingMode: newValue });
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            },

            setMutabaahLockingMode: async (mode, isSuperAdmin = false, userId) => {
                set({ mutabaahLockingMode: mode });
                if (isSuperAdmin) {
                    try {
                        await updateAppSetting('mutabaah_locking_mode', mode, userId);
                    } catch (error) {
                        console.error('Error updating mutabaah mode:', error);
                    }
                }
            },

            // --- USER DATA MANAGEMENT ---

            initializeFromEmployee: async (employee: Employee | null) => {
                if (!employee || !employee.id) {
                    set({
                        isCurrentMonthActivated: false,
                        activatedMonths: [],
                        monthlyProgressData: {},
                        error: null
                    });
                    return;
                }

                // Initialize Supabase session token if available in cookies
                // This is a side-effect, but necessary for subsequent calls
                const getToken = () => {
                    if (typeof document === 'undefined') return null;
                    const match = document.cookie.match(new RegExp('(^| )session=([^;]+)'));
                    return match ? decodeURIComponent(match[2]) : null;
                };
                const token = getToken();
                if (token) await setSupabaseSession(token);

                const months = employee.activatedMonths || employee.activated_months || [];
                const activities = employee.monthlyActivities || employee.monthly_activities || {};

                // Determine current month status
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isActivated = months.includes(currentMonthKey);

                set({
                    activatedMonths: months,
                    monthlyProgressData: activities,
                    isCurrentMonthActivated: isActivated,
                    error: null
                });
            },

            checkCurrentMonthActivation: () => {
                const { activatedMonths } = get();
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isActivated = activatedMonths.includes(currentMonthKey);

                if (isActivated !== get().isCurrentMonthActivated) {
                    set({ isCurrentMonthActivated: isActivated });
                }
            },

            activateMonth: async (monthKey: string) => {
                // Get employee ID directly from the main store to avoid circular dependency issues or stale props
                const { loggedInEmployee } = useAppDataStore.getState();

                if (!loggedInEmployee?.id) {
                    set({ error: 'User not logged in' });
                    return false;
                }

                const { activatedMonths } = get();

                // Check if already activated
                if (activatedMonths.includes(monthKey)) return true;

                // Validate month (cannot activate past months)
                const now = new Date();
                const [year, month] = monthKey.split('-').map(Number);
                const monthDate = new Date(year, month - 1);

                // Allow current month activation
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                if (monthDate < new Date(now.getFullYear(), now.getMonth()) && monthKey !== currentMonthKey) {
                    set({ error: 'Tidak dapat mengaktifkan bulan yang telah berlalu' });
                    return false;
                }

                try {
                    const success = await activateMonthService(loggedInEmployee.id, monthKey);

                    if (success) {
                        const newActivatedMonths = [...activatedMonths, monthKey];
                        const isCurrentActivated = monthKey === currentMonthKey;

                        set(state => ({
                            activatedMonths: newActivatedMonths,
                            isCurrentMonthActivated: isCurrentActivated ? true : state.isCurrentMonthActivated,
                            error: null
                        }));

                        // Sync back to main AppDataStore to create "Single Source of Truth"
                        useAppDataStore.setState(state => {
                            if (!state.loggedInEmployee || state.loggedInEmployee.id !== loggedInEmployee.id) return state;
                            return {
                                loggedInEmployee: {
                                    ...state.loggedInEmployee,
                                    activatedMonths: newActivatedMonths,
                                    activated_months: newActivatedMonths
                                },
                                allUsersData: {
                                    ...state.allUsersData,
                                    [loggedInEmployee.id]: {
                                        ...state.allUsersData[loggedInEmployee.id],
                                        employee: {
                                            ...state.allUsersData[loggedInEmployee.id].employee,
                                            activatedMonths: newActivatedMonths,
                                            activated_months: newActivatedMonths
                                        }
                                    }
                                }
                            };
                        });

                        return true;
                    } else {
                        set({ error: 'Gagal mengaktifkan bulan di server' });
                        return false;
                    }
                } catch (err) {
                    set({ error: 'Terjadi kesalahan sistem saat aktivasi' });
                    return false;
                }
            },

            updateMonthlyProgress: async (monthKey: string, progress: MonthlyActivityProgress) => {
                const { loggedInEmployee } = useAppDataStore.getState();
                if (!loggedInEmployee?.id) return false;

                try {
                    const success = await updateMonthlyProgressService(loggedInEmployee.id, monthKey, progress);

                    if (success) {
                        const currentData = get().monthlyProgressData;
                        const newData = { ...currentData, [monthKey]: progress };

                        set({ monthlyProgressData: newData });

                        // Sync back to AppDataStore
                        useAppDataStore.setState(state => {
                            if (!state.loggedInEmployee || state.loggedInEmployee.id !== loggedInEmployee.id) return state;
                            return {
                                loggedInEmployee: {
                                    ...state.loggedInEmployee,
                                    monthlyActivities: newData
                                },
                                allUsersData: {
                                    ...state.allUsersData,
                                    [loggedInEmployee.id]: {
                                        ...state.allUsersData[loggedInEmployee.id],
                                        employee: {
                                            ...state.allUsersData[loggedInEmployee.id].employee,
                                            monthlyActivities: newData
                                        }
                                    }
                                }
                            };
                        });

                        return true;
                    } else {
                        set({ error: 'Gagal menyimpan progres' });
                        return false;
                    }
                } catch (err) {
                    set({ error: 'Terjadi kesalahan saat menyimpan progres' });
                    return false;
                }
            },

            refreshData: async () => {
                const { loggedInEmployee } = useAppDataStore.getState();
                if (!loggedInEmployee?.id) return;

                set({ isLoading: true });

                try {
                    // Start with known local data
                    const currentActivities = get().monthlyProgressData || {};
                    const updatedActivities: Record<string, any> = { ...currentActivities };

                    // 1. Load Monthly Report Aggregates
                    try {
                        const { convertMonthlyReportsToActivities } = await import('@/services/monthlyReportService');
                        const monthlyReportsActivities = await convertMonthlyReportsToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, monthlyReportsActivities);
                    } catch (e) { }

                    // 2. Load Tadarus Sessions
                    try {
                        const { convertTadarusSessionsToActivities } = await import('@/services/tadarusService');
                        const tadarusActivities = await convertTadarusSessionsToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, tadarusActivities);
                    } catch (e) { }

                    // 3. Load Team Attendance
                    try {
                        const { convertTeamAttendanceToActivities } = await import('@/services/teamAttendanceService');
                        const teamActivities = await convertTeamAttendanceToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, teamActivities);
                    } catch (e) { }

                    // 4. Load Scheduled Activities
                    try {
                        const { convertScheduledActivitiesToActivities } = await import('@/services/scheduledActivityService');
                        const scheduledActivities = await convertScheduledActivitiesToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, scheduledActivities);
                    } catch (e) { }

                    // 5. Load Monthly Report Submissions Status
                    try {
                        const { getUserMonthlyReports } = await import('@/services/monthlySubmissionService');
                        const submissions = await getUserMonthlyReports(loggedInEmployee.id);
                        set({ monthlyReportSubmissions: submissions });
                    } catch (e) { }

                    // Apply updates
                    set({ monthlyProgressData: updatedActivities, isLoading: false });

                } catch (err) {
                    set({ error: 'Gagal menyegarkan data', isLoading: false });
                }
            },

            setMonthlyReportSubmissions: (submissions) => set({ monthlyReportSubmissions: submissions })
        }),
        {
            name: 'mutabaah-storage',
            storage: createJSONStorage(() => localStorage),
            version: 2, // Incremented version for migration
            migrate: (persistedState: any, version: number) => {
                // Return default state if version mismatch to ensure clean slate with new structure
                if (version < 2) {
                    return {
                        mutabaahLockingMode: 'weekly',
                        isCurrentMonthActivated: false,
                        activatedMonths: [],
                        monthlyProgressData: {},
                        monthlyReportSubmissions: [],
                        isLoading: false,
                        error: null,
                    } as unknown as MutabaahState;
                }
                return persistedState as MutabaahState;
            },
        }
    )
);

// Helper for deep merging activity objects
function _deepMerge(target: any, source: any) {
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            _deepMerge(target[key], source[key]);
        } else {
            Object.assign(target, { [key]: source[key] });
        }
    });
}
