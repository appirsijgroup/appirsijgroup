



import { create } from 'zustand';
import React from 'react';
import { type View, type Toast, type Notification, Ayah, SurahDetail, DailyPrayer, Employee, Attendance, Hospital } from '@/types';
import { CheckIcon, XIcon } from '@/components/Icons';
import { type PrayerTimesData } from '@/services/prayerTimeService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllHospitals } from '@/services/hospitalService';

// --- AppDataStore ---

type UserData = { employee: Employee; attendance: Attendance; history: Record<string, Attendance> };

export interface AppDataState {
    allUsersData: Record<string, UserData>;
    loggedInEmployee: Employee | null;
    hospitalsData: Record<string, Hospital>;
    isHydrated: boolean;
    isLoggingOut: boolean; // Flag to prevent loading flash during logout

    setAllUsersData: (fn: (state: AppDataState['allUsersData']) => AppDataState['allUsersData']) => void;
    setLoggedInEmployee: (employee: Employee | null) => void;
    setHospitalsData: (hospitals: Record<string, Hospital>) => void;
    setHydrated: (isHydrated: boolean) => void;
    markAnnouncementAsRead: () => void;
    loadLoggedInEmployee: () => Promise<void>;
    loadHospitals: () => Promise<void>;
    logoutEmployee: () => void;
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
    allUsersData: {},
    loggedInEmployee: null,
    hospitalsData: {},
    isHydrated: false,
    isLoggingOut: false, // Start not logging out

    setAllUsersData: (fn) => set(state => ({ allUsersData: fn(state.allUsersData) })),
    setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee }),
    setHospitalsData: (hospitals) => set({ hospitalsData: hospitals }),
    setHydrated: (isHydrated) => set({ isHydrated }),

    // 🔥 NEW: Load logged-in employee from Supabase
    // ⚡ OPTIMIZED: Skip database query if no user in localStorage to prevent slow loading
    loadLoggedInEmployee: async () => {
        const userId = localStorage.getItem('loggedInUserId');

        // Fast path: No user in localStorage = skip database query entirely
        if (!userId) {
            console.log('❌ No logged-in user ID in localStorage - skipping database query');
            set({ isHydrated: true });
            return;
        }

        try {
            const employee = await getEmployeeById(userId);

            if (employee) {
                set({
                    loggedInEmployee: employee,
                    allUsersData: {
                        [userId]: {
                            employee,
                            attendance: {},
                            history: {}
                        }
                    },
                    isHydrated: true
                });

                console.log('✅ Logged-in employee fully loaded and hydrated');
            } else {
                console.error('❌ Employee not found in Supabase for ID:', userId);
                // Clear invalid localStorage and mark as hydrated
                localStorage.removeItem('loggedInUserId');
                set({ loggedInEmployee: null, isHydrated: true });
            }
        } catch (error) {
            console.error('❌ Error loading employee from Supabase:', error);
            // On error, still mark as hydrated to prevent infinite loading
            set({ isHydrated: true });
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
            console.log(`✅ Loaded ${hospitals.length} hospitals`);
        } catch (error) {
            console.error('❌ Error loading hospitals:', error);
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
    currentTime: new Date(),
    userLocation: null,

    // Migrated Actions
    setPrayerTimes: (times) => set({ prayerTimes: times }),
    setPrayerTimesLoading: (loading) => set({ prayerTimesLoading: loading }),
    setLocationStatus: (status) => set({ locationStatus: status }),
    setActivePrayerId: (id) => set({ activePrayerId: id }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setUserLocation: (location) => set({ userLocation: location }),
}));

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
