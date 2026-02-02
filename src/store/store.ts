
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
    lastAllEmployeesLoad: number;
    lastHeavyAdminLoad: number;

    setAllUsersData: (fn: (state: AppDataState['allUsersData']) => AppDataState['allUsersData']) => void;
    setLoggedInEmployee: (employee: Employee | null) => void;
    setHospitalsData: (hospitals: Record<string, Hospital>) => void;
    setHydrated: (isHydrated: boolean) => void;
    markAnnouncementAsRead: () => Promise<void>;
    loadLoggedInEmployee: () => Promise<void>;
    loadAllEmployees: (limit?: number) => Promise<void>;
    loadPaginatedEmployees: (page?: number, limit?: number, search?: string, role?: string, isActive?: boolean, hospitalId?: string, isAppend?: boolean) => Promise<void>;
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
    logoutEmployee: (router?: any) => void;
    refreshActivityStats: () => void;
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    loadHeavyAdminData: (customStartDate?: string) => Promise<void>;
    setIsLoggingOut: (isLoggingOut: boolean) => void;
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
    lastAllEmployeesLoad: 0,
    lastHeavyAdminLoad: 0,
    paginatedEmployees: [],
    paginationInfo: null,

    setAllUsersData: (fn) => set(state => ({ allUsersData: fn(state.allUsersData) })),
    setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee, isLoggingOut: false }),
    setHospitalsData: (hospitals) => set({ hospitalsData: hospitals }),
    setHydrated: (isHydrated) => set({ isHydrated }),
    setIsLoggingOut: (isLoggingOut) => set({ isLoggingOut }),
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

    logoutEmployee: async (router) => {
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
                if (router) {
                    router.push('/login');
                } else {
                    window.location.href = '/login';
                }
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
        // 🔥 CACHE CHECK: If loaded within last 5 minutes, skip to save Supabase resources
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // Skip if already loading or recently loaded (and no limit specified)
        // 🔥 CRITICAL FIX: Only skip if it was a FULL load previously (no limit)
        // and we aren't currently loading or if this is a critical full load
        if (get().isLoadingEmployees && limit) return; // Allow full load to interrupt or wait

        const isFullLoad = !limit;
        if (isFullLoad && now - get().lastAllEmployeesLoad < CACHE_DURATION && Object.keys(get().allUsersData).length > 50) {
            console.log('📦 [AppDataStore] All employees recently loaded (FULL), using cache.');
            return;
        }

        // If it's a partial load, also check cache
        if (!isFullLoad && Object.keys(get().allUsersData).length > 200) {
            // If we already have a lot of data, partial loads are less urgent but let's allow them if needed
        }

        try {
            set({ isLoadingEmployees: true });

            const { getAllEmployees } = await import('@/services/employeeService');

            // --- PHASE 1: FAST LOAD (Basic Info) ---
            const allEmployees = await getAllEmployees(limit);

            const initialData: Record<string, UserData> = {};
            allEmployees.forEach(emp => {
                initialData[emp.id] = {
                    employee: emp,
                    attendance: get().allUsersData[emp.id]?.attendance || {},
                    history: get().allUsersData[emp.id]?.history || {}
                };
            });

            set(state => ({
                allUsersData: { ...state.allUsersData, ...initialData },
                isLoadingEmployees: false,
                lastAllEmployeesLoad: !limit ? now : state.lastAllEmployeesLoad
            }));

        } catch (error) {
            console.error('❌ [loadAllEmployees] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },

    /**
     * 🔥 NEW: Decoupled Heavy Data Loader
     * Only call this when detailed global analytics or large reports are needed.
     */
    loadHeavyAdminData: async (customStartDate?: string) => {
        if (get().isLoadingEmployees) return;
        try {
            set({ isLoadingEmployees: true });

            const now = new Date();
            let currentYear = now.getFullYear();
            let currentMonth = now.getMonth() + 1;
            let startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

            if (customStartDate) {
                // If custom date provided, use it
                startOfMonth = customStartDate;
                const d = new Date(customStartDate);
                if (!isNaN(d.getTime())) {
                    currentYear = d.getFullYear();
                    currentMonth = d.getMonth() + 1;
                }
            }

            // 🔥 FETCH ALL DATA VIA ADMIN FULL SYNC API (Bypasses RLS)
            const [reportRes, bulkActivitiesRes] = await Promise.all([
                fetch(`/api/admin/reports/full-sync?startDate=${startOfMonth}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { data: {} }),
                fetch(`/api/admin/bulk-monthly-activities?month=${currentMonth}&year=${currentYear}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { allActivities: {} })
            ]);

            const reportData = reportRes.data || {};
            const allMonthlyActivities = bulkActivitiesRes.allActivities || {};

            const attendanceRecords = (reportData.attendanceRecords as any[]) || [];
            const teamRecords = (reportData.teamAttendanceRecords as any[]) || [];
            const activityRecords = (reportData.activityAttendanceRecords as any[]) || [];
            const employeesFromBypass = (reportData.employees as any[]) || [];

            const todayStr = new Date().toISOString().split('T')[0];
            const updatedUsers: Record<string, { attendance: Attendance; history: Record<string, Attendance> }> = {};

            const mergeToUpdate = (userId: string, entityId: string, data: any, explicitDateStr?: string) => {
                if (!userId) return;

                // Initialize user if not exists
                if (!updatedUsers[userId]) {
                    updatedUsers[userId] = {
                        attendance: {},
                        history: {}
                    };
                }

                const timestamp = data.timestamp;
                if (!timestamp && !explicitDateStr) return;

                // 🔥 FIX: Use explicit date string if provided (e.g. session_date), 
                // otherwise fallback to timestamp date (ISO format)
                const dateStr = explicitDateStr || new Date(timestamp).toISOString().split('T')[0];

                if (dateStr === todayStr) {
                    updatedUsers[userId].attendance[entityId] = data;
                } else {
                    if (!updatedUsers[userId].history[dateStr]) {
                        updatedUsers[userId].history[dateStr] = {};
                    }
                    updatedUsers[userId].history[dateStr][entityId] = data;
                }
            };

            // Phase 1: Ensure all employees from bypass are in the store
            const { convertToCamelCase } = await import('@/services/employeeService');
            const nextAllUsersData = { ...get().allUsersData };

            employeesFromBypass.forEach(empRaw => {
                const emp = convertToCamelCase(empRaw);
                if (emp.id) {
                    if (allMonthlyActivities[emp.id]) {
                        emp.monthlyActivities = allMonthlyActivities[emp.id];
                    }

                    if (!nextAllUsersData[emp.id]) {
                        nextAllUsersData[emp.id] = {
                            employee: emp,
                            attendance: {},
                            history: {}
                        };
                    } else {
                        nextAllUsersData[emp.id] = {
                            ...nextAllUsersData[emp.id],
                            employee: { ...emp, monthlyActivities: emp.monthlyActivities || nextAllUsersData[emp.id].employee.monthlyActivities }
                        };
                    }
                }
            });

            // Phase 2: Merge Sholat Records
            attendanceRecords.forEach((record: any) => {
                if (record && record.status) {
                    mergeToUpdate(record.employee_id, record.entity_id, {
                        status: record.status,
                        reason: record.reason || null,
                        timestamp: new Date(record.timestamp).getTime(),
                        submitted: true,
                        isLateEntry: record.is_late_entry || false
                    });
                }
            });

            // Phase 3: Merge Team Records
            teamRecords.forEach(r => {
                const uid = r.user_id || r.userId;
                if (!uid) return;

                const sessionDate = r.session_date || (r.attended_at ? new Date(r.attended_at).toISOString().split('T')[0] : null);
                if (!sessionDate) return;

                mergeToUpdate(uid, r.session_type || r.session_id || 'Kegiatan Tim', {
                    status: 'hadir',
                    timestamp: new Date(r.attended_at || r.attendedAt).getTime(),
                    submitted: true
                }, sessionDate);
            });

            // Phase 4: Merge Manual Activity Records
            activityRecords.forEach(r => {
                if (!r.employee_id) return;

                const activityDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : null;

                mergeToUpdate(r.employee_id, r.activity_id, {
                    status: r.status,
                    timestamp: new Date(r.submitted_at || r.timestamp).getTime(),
                    submitted: true
                }, activityDate || undefined);
            });

            // 🔥 FIX: Deep merge history and attendance to prevent overwriting
            Object.entries(updatedUsers).forEach(([userId, updates]) => {
                if (nextAllUsersData[userId]) {
                    // Merge Today's Attendance
                    const nextAttendance = {
                        ...(nextAllUsersData[userId].attendance || {}),
                        ...updates.attendance
                    };

                    // Merge History (Date by Date)
                    const nextHistory = { ...(nextAllUsersData[userId].history || {}) };
                    Object.entries(updates.history).forEach(([date, dayRecords]) => {
                        nextHistory[date] = {
                            ...(nextHistory[date] || {}),
                            ...dayRecords
                        };
                    });

                    nextAllUsersData[userId] = {
                        ...nextAllUsersData[userId],
                        attendance: nextAttendance,
                        history: nextHistory
                    };
                }
            });

            set({ allUsersData: nextAllUsersData, isLoadingEmployees: false, lastHeavyAdminLoad: Date.now() });

            const { useUIStore } = await import('@/store/store');

            // 🔥 FORMAT DATE FOR FEEDBACK
            const feedbackDate = customStartDate
                ? new Date(customStartDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                : 'Bulan Ini';

            useUIStore.getState().addToast(`⚡ Sinkronisasi data (${feedbackDate}) berhasil!`, 'success');
        } catch (e) {
            console.error('⚠️ [loadHeavyAdminData] Failed:', e);
            set({ isLoadingEmployees: false });
        }
    },

    loadPaginatedEmployees: async (page = 1, limit = 15, search = '', role = '', isActive, hospitalId = '', isAppend = false) => {
        if (get().isLoadingEmployees) return;

        try {
            set({ isLoadingEmployees: true });
            const { getPaginatedEmployees } = await import('@/services/employeeServicePaginated');
            const { employees, pagination } = await getPaginatedEmployees({ page, limit, search, role, isActive, hospitalId });

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
                paginatedEmployees: isAppend ? [...state.paginatedEmployees, ...employees] : employees,
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
            const { getReadingHistory, getQuranReadingHistory } = await import('@/services/readingHistoryService');
            const { getEmployeeById } = await import('@/services/employeeService');
            const { getEmployeeQuranCompetency, getEmployeeQuranHistory } = await import('@/services/quranCompetencyService');

            // Check if we need basic employee info (if not already in allUsersData)
            const needsBasicInfo = !get().allUsersData[employeeId];

            const [mergedActivities, readingHistory, quranReadingHistory, basicInfo, quranCompetency, quranHistory] = await Promise.all([
                getMonthlyActivities(employeeId, month, year),
                getReadingHistory(employeeId),
                getQuranReadingHistory(employeeId),
                needsBasicInfo ? getEmployeeById(employeeId) : Promise.resolve(null),
                getEmployeeQuranCompetency(employeeId),
                getEmployeeQuranHistory(employeeId)
            ]);

            set(state => {
                const newData = { ...state.allUsersData };

                // Get the base employee object
                const baseEmployee = newData[employeeId]?.employee || basicInfo;

                if (baseEmployee) {
                    // Merging logic for specific month vs full load
                    let updatedActivities = mergedActivities;
                    if (month && year) {
                        updatedActivities = {
                            ...(baseEmployee.monthlyActivities || {}),
                            ...mergedActivities
                        };
                    }

                    newData[employeeId] = {
                        ...newData[employeeId],
                        employee: {
                            ...baseEmployee,
                            monthlyActivities: updatedActivities,
                            readingHistory: readingHistory as any,
                            quranReadingHistory: quranReadingHistory as any,
                            quranCompetency: quranCompetency as any,
                            quranHistory: quranHistory as any
                        }
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

                    const updatedLoggedInEmployee = {
                        ...state.loggedInEmployee,
                        monthlyActivities: updatedActivities,
                        readingHistory: readingHistory as any,
                        quranReadingHistory: quranReadingHistory as any,
                        quranCompetency: quranCompetency as any,
                        quranHistory: quranHistory as any
                    };
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
    globalLoading: { show: boolean; message: string };
    setGlobalLoading: (show: boolean, message?: string) => void;
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
    globalLoading: { show: false, message: 'Memuat...' },
    setGlobalLoading: (show, message = 'Memuat...') => set({ globalLoading: { show, message } }),
}));


if (typeof window !== 'undefined') {
    setInterval(() => {
        const correctedTime = timeValidationService.getCorrectedTime();
        useUIStore.getState().setCurrentTime(correctedTime);
    }, 1000);
}

export * from './activityStore';
export * from './announcementStore';
export * from './bookmarkStore';
export * from './dailyActivitiesStore';
export * from './guidanceStore';
export * from './hospitalStore';

export * from './mutabaahStore';
export * from './notificationStore';
export * from './sunnahIbadahStore';
