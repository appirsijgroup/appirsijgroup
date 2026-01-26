
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
    isLoggingOut: boolean;
    isLoadingEmployees: boolean;
    activityStatsRefreshCounter: number;
    lastDetailedLoad: Record<string, number>;

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
    refreshActivityStats: () => void;
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    loadHeavyAdminData: () => Promise<void>;
}

export const useAppDataStore = create<AppDataState>((set, get) => ({
    allUsersData: {},
    loggedInEmployee: null,
    hospitalsData: {},
    isHydrated: false,
    isLoggingOut: false,
    isLoadingEmployees: false,
    activityStatsRefreshCounter: 0,
    lastDetailedLoad: {},
    paginatedEmployees: [],
    paginationInfo: null,

    setAllUsersData: (fn) => set(state => ({ allUsersData: fn(state.allUsersData) })),
    setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee }),
    setHospitalsData: (hospitals) => set({ hospitalsData: hospitals }),
    setHydrated: (isHydrated) => set({ isHydrated }),
    refreshActivityStats: () => set((state) => ({ activityStatsRefreshCounter: state.activityStatsRefreshCounter + 1 })),

    loadLoggedInEmployee: async () => {
        try {
            await timeValidationService.syncWithServerTime();

            const response = await fetch('/api/auth/me', {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                const employee = data.employee;

                if (employee) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('loggedInUserId', employee.id);
                    }

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

                    get().loadDetailedEmployeeData(employee.id).catch(err => {
                        console.error('⚠️ [AppDataStore] Failed to pre-load detailed data:', err);
                    });

                    const hasManagementRole =
                        employee.role === 'admin' ||
                        employee.role === 'super-admin' ||
                        employee.canBeMentor ||
                        employee.canBeSupervisor ||
                        employee.canBeKaUnit ||
                        employee.canBeDirut;

                    if (hasManagementRole) {
                        setTimeout(() => {
                            // FAST: Only load first 15 employees for immediate display in management lists
                            get().loadPaginatedEmployees(1, 15).catch(err => console.error('Failed to load paginated employees:', err));

                            // MODERATE: Load basic info of all employees (Phase 1 only)
                            // We NO LONGER call Phase 2 (heavy data) automatically here ⚡
                            get().loadAllEmployees().catch(err => console.error('Failed to load basic employee info:', err));
                        }, 500);
                    }

                } else {
                    throw new Error('No employee data in response');
                }
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('loggedInUserId');
                    set({ loggedInEmployee: null, isHydrated: true });
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login' && currentPath !== '/login/') {
                        window.location.href = '/login';
                    }
                }
            }
        } catch (error) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('loggedInUserId');
                set({ loggedInEmployee: null, isHydrated: true });
                window.location.href = '/login';
            }
        }
    },

    logoutEmployee: async () => {
        if (get().isLoggingOut) return;
        set({ isLoggingOut: true });

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout API error:', error);
        }

        if (typeof window !== 'undefined') {
            localStorage.removeItem('loggedInUserId');
            localStorage.removeItem('lastVisitedPage');
            document.cookie = 'session=; path=/; max-age=0; SameSite=Lax';
            document.cookie = 'loggedInUserId=; path=/; max-age=0; SameSite=Lax';

            set({
                loggedInEmployee: null,
                isHydrated: true,
                isLoggingOut: true
            });

            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/login/') {
                window.location.href = '/login';
            } else {
                set({ isLoggingOut: false });
            }
        }
    },

    loadHospitals: async () => {
        try {
            const hospitals = await getAllHospitals();
            const hospitalsRecord: Record<string, Hospital> = {};
            hospitals.forEach(hospital => {
                hospitalsRecord[hospital.id] = hospital;
            });
            set({ hospitalsData: hospitalsRecord });
        } catch (error) {
            console.error('Failed to load hospitals:', error);
        }
    },

    loadAllEmployees: async (limit?: number) => {
        if (get().isLoadingEmployees) return;

        try {
            set({ isLoadingEmployees: true });

            const { getAllEmployees } = await import('@/services/employeeService');

            // --- PHASE 1: FAST LOAD (Basic Info) ---
            // Only loads the employees list, not their entire history
            const allEmployees = await getAllEmployees(limit);

            const initialData: Record<string, UserData> = {};
            allEmployees.forEach(emp => {
                initialData[emp.id] = {
                    employee: emp,
                    attendance: {},
                    history: {}
                };
            });

            set(state => ({
                allUsersData: { ...state.allUsersData, ...initialData },
                isLoadingEmployees: false
            }));

            // ⚡ NOTE: BACKGROUND LOAD (Heavy Data) is intentionally removed from here.
            // It was causing 5+ minute loading times for large datasets.
            // Call loadHeavyAdminData() manually when needed (e.g., in Admin Reports).

        } catch (error) {
            console.error('❌ [loadAllEmployees] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },

    /**
     * 🔥 NEW: Decoupled Heavy Data Loader
     * Only call this when detailed global analytics or large reports are needed.
     */
    loadHeavyAdminData: async () => {
        if (get().isLoadingEmployees) return;
        try {
            set({ isLoadingEmployees: true });
            const { getAllAttendanceRecords, supabase } = await import('@/services/attendanceService');
            const allEmployees = Object.values(get().allUsersData).map(u => u.employee);

            if (allEmployees.length === 0) {
                set({ isLoadingEmployees: false });
                return;
            }

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

            const [allAttendanceRecords, teamRecordsRes, activityRecordsRes, bulkActivitiesRes] = await Promise.all([
                getAllAttendanceRecords(startOfMonth), // Only get current month by default
                supabase.from('team_attendance_records').select('*').gte('session_date', startOfMonth).limit(1000),
                supabase.from('activity_attendance').select('*').gte('timestamp', startOfMonth).limit(1000),
                fetch(`/api/admin/bulk-monthly-activities?month=${currentMonth}&year=${currentYear}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { allActivities: {} })
            ]);

            const allMonthlyActivities = bulkActivitiesRes.allActivities || {};
            const extraTeamRecords = (teamRecordsRes.data as any[]) || [];
            const extraActivityRecords = (activityRecordsRes.data as any[]) || [];
            const todayStr = new Date().toLocaleDateString('en-CA');

            const updatedUsers: Record<string, Partial<UserData>> = {};

            const mergeToUpdate = (userId: string, entityId: string, data: any) => {
                if (!userId) return;
                if (!updatedUsers[userId]) updatedUsers[userId] = { attendance: {}, history: {} };
                const timestamp = data.timestamp;
                if (!timestamp) return;
                const dateStr = new Date(timestamp).toLocaleDateString('en-CA');

                if (dateStr === todayStr) {
                    if (!updatedUsers[userId].attendance) updatedUsers[userId].attendance = {};
                    updatedUsers[userId].attendance![entityId] = data;
                } else {
                    if (!updatedUsers[userId].history) updatedUsers[userId].history = {};
                    if (!updatedUsers[userId].history![dateStr]) updatedUsers[userId].history![dateStr] = {};
                    updatedUsers[userId].history![dateStr][entityId] = data;
                }
            };

            allEmployees.forEach(emp => {
                if (allMonthlyActivities[emp.id]) {
                    updatedUsers[emp.id] = {
                        ...updatedUsers[emp.id],
                        employee: { ...emp, monthlyActivities: allMonthlyActivities[emp.id] }
                    };
                }
            });

            Object.entries(allAttendanceRecords).forEach(([userId, userRecords]) => {
                Object.entries(userRecords).forEach(([entityId, record]: [string, any]) => {
                    if (record && record.status) {
                        mergeToUpdate(userId, entityId, {
                            status: record.status,
                            reason: record.reason || null,
                            timestamp: new Date(record.timestamp).getTime(),
                            submitted: true,
                            isLateEntry: record.is_late_entry || false
                        });
                    }
                });
            });

            extraTeamRecords.forEach(r => {
                const uid = r.user_id || r.userId;
                if (!uid) return;
                mergeToUpdate(uid, r.session_type || r.session_id || 'Kegiatan Tim', {
                    status: 'hadir',
                    timestamp: new Date(r.attended_at || r.attendedAt).getTime(),
                    submitted: true
                });
            });

            extraActivityRecords.forEach(r => {
                if (!r.employee_id) return;
                mergeToUpdate(r.employee_id, r.activity_id, {
                    status: r.status,
                    timestamp: new Date(r.submitted_at || r.timestamp).getTime(),
                    submitted: true
                });
            });

            set(state => {
                const nextAllUsersData = { ...state.allUsersData };
                Object.entries(updatedUsers).forEach(([userId, updates]) => {
                    if (nextAllUsersData[userId]) {
                        nextAllUsersData[userId] = {
                            ...nextAllUsersData[userId],
                            employee: updates.employee || nextAllUsersData[userId].employee,
                            attendance: { ...nextAllUsersData[userId].attendance, ...updates.attendance },
                            history: { ...nextAllUsersData[userId].history, ...updates.history }
                        };
                    }
                });
                return { allUsersData: nextAllUsersData, isLoadingEmployees: false };
            });

            const { useUIStore } = await import('@/store/store');
            useUIStore.getState().addToast('⚡ Sinkronisasi riwayat berhasil!', 'success');
        } catch (e) {
            console.error('⚠️ [loadHeavyAdminData] Failed:', e);
            set({ isLoadingEmployees: false });
        }
    },

    loadPaginatedEmployees: async (page = 1, limit = 15, search = '', role = '', isActive) => {
        if (get().isLoadingEmployees) return;

        try {
            set({ isLoadingEmployees: true });
            const { getEmployeesPaginated } = await import('@/services/employeeService');
            const { employees, pagination } = await getEmployeesPaginated(page, limit, search, role, isActive);

            const newUsersToMerge: Record<string, UserData> = {};
            employees.forEach(emp => {
                if (!get().allUsersData[emp.id]) {
                    newUsersToMerge[emp.id] = {
                        employee: emp,
                        attendance: {},
                        history: {}
                    };
                } else {
                    const existing = get().allUsersData[emp.id];
                    newUsersToMerge[emp.id] = {
                        ...existing,
                        employee: { ...emp, monthlyActivities: existing.employee.monthlyActivities }
                    };
                }
            });

            set(state => ({
                allUsersData: { ...state.allUsersData, ...newUsersToMerge },
                paginatedEmployees: employees,
                paginationInfo: pagination,
                isLoadingEmployees: false
            }));
        } catch (error) {
            console.error('❌ [loadPaginatedEmployees] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },

    markAnnouncementAsRead: async () => {
        const { loggedInEmployee, allUsersData } = get();
        if (!loggedInEmployee) return;

        const now = timeValidationService.getCorrectedTime().getTime();
        const updatedEmployee = { ...loggedInEmployee, lastAnnouncementReadTimestamp: now };

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

        try {
            await updateEmployee(loggedInEmployee.id, { lastAnnouncementReadTimestamp: now });
        } catch (error) {
            console.error('❌ [markAnnouncementAsRead] Error persisting to Supabase:', error);
        }
    },

    loadDetailedEmployeeData: async (employeeId: string, monthOrForce?: number | boolean, yearParam?: number, forceParam = false) => {
        if (!employeeId) return;

        let month: number | undefined = undefined;
        let year: number | undefined = yearParam;
        let force: boolean = forceParam;

        if (typeof monthOrForce === 'boolean') {
            force = monthOrForce;
        } else {
            month = monthOrForce;
        }

        const now = Date.now();
        const cacheKey = `${employeeId}-${month || 'all'}-${year || 'all'}`;
        const lastLoad = get().lastDetailedLoad[cacheKey] || 0;
        if (!force && now - lastLoad < 30000) return;

        try {
            const { getMonthlyActivities } = await import('@/services/monthlyActivityService');

            const mergedActivities = await getMonthlyActivities(employeeId, month, year);

            set(state => {
                const newData = { ...state.allUsersData };
                if (newData[employeeId]) {
                    // Merging logic for specific month vs full load
                    let updatedActivities = mergedActivities;
                    if (month && year) {
                        updatedActivities = {
                            ...(newData[employeeId].employee.monthlyActivities || {}),
                            ...mergedActivities
                        };
                    }

                    newData[employeeId] = {
                        ...newData[employeeId],
                        employee: { ...newData[employeeId].employee, monthlyActivities: updatedActivities }
                    };
                }

                if (state.loggedInEmployee && state.loggedInEmployee.id === employeeId) {
                    let updatedActivities = mergedActivities;
                    if (month && year) {
                        updatedActivities = {
                            ...(state.loggedInEmployee.monthlyActivities || {}),
                            ...mergedActivities
                        };
                    }

                    const updatedLoggedInEmployee = { ...state.loggedInEmployee, monthlyActivities: updatedActivities };
                    return {
                        allUsersData: newData,
                        loggedInEmployee: updatedLoggedInEmployee,
                        lastDetailedLoad: { ...state.lastDetailedLoad, [cacheKey]: now }
                    };
                }

                return {
                    allUsersData: newData,
                    lastDetailedLoad: { ...state.lastDetailedLoad, [cacheKey]: now }
                };
            });

        } catch (error) {
            console.error('❌ [loadDetailedEmployeeData] ErrorAggregate:', error);
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
    modalState: { isOpen: boolean; entityId: string | null; entityName: string | null; };
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
    prayerTimes: PrayerTimesData | null;
    prayerTimesLoading: boolean;
    locationStatus: string | null;
    activePrayerId: string | null;
    currentTime: Date;
    userLocation: { latitude: number; longitude: number } | null;
    setPrayerTimes: (times: PrayerTimesData | null) => void;
    setPrayerTimesLoading: (loading: boolean) => void;
    setLocationStatus: (status: string | null) => void;
    setActivePrayerId: (id: string | null) => void;
    setCurrentTime: (time: Date) => void;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
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
    shareModalState: { isOpen: false, type: null, content: null, },
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
        if (link && typeof link === 'object' && 'tab' in link && link.tab) {
            set({ deepLink: link, initialTab: link.tab as string });
        } else {
            set({ deepLink: link, initialTab: undefined });
        }
    },
    initialTab: undefined,
    onClearDeepLink: () => set({ deepLink: null, initialTab: undefined }),
    prayerTimes: null,
    prayerTimesLoading: true,
    locationStatus: null,
    activePrayerId: null,
    currentTime: timeValidationService.getCorrectedTime(),
    userLocation: null,
    setPrayerTimes: (times) => set({ prayerTimes: times }),
    setPrayerTimesLoading: (loading) => set({ prayerTimesLoading: loading }),
    setLocationStatus: (status) => set({ locationStatus: status }),
    setActivePrayerId: (id) => set({ activePrayerId: id }),
    setCurrentTime: (time) => {
        const timeValidation = timeValidationService.validateTime();
        if (!timeValidation.isValid) {
            set({ currentTime: timeValidation.correctedTime });
        } else {
            set({ currentTime: time });
        }
    },
    setUserLocation: (location) => set({ userLocation: location }),
}));

if (typeof window !== 'undefined') {
    setInterval(() => {
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
