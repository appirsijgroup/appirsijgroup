

import { create } from 'zustand';
import React from 'react';
import { type View, type Toast, type Notification, Ayah, SurahDetail, DailyPrayer, Employee, Attendance, Hospital } from '@/types';
import { CheckIcon, XIcon } from '@/components/Icons';
import { type PrayerTimesData } from '@/services/prayerTimeService';
import { getEmployeeById } from '@/services/employeeService';
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
    markAnnouncementAsRead: () => void;
    loadLoggedInEmployee: () => Promise<void>;
    loadAllEmployees: () => Promise<void>;
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

                    set({
                        loggedInEmployee: employee,
                        allUsersData: {
                            [employee.id]: {
                                employee,
                                attendance: {},
                                history: {}
                            }
                        },
                        isHydrated: true
                    });


                    // 🚀 OPTIMIZATION: Load all employees in background after logged-in user is ready
                    // This prevents blocking the initial render but ensures data is ready for navigation
                    setTimeout(async () => {
                        try {
                            const { getAllEmployees } = await import('@/services/employeeService');
                            const allEmployees = await getAllEmployees();

                            // Update allUsersData with all employees
                            set((state) => {
                                const newData = { ...state.allUsersData };
                                allEmployees.forEach((emp) => {
                                    if (!newData[emp.id]) {
                                        newData[emp.id] = {
                                            employee: emp,
                                            attendance: {},
                                            history: {}
                                        };
                                    }
                                });
                                return { allUsersData: newData };
                            });
                        } catch (error) {
                            // Don't throw - background load failure is OK, page will handle it
                        }
                    }, 100); // Small delay to not block initial render

                } else {
                    // No employee data in response
                    throw new Error('No employee data in response');
                }
            } else {
                // No valid session - not logged in
                localStorage.removeItem('loggedInUserId');
                set({ loggedInEmployee: null, isHydrated: true });
                // Redirect to login page
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
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
        // Set flag to prevent loading flash
        set({ isLoggingOut: true });

        // Call logout API to clear server session if needed
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            // Ignore logout API errors - proceed with client-side logout
        }

        // Clear client-side storage
        localStorage.removeItem('loggedInUserId');
        document.cookie = 'loggedInUserId=; path=/; max-age=0; SameSite=Lax';

        // Clear state but keep hydrated to prevent loading flash
        set({
            loggedInEmployee: null,
            isHydrated: true,  // Keep hydrated to prevent loading screen
            isLoggingOut: false // Reset flag after clearing
        });

        // Redirect to login page immediately
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
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
    loadAllEmployees: async () => {
        // 🔥 NEW: Prevent concurrent loading
        if (get().isLoadingEmployees) {
            return;
        }

        try {
            set({ isLoadingEmployees: true });
            const { getAllEmployees } = await import('@/services/employeeService');
            const allEmployees = await getAllEmployees();

            // 🔥 DEBUG: Log sample data
            if (process.env.NODE_ENV === "development") {
            }

            // Load attendance records for all employees
            const { getEmployeeAttendance } = await import('@/services/attendanceService');

            const newData: Record<string, UserData> = {};

            for (const emp of allEmployees) {
                let attendanceData: Attendance = {};
                try {
                    const records = await getEmployeeAttendance(emp.id);
                    Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                        if (record && record.status) {
                            attendanceData[entityId] = {
                                status: record.status,
                                reason: record.reason || null,
                                timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                submitted: true,
                                isLateEntry: record.is_late_entry || false
                            };
                        }
                    });
                } catch (error) {
                    attendanceData = {};
                }

                newData[emp.id] = {
                    employee: emp,
                    attendance: attendanceData,
                    history: {}
                };
            }

            // Update allUsersData
            set({ allUsersData: newData, isLoadingEmployees: false });
        } catch (error) {
            set({ isLoadingEmployees: false }); // 🔥 NEW: Reset flag on error
            throw error;
        }
    },

    markAnnouncementAsRead: () => {
        const { loggedInEmployee, allUsersData } = get();
        if (!loggedInEmployee) return;

        const updatedEmployee = {
            ...loggedInEmployee,
            lastAnnouncementReadTimestamp: Date.now()
        };

        // Update both loggedInEmployee and allUsersData
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
