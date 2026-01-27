'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, setSupabaseSession } from '@/lib/supabase';
import { useAppDataStore } from '@/store/store';
import type { Employee, MonthlyActivityProgress, MonthlyReportSubmission } from '@/types';
import {
  getEmployeeMonthlyData,
  activateMonth as activateMonthService,
  updateMonthlyProgress as updateMonthlyProgressService
} from '@/services/monthlyActivityService';

interface MutabaahContextType {
  isCurrentMonthActivated: boolean;
  activatedMonths: string[];
  monthlyProgressData: Record<string, MonthlyActivityProgress>;
  monthlyReportSubmissions: MonthlyReportSubmission[];
  isLoading: boolean;
  error: string | null;
  activateMonth: (monthKey: string) => Promise<boolean>;
  updateMonthlyProgress: (monthKey: string, progress: MonthlyActivityProgress) => Promise<boolean>;
  checkCurrentMonthActivation: () => void;
  refreshData: () => Promise<void>;
}

const MutabaahContext = createContext<MutabaahContextType | undefined>(undefined);

export const useMutabaah = () => {
  const context = useContext(MutabaahContext);
  if (!context) {
    throw new Error('useMutabaah must be used within a MutabaahProvider');
  }
  return context;
};

interface MutabaahProviderProps {
  children: React.ReactNode;
  employee: Employee | null;
  onUpdateEmployee?: (updatedEmployee: Employee) => void;
}

export const MutabaahProvider: React.FC<MutabaahProviderProps> = ({ children, employee, onUpdateEmployee }) => {
  // 🔥 Derive initial state from prop immediately for zero-loading responsiveness
  const getInitialActivationStatus = () => {
    if (!employee) return { months: [], isActivated: false };
    const months = employee.activatedMonths || employee.activated_months || [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return { months, isActivated: months.includes(currentMonth) };
  };

  const initialStatus = getInitialActivationStatus();
  const [isCurrentMonthActivated, setIsCurrentMonthActivated] = useState(initialStatus.isActivated);
  const [activatedMonths, setActivatedMonths] = useState<string[]>(initialStatus.months);
  const [monthlyProgressData, setMonthlyProgressData] = useState<Record<string, MonthlyActivityProgress>>(employee?.monthlyActivities || employee?.monthly_activities || {});
  const [monthlyReportSubmissions, setMonthlyReportSubmissions] = useState<MonthlyReportSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 CRITICAL FIX: Use refs to avoid infinite loops from stale closures
  const employeeRef = useRef(employee);
  const activatedMonthsRef = useRef(activatedMonths);

  // Keep refs in sync
  useEffect(() => {
    employeeRef.current = employee;
  }, [employee]);

  useEffect(() => {
    activatedMonthsRef.current = activatedMonths;
  }, [activatedMonths]);

  // Function to get JWT token from cookie
  const getJwtToken = useCallback((): string | null => {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }, []);

  // Function to initialize Supabase session with JWT token
  const initializeSupabaseSession = useCallback(async () => {
    const token = getJwtToken();
    if (token) {
      try {
        await setSupabaseSession(token);
        // console.log('Supabase session initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Supabase session:', error);
      }
    }
  }, [getJwtToken]);

  // Helper function to get current month key (stable reference, no dependencies)
  const getCurrentMonthKey = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  // ⚡ OPTIMIZATION: Quick initialize - just load basic data immediately
  // Heavy operations like attendance sync will run in background
  const initializeFromEmployee = useCallback(async (emp: Employee): Promise<void> => {
    // 🔥 CRITICAL FIX: Guard against undefined/null employee
    if (!emp || !emp.id) {
      console.warn('⚠️ [MutabaahContext] initializeFromEmployee called with invalid employee:', emp);
      // Reset state to safe defaults
      setIsCurrentMonthActivated(false);
      setActivatedMonths([]);
      setMonthlyProgressData({});
      return Promise.resolve();
    }

    // 🔥 CRITICAL FIX: Initialize Supabase session FIRST and WAIT for it to complete
    // This prevents RLS policy violations when inserting data
    console.log('🔐 [MutabaahContext] Initializing for user:', emp.id, emp.name);

    // 🔥 DEBUG: Log all available properties
    console.log('🔍 [MutabaahContext] Employee object keys:', Object.keys(emp));
    console.log('🔍 [MutabaahContext] Employee activatedMonths:', emp.activatedMonths);
    console.log('🔍 [MutabaahContext] Employee activated_months:', emp.activated_months);

    await initializeSupabaseSession();

    // 🔥 CRITICAL: Wait a bit longer to ensure session is fully propagated
    await new Promise(resolve => setTimeout(resolve, 200));

    // Use data directly from employee object (already fresh from Supabase)
    // 🔥 FIX: monthlyActivities sekarang dikonversi ke camelCase oleh /api/auth/me
    const months = emp.activatedMonths || emp.activated_months || [];
    const activities = emp.monthlyActivities || emp.monthly_activities || {}; // Gunakan monthlyActivities (camelCase) dulu

    console.log('🔍 [MutabaahContext] Extracted months:', months);

    // 🔥 Define currentMonth
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // 🔥 FIX: ALL users (including admin/super-admin) must activate month
    // Admin dan super-admin juga karyawan yang kinerjanya dihitung
    const isActivated = months.includes(currentMonth);

    console.log('🔍 [MutabaahContext] Is current month activated?', {
      currentMonth,
      months,
      isActivated,
      includes: months.includes(currentMonth)
    });

    // 🔥 FIX: Only check if activated_months changed - always update if it differs!
    // This ensures that when user activates a month, the state updates immediately
    const currentMonthsStr = JSON.stringify(months.sort());
    const existingMonthsStr = JSON.stringify([...(activatedMonths || [])].sort());

    if (currentMonthsStr === existingMonthsStr) {
      // activated_months belum berubah, tapi mungkin activities berubah
      // Cek apakah activities perlu di-sync ulang (skip untuk performa jika sama)
      const currentActivitiesStr = JSON.stringify(activities);
      const existingActivitiesStr = JSON.stringify(monthlyProgressData);

      if (
        currentActivitiesStr === existingActivitiesStr &&
        isActivated === isCurrentMonthActivated
      ) {
        // No actual changes, skip initialization
        console.log('⏭️ [MutabaahContext] Skipping initialization - no changes detected');
        return Promise.resolve();
      }
    }

    console.log('🔄 [MutabaahContext] Initializing with data:', {
      employeeId: emp.id,
      role: emp.role,
      isActivated,
      activatedMonths: months.length,
      activatedMonthsList: months
    });

    // ⚡ IMMEDIATE: Update state with basic data first (non-blocking)
    setActivatedMonths(months);
    setMonthlyProgressData(activities);
    setIsCurrentMonthActivated(isActivated);


    // 🚀 OPTIMIZATION: Removed automatic massive background sync.
    // Data remains consistent between sources (attendance, reports, etc.) 
    // and can be manually refreshed by the user if needed.

    // 🔥 FIX: Return Promise to indicate initialization complete
    return Promise.resolve();
  }, [onUpdateEmployee, initializeSupabaseSession]);

  // Sync data to Supabase (optional, runs in background)
  const syncToSupabase = useCallback(async (empId: string) => {
    try {
      // Check if Supabase is configured
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      if (!isSupabaseConfigured()) {
        return;
      }

      // Try to fetch from Supabase to check if record exists
      const { data: existingData, error: fetchError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', empId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = not found, which is ok
        return;
      }

      // If no record exists, create one
      if (!existingData) {
        // Note: You'll need to implement this based on your actual schema
        // This is a placeholder showing where you'd do it
      }

    } catch (err) {
      // Non-critical error, log but don't crash
    }
  }, []);

  // Refresh monthly activities data from all sources
  const refreshData = useCallback(async () => {
    // 🔥 CRITICAL: Only proceed if employee exists and has a valid ID
    if (!employee || !employee.id) {
      console.log('⏭️ [MutabaahContext] Skipping refresh - no valid employee');
      return;
    }

    setIsLoading(true);
    try {
      // Start with current monthly activities
      const currentActivities = monthlyProgressData || {};
      const updatedActivities: Record<string, any> = { ...currentActivities };

      // 1. Load data from employee_monthly_reports table
      try {
        const { convertMonthlyReportsToActivities } = await import('@/services/monthlyReportService');

        // 🔥 CRITICAL: Only proceed if employee ID is valid
        if (employee.id) {
          const monthlyReportsActivities = await convertMonthlyReportsToActivities(employee.id);

          Object.entries(monthlyReportsActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Refreshed monthly reports');
        } else {
          console.log('⏭️ [MutabaahContext] Skipping monthly reports refresh - no employee ID');
        }
      } catch (error) {
        console.error('❌ [MutabaahContext] Error refreshing monthly reports:', error);
      }

      // 2. Load data from tadarus_sessions table (RSIJ bertadarus)
      try {
        const { convertTadarusSessionsToActivities } = await import('@/services/tadarusService');

        // 🔥 CRITICAL: Only proceed if employee ID is valid
        if (employee.id) {
          const tadarusActivities = await convertTadarusSessionsToActivities(employee.id);

          Object.entries(tadarusActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Refreshed tadarus sessions');
        } else {
          console.log('⏭️ [MutabaahContext] Skipping tadarus sessions refresh - no employee ID');
        }
      } catch (error) {
        console.error('❌ [MutabaahContext] Error refreshing tadarus sessions:', error);
      }

      // 3. Load data from team_attendance_records table (KIE & Doa Bersama)
      try {
        const { convertTeamAttendanceToActivities } = await import('@/services/teamAttendanceService');

        // 🔥 CRITICAL: Only proceed if employee ID is valid
        if (employee.id) {
          const teamAttendanceActivities = await convertTeamAttendanceToActivities(employee.id);

          Object.entries(teamAttendanceActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Refreshed team attendance');
        } else {
          console.log('⏭️ [MutabaahContext] Skipping team attendance refresh - no employee ID');
        }
      } catch (error) {
        console.error('❌ [MutabaahContext] Error refreshing team attendance:', error);
      }

      // 4. Load data from activity_attendance table (Scheduled Activities: Kajian Selasa, etc)
      try {
        const { convertScheduledActivitiesToActivities } = await import('@/services/scheduledActivityService');

        if (employee.id) {
          const scheduledActivities = await convertScheduledActivitiesToActivities(employee.id);

          Object.entries(scheduledActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Refreshed scheduled activities');
        }
      } catch (error) {
        console.error('❌ [MutabaahContext] Error refreshing scheduled activities:', error);
      }

      // 5. Update state with refreshed data
      setMonthlyProgressData(updatedActivities);

      // 🔥 FIX: NO CACHE - Don't save to employee_monthly_activities anymore
      console.log('✅ [MutabaahContext] Successfully refreshed data from all sources (NO CACHE)');

      // 5. Refresh monthly report submissions
      let submissions: MonthlyReportSubmission[] = [];
      try {
        const { getUserMonthlyReports } = await import('@/services/monthlySubmissionService');

        // 🔥 CRITICAL: Only proceed if employee ID is valid
        if (employee.id) {
          submissions = await getUserMonthlyReports(employee.id);
        } else {
          console.log('⏭️ [MutabaahContext] Skipping monthly reports refresh - no employee ID');
        }
      } catch (error) {
      }

      setMonthlyReportSubmissions(submissions);
    } catch (err) {
      setError('Gagal menyegarkan data');
    } finally {
      setIsLoading(false);
    }
  }, [employee?.id, employee?.id, monthlyProgressData]); // Use employee.id and monthlyProgressData

  // Check current month activation status
  const checkCurrentMonthActivation = useCallback(() => {
    const currentMonth = getCurrentMonthKey();

    // 🔥 FIX: ALL users (including admin/super-admin) must check activation
    // Admin dan super-admin juga karyawan yang kinerjanya dihitung
    const isActivated = activatedMonths.includes(currentMonth);
    setIsCurrentMonthActivated(isActivated);
    return isActivated;
  }, [activatedMonths, getCurrentMonthKey]);

  // Activate month for employee
  const activateMonth = useCallback(async (monthKey: string): Promise<boolean> => {
    // 🔥 CRITICAL FIX: Use refs to avoid stale closure issues
    const currentEmployee = employeeRef.current;
    const currentActivatedMonths = activatedMonthsRef.current;

    if (!currentEmployee?.id) {
      return false;
    }

    try {
      // Check if month is already activated
      if (currentActivatedMonths.includes(monthKey)) {
        return true;
      }

      // Check if trying to activate past month
      const now = new Date();
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month - 1);

      if (monthDate < new Date(now.getFullYear(), now.getMonth())) {
        const currentMonth = getCurrentMonthKey();
        if (monthKey !== currentMonth) {
          setError('Tidak dapat mengaktifkan bulan yang telah berlalu');
          return false;
        }
      }

      // Use service to activate month in Supabase
      const success = await activateMonthService(currentEmployee.id, monthKey);

      if (success) {
        const newActivatedMonths = [...currentActivatedMonths, monthKey];

        // Update local state IMMEDIATELY
        setActivatedMonths(newActivatedMonths);

        // Update current month activation if this is the current month
        const currentMonth = getCurrentMonthKey();
        if (monthKey === currentMonth) {
          setIsCurrentMonthActivated(true);
        }

        // Update localStorage (backup)
        try {
          const storedUsers = localStorage.getItem('allUsersData');
          if (storedUsers) {
            const allUsers = JSON.parse(storedUsers);
            if (allUsers[currentEmployee.id]) {
              // Handle both camelCase and snake_case
              allUsers[currentEmployee.id].employee.activatedMonths = newActivatedMonths;
              allUsers[currentEmployee.id].employee.activated_months = newActivatedMonths;
              localStorage.setItem('allUsersData', JSON.stringify(allUsers));
            }
          }
        } catch (e) {
        }

        // Update employee in parent store if callback is provided
        if (onUpdateEmployee && currentEmployee) {
          const updatedEmployee = {
            ...currentEmployee,
            activatedMonths: newActivatedMonths,
            activated_months: newActivatedMonths // Update both formats
          };
          onUpdateEmployee(updatedEmployee);
        }

        return true;
      } else {
        setError('Gagal mengaktifkan bulan di Supabase');
        return false;
      }

    } catch (err) {
      setError('Gagal mengaktifkan lembar mutaba\'ah');
      return false;
    }
  }, [getCurrentMonthKey, onUpdateEmployee]); // 🔥 CRITICAL FIX: Only stable dependencies

  // Update monthly progress
  const updateMonthlyProgress = useCallback(async (monthKey: string, progress: MonthlyActivityProgress): Promise<boolean> => {
    // 🔥 CRITICAL FIX: Use ref to avoid infinite loop
    const currentEmployee = employeeRef.current;

    if (!currentEmployee?.id) return false;

    try {
      // Use service to update monthly progress in Supabase
      const success = await updateMonthlyProgressService(currentEmployee.id, monthKey, progress);

      if (success) {
        // 🔥 FIX: Calculate new state first, then update state and parent
        // Use functional update to ensure we have value from latest render cycle if needed, 
        // but here we need to trigger side effect 'onUpdateEmployee' which is forbidden in reducer.
        // Given we are in an async function, we can rely on current 'monthlyProgressData' 
        // IF we trust it's up to date, OR we just do the update cleanly.

        let newMonthlyActivities: Record<string, MonthlyActivityProgress> | null = null;

        setMonthlyProgressData(prev => {
          newMonthlyActivities = {
            ...prev,
            [monthKey]: progress
          };
          return newMonthlyActivities;
        });

        // Update localStorage
        const storedUsers = localStorage.getItem('allUsersData');
        if (storedUsers) {
          try {
            const allUsers = JSON.parse(storedUsers);
            if (allUsers[currentEmployee.id]) {
              allUsers[currentEmployee.id].employee.monthlyActivities = newMonthlyActivities || { ...monthlyProgressData, [monthKey]: progress };
              localStorage.setItem('allUsersData', JSON.stringify(allUsers));
            }
          } catch (e) {
          }
        }

        // Update employee in parent store if callback is provided
        // This is now SAFE because it's outside the state setter
        if (onUpdateEmployee && currentEmployee) {
          const updatedEmployee = {
            ...currentEmployee,
            monthlyActivities: newMonthlyActivities || { ...monthlyProgressData, [monthKey]: progress }
          };
          onUpdateEmployee(updatedEmployee);
        }

        return true;
      } else {
        setError('Gagal menyimpan progres ke Supabase');
        return false;
      }

    } catch (err) {
      setError('Gagal menyimpan progres bulanan');
      return false;
    }
  }, [onUpdateEmployee]); // 🔥 CRITICAL FIX: Only stable dependencies

  // Setup realtime subscription
  useEffect(() => {
    if (!employee?.id) return;

    let channel: any = null;

    const setup = async () => {
      try {
        const { isSupabaseConfigured } = await import('@/lib/supabase');
        if (!isSupabaseConfigured()) return;

        channel = supabase
          .channel(`employee-${employee.id}-mutabaah`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'employees',
              filter: `id=eq.${employee.id}`
            },
            (payload) => {
              if (payload.new) {
                const newEmployee = payload.new as any;
                setActivatedMonths(newEmployee.activated_months || []);
                setMonthlyProgressData(newEmployee.monthly_activities || {});
                setMonthlyReportSubmissions(newEmployee.monthly_report_submissions || []);

                const currentMonth = getCurrentMonthKey();
                setIsCurrentMonthActivated((newEmployee.activated_months || []).includes(currentMonth));
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error setting up mutabaah subscription:', err);
      }
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [employee?.id, getCurrentMonthKey]);

  // Initialize when employee changes
  useEffect(() => {
    if (employee && employee.id) {
      // Determine if we need a blocking load
      const currentMonth = getCurrentMonthKey();
      const months = employee.activatedMonths || employee.activated_months || [];
      const isAlreadyActivated = months.includes(currentMonth);

      // 🔥 OPTIMIZATION: Only show loading if we REALLY don't know the status yet
      // If we have employee data, and it says user is activated, we do NOT block.
      // If user is NOT activated, we still might not want to block with a spinner
      // because we'll show the ActivationRequired UI instead.
      const hasDetailedActivities = Object.keys(employee.monthlyActivities || employee.monthly_activities || {}).length > 0;

      if (!isAlreadyActivated && !hasDetailedActivities) {
        setIsLoading(true);
      }

      initializeFromEmployee(employee).then(() => {
        // 🔥 SILENT REFRESH: If user is already activated, refresh in background
        // This prevents the "Mengecek status aktifasi..." blocking overlay on menu changes
        refreshData().finally(() => {
          setIsLoading(false);
        });
      });
    } else {
      // 🔥 CRITICAL FIX: Don't reset activation state if employee is null/undefined
      // This happens during initial load before loadLoggedInEmployee() completes
      // We should keep the existing state or set to loading, NOT to false/empty
      const { isLoggingOut } = useAppDataStore.getState();
      const { isHydrated } = useAppDataStore.getState();

      if (isHydrated && !isLoggingOut) {
        console.log('⚠️ [MutabaahContext] Employee is null/undefined, skipping initialization');
      }
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, employee?.activatedMonths, employee?.activated_months]); // 🔥 FIX: Also watch activated_months changes

  // 🔥 NEW: Effect to sync activation status when activatedMonths changes
  useEffect(() => {
    if (employee) {
      const currentMonth = getCurrentMonthKey();

      // 🔥 FIX: ALL users (including admin/super-admin) must check activation
      // Admin dan super-admin juga karyawan yang kinerjanya dihitung
      const isActivated = activatedMonths.includes(currentMonth);
      setIsCurrentMonthActivated(isActivated);
    }
  }, [activatedMonths, employee, getCurrentMonthKey]);

  // 🔥 CRITICAL FIX: Memoize context value to prevent unnecessary re-renders
  const value: MutabaahContextType = React.useMemo(() => ({
    isCurrentMonthActivated,
    activatedMonths,
    monthlyProgressData,
    monthlyReportSubmissions,
    isLoading,
    error,
    activateMonth,
    updateMonthlyProgress,
    checkCurrentMonthActivation,
    refreshData
  }), [
    isCurrentMonthActivated,
    activatedMonths,
    monthlyProgressData,
    monthlyReportSubmissions,
    isLoading,
    error,
    activateMonth,
    updateMonthlyProgress,
    checkCurrentMonthActivation,
    refreshData
  ]);

  return (
    <MutabaahContext.Provider value={value}>
      {children}
    </MutabaahContext.Provider>
  );
};
