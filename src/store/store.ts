

import { create } from 'zustand';
import React from 'react';
import { type View, type Toast, type Notification, Ayah, SurahDetail, DailyPrayer, Employee, Attendance, Hospital } from '@/types';
import { CheckIcon, XIcon } from '@/components/Icons';
import { type PrayerTimesData } from '@/services/prayerTimeService';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { getAllHospitals } from '@/services/hospitalService';
import { timeValidationService } from '@/services/timeValidationService';

// Initialize time validation service when the store is loaded
timeValidationService.startPeriodicSync();

// --- AppDataStore ---

type UserData = { employee: Employee; attendance: Attendance; history: Record<string, Attendance> };

export interface AppDataState {
    allUsersData: Record<string, UserData>;
    loggedInEmployee: Employee | null;
    hospitalsData: Record<string, Hospital>;
    isHydrated: boolean;
    isLoggingOut: boolean; // Flag to prevent loading flash during logout
    isLoadingEmployees: boolean; // 🔥 NEW: Flag to prevent concurrent employee loading
    activityStatsRefreshCounter: number; // 🔥 NEW: Counter untuk trigger refresh activity stats di Dashboard

    setAllUsersData: (fn: (state: AppDataState['allUsersData']) => AppDataState['allUsersData']) => void;
    setLoggedInEmployee: (employee: Employee | null) => void;
    setHospitalsData: (hospitals: Record<string, Hospital>) => void;
    setHydrated: (isHydrated: boolean) => void;
    markAnnouncementAsRead: () => Promise<void>;
    loadLoggedInEmployee: () => Promise<void>;
    loadAllEmployees: (limit?: number) => Promise<void>;
    loadPaginatedEmployees: (page?: number, limit?: number, search?: string, role?: string, isActive?: boolean) => Promise<void>;
    paginatedEmployees: Employee[];
    paginationInfo: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } | null;
    loadHospitals: () => Promise<void>;
    logoutEmployee: () => void;
    refreshActivityStats: () => void; // 🔥 NEW: Trigger refresh activity stats setelah attendance submission
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
    allUsersData: {},
    loggedInEmployee: null,
    hospitalsData: {},
    isHydrated: false,
    isLoggingOut: false, // Start not logging out
    isLoadingEmployees: false, // 🔥 NEW: Flag to prevent concurrent employee loading
    activityStatsRefreshCounter: 0, // 🔥 NEW: Counter untuk trigger refresh
    paginatedEmployees: [],
    paginationInfo: null,

    setAllUsersData: (fn) => set(state => ({ allUsersData: fn(state.allUsersData) })),
    setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee }),
    setHospitalsData: (hospitals) => set({ hospitalsData: hospitals }),
    setHydrated: (isHydrated) => set({ isHydrated }),
    refreshActivityStats: () => set((state) => ({ activityStatsRefreshCounter: state.activityStatsRefreshCounter + 1 })), // 🔥 NEW: Increment counter

    // 🔥 NEW: Load logged-in employee from session
    // ⚡ SIMPLIFIED: Single source of truth - session cookie (JWT)
    loadLoggedInEmployee: async () => {
        try {
            // Initialize time validation service
            await timeValidationService.syncWithServerTime();

            // Call API to verify session and get user data
            const response = await fetch('/api/auth/me', {
                credentials: 'include', // Important: include cookies
            });

            if (response.ok) {
                const data = await response.json();
                const employee = data.employee;

                // 🔥 DEBUG: Log employee data yang diterima dari server
                console.log('🔍 [loadLoggedInEmployee] Employee data received:', {
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    email: employee.email,
                    hasActivatedMonths: !!employee.activatedMonths,
                    activatedMonthsValue: employee.activatedMonths,
                    hasActivatedMonthsSnake: !!employee.activated_months,
                    activatedMonthsSnakeValue: employee.activated_months,
                    allKeys: Object.keys(employee)
                });

                if (employee) {
                    // Update localStorage for client-side convenience
                    localStorage.setItem('loggedInUserId', employee.id);

                    set(state => ({
                        loggedInEmployee: employee,
                        allUsersData: {
                            ...state.allUsersData,
                            [employee.id]: {
                                employee,
                                attendance: state.allUsersData[employee.id]?.attendance || {},
                                history: state.allUsersData[employee.id]?.history || {}
                            }
                        },
                        isHydrated: true
                    }));


                    // 🚀 OPTIMIZATION: Automatically load all employees ONLY for managers/admins
                    // This ensures Mentors, Supervisors, etc. have the data they need for their team
                    const hasManagementRole =
                        employee.role === 'admin' ||
                        employee.role === 'super-admin' ||
                        employee.canBeMentor ||
                        employee.canBeSupervisor ||
                        employee.canBeKaUnit ||
                        employee.canBeDirut;

                    if (hasManagementRole) {
                        console.log('📋 [AppDataStore] User has management role, loading first page of employees...');
                        // Use a short delay to not block the main UI render
                        setTimeout(() => {
                            get().loadPaginatedEmployees(1, 15).catch(err => console.error('Failed to load paginated employees:', err));
                        }, 500);
                    }

                } else {
                    // No employee data in response
                    throw new Error('No employee data in response');
                }
            } else {
                // No valid session - not logged in
                localStorage.removeItem('loggedInUserId');
                set({ loggedInEmployee: null, isHydrated: true });

                // Redirect to login page ONLY if not already there to prevent loops
                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login' && currentPath !== '/login/') {
                        window.location.href = '/login';
                    }
                }
            }
        } catch (error) {
            // On error, clear state and mark as hydrated
            localStorage.removeItem('loggedInUserId');
            set({ loggedInEmployee: null, isHydrated: true });
            // Redirect to login page
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    },

    // Logout function to clear session
    logoutEmployee: async () => {
        // 🔥 GUARD: Prevent multiple concurrent logout calls
        if (get().isLoggingOut) return;

        // Set flag to prevent loading flash
        set({ isLoggingOut: true });

        // Call logout API to clear server session
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }

        // Clear all client-side storage related to session
        if (typeof window !== 'undefined') {
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('lastVisitedPage');
            // document.cookie removal is a fallback, API should handle it
            document.cookie = 'session=; path=/; max-age=0; SameSite=Lax';
            document.cookie = 'loggedInUserId=; path=/; max-age=0; SameSite=Lax';

            // Clear state but keep hydrated to prevent loading flash before redirect
            set({
                loggedInEmployee: null,
                isHydrated: true,
                isLoggingOut: true
            });

            // Redirect to login page immediately ONLY if not already there
            // Use window.location.origin to be extra safe with the check
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/login/') {
                window.location.href = '/login';
            } else {
                set({ isLoggingOut: false });
            }
        }
    },

    // Load hospitals from Supabase
    loadHospitals: async () => {
        try {
            const hospitals = await getAllHospitals();

            // Convert array to record
            const hospitalsRecord: Record<string, Hospital> = {};
            hospitals.forEach(hospital => {
                hospitalsRecord[hospital.id] = hospital;
            });

            set({ hospitalsData: hospitalsRecord });
        } catch (error) {
        }
    },

    // Load all employees from Supabase
    loadAllEmployees: async (limit?: number) => {
        // 🔥 NEW: Prevent concurrent loading
        if (get().isLoadingEmployees) {
            return;
        }

        try {
            set({ isLoadingEmployees: true });

            // 1. Fetch all basic employee data
            const { getAllEmployees } = await import('@/services/employeeService');
            const allEmployees = await getAllEmployees(limit);

            // 2. Fetch all attendance records in BULK
            const { getAllAttendanceRecords, supabase } = await import('@/services/attendanceService');
            const [allAttendanceRecords, teamRecordsRes, activityRecordsRes] = await Promise.all([
                getAllAttendanceRecords(),
                supabase.from('team_attendance_records').select('*'),
                supabase.from('activity_attendance').select('*')
            ]);

            const extraTeamRecords = teamRecordsRes.data || [];
            const extraActivityRecords = activityRecordsRes.data || [];

            // 3. Fetch all monthly activities in BULK (Admin only API)
            let allMonthlyActivities: Record<string, any> = {};
            try {
                const response = await fetch('/api/admin/bulk-monthly-activities', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    allMonthlyActivities = data.allActivities || {};
                }
            } catch (error) {
                console.error('⚠️ [loadAllEmployees] Failed to fetch bulk monthly activities:', error);
            }

            const newData: Record<string, UserData> = {};
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

            // Helper to merge record into user data (attendance or history)
            const mergeRecordToUser = (userId: string, entityId: string, data: any) => {
                if (!newData[userId]) return; // Should not happen if filtered by employee list, but safe guard pending loop

                const timestamp = data.timestamp;
                if (!timestamp) return;

                const recordDate = new Date(timestamp);
                const recordDateStr = recordDate.toLocaleDateString('en-CA');

                if (recordDateStr === todayStr) {
                    newData[userId].attendance[entityId] = data;
                } else {
                    if (!newData[userId].history[recordDateStr]) {
                        newData[userId].history[recordDateStr] = {};
                    }
                    newData[userId].history[recordDateStr][entityId] = data;
                }
            };

            // Initialize User Data Structure
            for (const emp of allEmployees) {
                // Attach monthly activities to employee object
                const empWithActivities = {
                    ...emp,
                    monthlyActivities: allMonthlyActivities[emp.id] || {}
                };

                newData[emp.id] = {
                    employee: empWithActivities,
                    attendance: {},
                    history: {} // Start empty, fill below
                };
            }

            // 1. Process Sholat Attendance (attendance_records)
            for (const emp of allEmployees) {
                const records = allAttendanceRecords[emp.id] || {};
                Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                    if (record && record.status && record.timestamp) {
                        const data = {
                            status: record.status,
                            reason: record.reason || null,
                            timestamp: new Date(record.timestamp).getTime(),
                            submitted: true,
                            isLateEntry: record.is_late_entry || false
                        };
                        mergeRecordToUser(emp.id, entityId, data);
                    }
                });
            }

            // 2. Process Team Attendance (KIE, Doa Bersama)
            extraTeamRecords.forEach((record: any) => {
                if (newData[record.user_id]) {
                    // 🔥 FIX: Use session_type (e.g. 'KIE') as entityId so it matches Activity Name
                    // AdminDashboard now allows unknown IDs if type='activity', and uses the ID as fallback name.
                    // So providing "KIE" as ID will make it show "KIE".
                    const entityId = record.session_type || record.session_id || 'Kegiatan Tim';

                    const data = {
                        status: 'hadir',
                        reason: null,
                        timestamp: new Date(record.attended_at).getTime(),
                        submitted: true,
                        isLateEntry: false
                    };

                    mergeRecordToUser(record.user_id, entityId, data);
                }
            });

            // 3. Process Activity Attendance (Manual/General)
            extraActivityRecords.forEach((record: any) => {
                if (newData[record.employee_id]) {
                    const data = {
                        status: record.status,
                        reason: record.reason || null,
                        timestamp: new Date(record.submitted_at || record.created_at).getTime(),
                        submitted: true,
                        isLateEntry: record.is_late_entry || false
                    };
                    mergeRecordToUser(record.employee_id, record.activity_id, data);
                }
            });

            set({ allUsersData: newData, isLoadingEmployees: false });
        } catch (error) {
            console.error('❌ [loadAllEmployees] Error:', error);
            set({ isLoadingEmployees: false });
            throw error;
        }
    },

    // 🔥 NEW: Load employees with pagination
    loadPaginatedEmployees: async (page = 1, limit = 15, search = '', role = '', isActive) => {
        if (get().isLoadingEmployees) return;

        try {
            set({ isLoadingEmployees: true });
            const { getEmployeesPaginated } = await import('@/services/employeeService');
            const { employees, pagination } = await getEmployeesPaginated(page, limit, search, role, isActive);

            set({
                paginatedEmployees: employees,
                paginationInfo: pagination,
                isLoadingEmployees: false
            });
        } catch (error) {
            console.error('❌ [loadPaginatedEmployees] Error:', error);
            set({ isLoadingEmployees: false });
            throw error;
        }
    },

    markAnnouncementAsRead: async () => {
        const { loggedInEmployee, allUsersData } = get();
        if (!loggedInEmployee) return;

        const now = Date.now();
        const updatedEmployee = {
            ...loggedInEmployee,
            lastAnnouncementReadTimestamp: now
        };

        // 1. Update state immediately for UX
        set({
            loggedInEmployee: updatedEmployee,
            allUsersData: {
                ...allUsersData,
                [loggedInEmployee.id]: {
                    ...allUsersData[loggedInEmployee.id],
                    employee: updatedEmployee
                }
            }
        });

        // 2. Persist to Supabase
        try {
            await updateEmployee(loggedInEmployee.id, {
                lastAnnouncementReadTimestamp: now
            });
        } catch (error) {
            console.error('❌ [markAnnouncementAsRead] Error persisting to Supabase:', error);
            // Optionally rollback state if needed, but for unread status it's not critical
        }
    },
}));

// --- UIStore ---

export interface ShareModalState {
    isOpen: boolean;
    type: 'quran' | 'doa' | null;
    content: { ayah: Ayah; surah: SurahDetail } | DailyPrayer | null;
}

interface UIState {
    activeView: View;
    setActiveView: (view: View) => void;

    isMenuOpen: boolean;
    setIsMenuOpen: (isOpen: boolean) => void;
    toggleMenu: () => void;

    modalState: {
        isOpen: boolean;
        entityId: string | null;
        entityName: string | null;
    };
    openModal: (entityId: string, entityName: string) => void;
    closeModal: () => void;

    toasts: Toast[];
    addToast: (message: string, type: 'success' | 'error') => void;
    removeToast: (id: number) => void;

    isMentorOpen: boolean;
    setIsMentorOpen: (isOpen: boolean) => void;

    isNotificationPanelOpen: boolean;
    setIsNotificationPanelOpen: (isOpen: boolean) => void;

    showActivationModal: boolean;
    setShowActivationModal: (show: boolean) => void;

    lateEntryPrayerId: string | null;
    setLateEntryPrayerId: (id: string | null) => void;

    shareModalState: ShareModalState;
    openShareModal: (type: 'quran' | 'doa', content: any) => void;
    closeShareModal: () => void;

    // State for deep linking and navigation targets
    goToAyah: { surah: number; ayah: number } | null;
    setGoToAyah: (target: { surah: number; ayah: number } | null) => void;
    clearGoToAyah: () => void;

    guideSearchQuery: string;
    guideInitialTab: 'panduan' | 'doa';
    setGuideSearch: (query: string, tab: 'panduan' | 'doa') => void;
    clearSearchQuery: () => void;

    deepLink: Notification['linkTo'] | null;
    setDeepLink: (link: Notification['linkTo'] | null) => void;
    initialTab?: string;
    onClearDeepLink: () => void;

    // Migrated state from App.tsx
    prayerTimes: PrayerTimesData | null;
    prayerTimesLoading: boolean;
    locationStatus: string | null;
    activePrayerId: string | null;
    currentTime: Date;
    userLocation: { latitude: number; longitude: number } | null; // <-- Add this
    setPrayerTimes: (times: PrayerTimesData | null) => void;
    setPrayerTimesLoading: (loading: boolean) => void;
    setLocationStatus: (status: string | null) => void;
    setActivePrayerId: (id: string | null) => void;
    setCurrentTime: (time: Date) => void;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void; // <-- Add this
}

export const useUIStore = create<UIState>((set, get) => ({
    activeView: 'dashboard-saya',
    setActiveView: (view) => set({ activeView: view }),

    isMenuOpen: false,
    setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
    toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),

    modalState: { isOpen: false, entityId: null, entityName: null },
    openModal: (entityId, entityName) => set({ modalState: { isOpen: true, entityId, entityName } }),
    closeModal: () => set({ modalState: { isOpen: false, entityId: null, entityName: null } }),

    toasts: [],
    addToast: (message, type) => {
        const id = Date.now();
        const title = type === 'success' ? 'Berhasil' : 'Gagal';
        const icon = type === 'success'
            ? React.createElement(CheckIcon, { className: "h-5 w-5 text-teal-300" })
            : React.createElement(XIcon, { className: "h-5 w-5 text-red-400" });

        set(state => ({ toasts: [...state.toasts, { id, title, message, type, icon }] }));
        setTimeout(() => get().removeToast(id), 5000);
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

    isMentorOpen: false,
    setIsMentorOpen: (isOpen) => set({ isMentorOpen: isOpen }),

    isNotificationPanelOpen: false,
    setIsNotificationPanelOpen: (isOpen) => set({ isNotificationPanelOpen: isOpen }),

    showActivationModal: false,
    setShowActivationModal: (show) => set({ showActivationModal: show }),

    lateEntryPrayerId: null,
    setLateEntryPrayerId: (id) => set({ lateEntryPrayerId: id }),

    shareModalState: {
        isOpen: false,
        type: null,
        content: null,
    },
    openShareModal: (type, content) => set({ shareModalState: { isOpen: true, type, content } }),
    closeShareModal: () => set({ shareModalState: { isOpen: false, type: null, content: null } }),

    goToAyah: null,
    setGoToAyah: (target) => set({ goToAyah: target }),
    clearGoToAyah: () => set({ goToAyah: null }),

    guideSearchQuery: '',
    guideInitialTab: 'panduan',
    setGuideSearch: (query, tab) => set({ activeView: 'panduan-doa', guideSearchQuery: query, guideInitialTab: tab }),
    clearSearchQuery: () => set({ guideSearchQuery: '' }),

    deepLink: null,
    setDeepLink: (link) => {
        if (link?.tab) {
            set({ deepLink: link, initialTab: link.tab });
        } else {
            set({ deepLink: link, initialTab: undefined });
        }
    },
    initialTab: undefined,
    onClearDeepLink: () => set({ deepLink: null, initialTab: undefined }),

    // Migrated State
    prayerTimes: null,
    prayerTimesLoading: true,
    locationStatus: null,
    activePrayerId: null,
    currentTime: timeValidationService.getCorrectedTime(),
    userLocation: null,

    // Migrated Actions
    setPrayerTimes: (times) => set({ prayerTimes: times }),
    setPrayerTimesLoading: (loading) => set({ prayerTimesLoading: loading }),
    setLocationStatus: (status) => set({ locationStatus: status }),
    setActivePrayerId: (id) => set({ activePrayerId: id }),
    setCurrentTime: (time) => {
        // Validate time before setting
        const timeValidation = timeValidationService.validateTime();
        if (!timeValidation.isValid) {
            console.warn('System time appears to be manipulated. Using corrected time instead.');
            set({ currentTime: timeValidation.correctedTime });
        } else {
            set({ currentTime: time });
        }
    },
    setUserLocation: (location) => set({ userLocation: location }),
}));

// Set up interval to update currentTime with corrected time every second
if (typeof window !== 'undefined') {
    setInterval(() => {
        // Update the time to the corrected time
        const correctedTime = timeValidationService.getCorrectedTime();
        useUIStore.getState().setCurrentTime(correctedTime);
    }, 1000);
}

export * from './activityStore';
export * from './announcementStore';
export * from './auditLogStore';
export * from './bookmarkStore';
export * from './dailyActivitiesStore';
export * from './guidanceStore';
export * from './hospitalStore';
export * from './jobStructureStore';
export * from './mutabaahStore';
export * from './notificationStore';
export * from './sunnahIbadahStore';
