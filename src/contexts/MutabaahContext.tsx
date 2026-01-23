'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, setSupabaseSession } from '@/lib/supabase';
import { useAppDataStore } from '@/store/store';
import type { Employee, MonthlyActivityProgress, WeeklyReportSubmission } from '@/types';
import {
  getEmployeeMonthlyData,
  activateMonth as activateMonthService,
  updateMonthlyProgress as updateMonthlyProgressService
} from '@/services/monthlyActivityService';

interface MutabaahContextType {
  isCurrentMonthActivated: boolean;
  activatedMonths: string[];
  monthlyProgressData: Record<string, MonthlyActivityProgress>;
  weeklyReportSubmissions: WeeklyReportSubmission[];
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
  const [isCurrentMonthActivated, setIsCurrentMonthActivated] = useState(false);
  const [activatedMonths, setActivatedMonths] = useState<string[]>([]);
  const [monthlyProgressData, setMonthlyProgressData] = useState<Record<string, MonthlyActivityProgress>>({});
  const [weeklyReportSubmissions, setWeeklyReportSubmissions] = useState<WeeklyReportSubmission[]>([]);
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


    // 🚀 DEFER: Run heavy operations in background using setTimeout
    // This allows UI to render immediately without blocking
    setTimeout(async () => {
      // 🔥 CRITICAL: Double-check that employee still exists before proceeding
      // This prevents race conditions where employee gets cleared during async operations
      if (!employeeRef.current || !employeeRef.current.id) {
        console.log('⏭️ [MutabaahContext] Employee cleared during background sync, aborting');
        return;
      }

      // 🔥 FIX: Load ALL data from database and sync properly
      try {
        const updatedActivities: Record<string, any> = { ...activities };

        // 1. Sync ALL attendance records from Supabase to monthly progress
        try {
          const { getEmployeeAttendance } = await import('@/services/attendanceService');
          const attendanceRecords = await getEmployeeAttendance(emp.id);

          // For each attendance record, sync to the corresponding day and month
          Object.entries(attendanceRecords).forEach(([entityId, record]) => {
            if (record.status !== 'hadir') return;

            // Parse timestamp to get day and month
            const attendanceDate = new Date(record.timestamp);
            const year = attendanceDate.getFullYear();
            const month = (attendanceDate.getMonth() + 1).toString().padStart(2, '0');
            const dayOfMonth = attendanceDate.getDate();
            const dayKey = dayOfMonth.toString().padStart(2, '0');
            const monthKey = `${year}-${month}`;

            // Initialize month if not exists
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            // Initialize day if not exists
            if (!updatedActivities[monthKey][dayKey]) {
              updatedActivities[monthKey][dayKey] = {};
            }

            // Mark shalat_berjamaah as done for this day
            updatedActivities[monthKey][dayKey]['shalat_berjamaah'] = true;
          });

          console.log('✅ [MutabaahContext] Synced attendance records:', Object.keys(attendanceRecords).length);
        } catch (error) {
          console.error('❌ [MutabaahContext] Error syncing attendance:', error);
        }

        // 2. Load data from employee_monthly_reports table
        try {
          const { convertMonthlyReportsToActivities } = await import('@/services/monthlyReportService');

          // 🔥 CRITICAL: Only proceed if employee ID is valid
          if (emp.id) {
            const monthlyReportsActivities = await convertMonthlyReportsToActivities(emp.id);

            // Merge monthlyReportsActivities into updatedActivities
            Object.entries(monthlyReportsActivities).forEach(([monthKey, monthData]) => {
              if (!updatedActivities[monthKey]) {
                updatedActivities[monthKey] = {};
              }

              Object.entries(monthData).forEach(([dayKey, dayData]) => {
                if (!updatedActivities[monthKey][dayKey]) {
                  updatedActivities[monthKey][dayKey] = {};
                }

                // Merge all activities from this day
                Object.assign(updatedActivities[monthKey][dayKey], dayData);
              });
            });

            console.log('✅ [MutabaahContext] Synced monthly reports:', Object.keys(monthlyReportsActivities).length);
          } else {
            console.log('⏭️ [MutabaahContext] Skipping monthly reports sync - no employee ID');
          }
        } catch (error) {
          console.error('❌ [MutabaahContext] Error loading monthly reports:', error);
        }

        // 3. Load data from tadarus_sessions table (RSIJ bertadarus)
        try {
          const { convertTadarusSessionsToActivities } = await import('@/services/tadarusService');
          const tadarusActivities = await convertTadarusSessionsToActivities(emp.id);

          // Merge tadarusActivities into updatedActivities
          Object.entries(tadarusActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              // Merge all activities from this day
              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Synced tadarus sessions:', Object.keys(tadarusActivities).length);
        } catch (error) {
          console.error('❌ [MutabaahContext] Error loading tadarus sessions:', error);
        }

        // 4. Load data from team_attendance_records table (KIE & Doa Bersama)
        try {
          const { convertTeamAttendanceToActivities } = await import('@/services/teamAttendanceService');
          const teamAttendanceActivities = await convertTeamAttendanceToActivities(emp.id);

          // Merge teamAttendanceActivities into updatedActivities
          Object.entries(teamAttendanceActivities).forEach(([monthKey, monthData]) => {
            if (!updatedActivities[monthKey]) {
              updatedActivities[monthKey] = {};
            }

            Object.entries(monthData).forEach(([dayKey, dayData]) => {
              if (!updatedActivities[monthKey][dayKey]) {
                updatedActivities[monthKey][dayKey] = {};
              }

              // Merge all activities from this day
              Object.assign(updatedActivities[monthKey][dayKey], dayData);
            });
          });

          console.log('✅ [MutabaahContext] Synced team attendance (KIE & Doa Bersama):', Object.keys(teamAttendanceActivities).length);
        } catch (error) {
          console.error('❌ [MutabaahContext] Error loading team attendance:', error);
        }

        // 5. Update state with ALL synced data
        setMonthlyProgressData(updatedActivities);

        // 🔥 FIX: NO CACHE - Don't save to employee_monthly_activities anymore
        // Data is now stored in separate tables and loaded on-demand
        console.log('✅ [MutabaahContext] Successfully synced data from all sources (NO CACHE)');

      } catch (error) {
        console.error('❌ [MutabaahContext] Error in background sync:', error);
      }

      // Load weekly report submissions in background (low priority)
      try {
        const { getUserWeeklyReports } = await import('@/services/weeklyReportService');
        const submissions = await getUserWeeklyReports(emp.id);
        setWeeklyReportSubmissions(submissions);
      } catch (error) {
      }

    }, 100); // 100ms delay to allow UI to render first

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

      // 4. Update state with refreshed data
      setMonthlyProgressData(updatedActivities);

      // 🔥 FIX: NO CACHE - Don't save to employee_monthly_activities anymore
      console.log('✅ [MutabaahContext] Successfully refreshed data from all sources (NO CACHE)');

      // 5. Refresh weekly report submissions
      let submissions: WeeklyReportSubmission[] = [];
      try {
        const { getUserWeeklyReports } = await import('@/services/weeklyReportService');

        // 🔥 CRITICAL: Only proceed if employee ID is valid
        if (employee.id) {
          submissions = await getUserWeeklyReports(employee.id);
        } else {
          console.log('⏭️ [MutabaahContext] Skipping weekly reports refresh - no employee ID');
        }
      } catch (error) {
      }

      setWeeklyReportSubmissions(submissions);
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
        // 🔥 FIX: Use functional update to get latest state
        setMonthlyProgressData(prev => {
          const newMonthlyActivities = {
            ...prev,
            [monthKey]: progress
          };

          // Update localStorage
          const storedUsers = localStorage.getItem('allUsersData');
          if (storedUsers) {
            try {
              const allUsers = JSON.parse(storedUsers);
              if (allUsers[currentEmployee.id]) {
                allUsers[currentEmployee.id].employee.monthlyActivities = newMonthlyActivities;
                localStorage.setItem('allUsersData', JSON.stringify(allUsers));
              }
            } catch (e) {
            }
          }

          // Update employee in parent store if callback is provided
          if (onUpdateEmployee && currentEmployee) {
            const updatedEmployee = {
              ...currentEmployee,
              monthlyActivities: newMonthlyActivities
            };
            onUpdateEmployee(updatedEmployee);
          }

          return newMonthlyActivities;
        });

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

  // Setup realtime subscription (optional, only if Supabase is configured)
  useEffect(() => {
    if (!employee?.id) return;

    // Check if Supabase is configured before setting up subscription
    const checkAndSetupSubscription = async () => {
      try {
        const { isSupabaseConfigured } = await import('@/lib/supabase');
        if (!isSupabaseConfigured()) {
          return;
        }

        // Subscribe to employee changes
        const channel = supabase
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
                setWeeklyReportSubmissions(newEmployee.weekly_report_submissions || []);

                // Update current month activation
                const currentMonth = getCurrentMonthKey();
                setIsCurrentMonthActivated((newEmployee.activated_months || []).includes(currentMonth));
              }
            }
          )
          .subscribe();

        // Cleanup subscription
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
      }
    };

    checkAndSetupSubscription();
  }, [employee?.id, getCurrentMonthKey]);

  // Initialize when employee changes
  useEffect(() => {
    if (employee && employee.id) {
      // 🔥 FIX: Remove timeout to prevent race condition
      // Initialize immediately to ensure activation status is available
      setIsLoading(true);
      initializeFromEmployee(employee).then(() => {
        setIsLoading(false);
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
    weeklyReportSubmissions,
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
    weeklyReportSubmissions,
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
