'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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

  // Helper function to get current month key (stable reference, no dependencies)
  const getCurrentMonthKey = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  // ⚡ OPTIMIZATION: Quick initialize - just load basic data immediately
  // Heavy operations like attendance sync will run in background
  const initializeFromEmployee = useCallback(async (emp: Employee) => {
    console.log('🔄 MutabaahContext: Quick initializing from employee object', {
      employeeId: emp.id,
      activatedMonths: emp.activated_months || emp.activatedMonths,
      hasActivities: !!(emp.monthly_activities || emp.monthlyActivities)
    });

    // Use data directly from employee object (already fresh from Supabase)
    const months = emp.activated_months || emp.activatedMonths || [];
    const activities = emp.monthly_activities || emp.monthlyActivities || {};

    // 🔥 Define currentMonth
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const isActivated = months.includes(currentMonth);

    // ⚡ IMMEDIATE: Update state with basic data first (non-blocking)
    setActivatedMonths(months);
    setMonthlyProgressData(activities);
    setIsCurrentMonthActivated(isActivated);

    console.log('✅ MutabaahContext basic state updated immediately');

    // 🚀 DEFER: Run heavy operations in background using setTimeout
    // This allows UI to render immediately without blocking
    setTimeout(async () => {
      console.log('🔄 Starting background sync...');

      // Sync attendance records from Supabase to monthly progress
      try {
        const { getEmployeeAttendance } = await import('@/services/attendanceService');
        const attendanceRecords = await getEmployeeAttendance(emp.id);

        // Sync attendance to monthly progress for current month
        const updatedActivities = { ...activities };
        if (!updatedActivities[currentMonth]) {
          updatedActivities[currentMonth] = {};
        }

        // For each attendance record, sync to the corresponding day in monthly progress
        let syncedCount = 0;
        Object.entries(attendanceRecords).forEach(([entityId, record]) => {
          // Parse timestamp to get day of month
          const attendanceDate = new Date(record.timestamp);
          const dayOfMonth = attendanceDate.getDate();
          const dayKey = dayOfMonth.toString().padStart(2, '0');

          // Get the month key from attendance timestamp
          const recordMonthKey = `${attendanceDate.getFullYear()}-${(attendanceDate.getMonth() + 1).toString().padStart(2, '0')}`;

          // Only sync if attendance is from current month
          if (recordMonthKey === currentMonth && record.status === 'hadir') {
            // Initialize day progress if not exists
            if (!updatedActivities[currentMonth][dayKey]) {
              updatedActivities[currentMonth][dayKey] = {};
            }

            // Mark shalat_berjamaah as done for this day
            updatedActivities[currentMonth][dayKey]['shalat_berjamaah'] = true;
            syncedCount++;
          }
        });

        if (syncedCount > 0) {
          // Update state with synced data
          setMonthlyProgressData(updatedActivities);

          // Save synced attendance data to Supabase
          try {
            const { updateMonthlyProgress } = await import('@/services/monthlyActivityService');
            await updateMonthlyProgress(emp.id, currentMonth, updatedActivities[currentMonth]);

            // CRITICAL: Update employee in parent store with synced monthlyActivities
            if (onUpdateEmployee) {
              const updatedEmployee = {
                ...emp,
                monthlyActivities: updatedActivities,
                monthly_activities: updatedActivities
              };
              onUpdateEmployee(updatedEmployee);
            }
          } catch (error) {
            console.error('⚠️ Error saving monthly progress to Supabase:', error);
          }
        } else {
          console.log('ℹ️ No new attendance records to sync');
        }
      } catch (error) {
        console.error('⚠️ Error in background attendance sync:', error);
        // Continue without attendance sync - not critical
      }

      // Load weekly report submissions in background (low priority)
      try {
        const { getUserWeeklyReports } = await import('@/services/weeklyReportService');
        const submissions = await getUserWeeklyReports(emp.id);
        setWeeklyReportSubmissions(submissions);
        console.log('📊 Loaded weekly reports in background:', submissions.length);
      } catch (error) {
        console.error('⚠️ Error loading weekly report submissions in background:', error);
      }

      console.log('✅ Background sync completed');
    }, 100); // 100ms delay to allow UI to render first
  }, [onUpdateEmployee]);

  // Sync data to Supabase (optional, runs in background)
  const syncToSupabase = useCallback(async (empId: string) => {
    try {
      // Check if Supabase is configured
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, skipping sync');
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
        console.warn('Supabase fetch error (non-critical):', fetchError.message);
        return;
      }

      // If no record exists, create one
      if (!existingData) {
        console.log('Creating new employee record in Supabase...');
        // Note: You'll need to implement this based on your actual schema
        // This is a placeholder showing where you'd do it
      }

    } catch (err) {
      // Non-critical error, log but don't crash
      console.warn('Supabase sync warning (non-critical):', err);
    }
  }, []);

  // Refresh weekly reports only (don't re-initialize everything to avoid stale data)
  const refreshData = useCallback(async () => {
    console.log('🔄 refreshData called - refreshing weekly reports only');
    if (employee && employee.id) {
      setIsLoading(true);
      try {
        // Only refresh weekly report submissions, not the entire employee data
        // Employee data is already fresh from AppDataProvider
        let submissions: WeeklyReportSubmission[] = [];
        try {
          const { getUserWeeklyReports } = await import('@/services/weeklyReportService');
          submissions = await getUserWeeklyReports(employee.id);
          console.log('📊 Refreshed weekly reports:', submissions.length);
        } catch (error) {
          console.error('Error refreshing weekly report submissions:', error);
        }

        setWeeklyReportSubmissions(submissions);
      } catch (err) {
        console.error('Error refreshing data:', err);
        setError('Gagal menyegarkan data');
      } finally {
        setIsLoading(false);
        console.log('✅ Weekly reports refreshed');
      }
    }
  }, [employee?.id]); // Use employee.id instead of full object

  // Check current month activation status
  const checkCurrentMonthActivation = useCallback(() => {
    const currentMonth = getCurrentMonthKey();
    const isActivated = activatedMonths.includes(currentMonth);
    setIsCurrentMonthActivated(isActivated);
    return isActivated;
  }, [activatedMonths, getCurrentMonthKey]);

  // Activate month for employee
  const activateMonth = useCallback(async (monthKey: string): Promise<boolean> => {
    console.log('🎯 MutabaahContext: activateMonth called with:', monthKey);
    if (!employee?.id) {
      console.error('❌ No employee found');
      return false;
    }

    try {
      // Check if month is already activated
      if (activatedMonths.includes(monthKey)) {
        console.warn('⚠️ Month already activated:', monthKey);
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
          console.error('❌ Cannot activate past month');
          return false;
        }
      }

      console.log('💾 Saving to Supabase...');
      // Use service to activate month in Supabase
      const success = await activateMonthService(employee.id, monthKey);
      console.log('✅ Supabase save result:', success);

      if (success) {
        const newActivatedMonths = [...activatedMonths, monthKey];

        // Update local state IMMEDIATELY
        setActivatedMonths(newActivatedMonths);
        console.log('✅ Updated local activated months:', newActivatedMonths);

        // Update current month activation if this is the current month
        const currentMonth = getCurrentMonthKey();
        if (monthKey === currentMonth) {
          setIsCurrentMonthActivated(true);
          console.log('✅ Updated current month activation to true');
        }

        // Update localStorage (backup)
        try {
          const storedUsers = localStorage.getItem('allUsersData');
          if (storedUsers) {
            const allUsers = JSON.parse(storedUsers);
            if (allUsers[employee.id]) {
              // Handle both camelCase and snake_case
              allUsers[employee.id].employee.activatedMonths = newActivatedMonths;
              allUsers[employee.id].employee.activated_months = newActivatedMonths;
              localStorage.setItem('allUsersData', JSON.stringify(allUsers));
              console.log('✅ Updated localStorage');
            }
          }
        } catch (e) {
          console.error('⚠️ Failed to update localStorage:', e);
        }

        // Update employee in parent store if callback is provided
        if (onUpdateEmployee && employee) {
          const updatedEmployee = {
            ...employee,
            activatedMonths: newActivatedMonths,
            activated_months: newActivatedMonths // Update both formats
          };
          console.log('📤 Calling onUpdateEmployee with:', updatedEmployee);
          onUpdateEmployee(updatedEmployee);
          console.log('✅ Employee updated in store');
        }

        console.log('✅ Month activation completed successfully!');
        return true;
      } else {
        setError('Gagal mengaktifkan bulan di Supabase');
        console.error('❌ Failed to activate month in Supabase');
        return false;
      }

    } catch (err) {
      console.error('❌ Error activating month:', err);
      setError('Gagal mengaktifkan lembar mutaba\'ah');
      return false;
    }
  }, [employee?.id, employee, activatedMonths, getCurrentMonthKey, onUpdateEmployee]);

  // Update monthly progress
  const updateMonthlyProgress = useCallback(async (monthKey: string, progress: MonthlyActivityProgress): Promise<boolean> => {
    if (!employee?.id) return false;

    try {
      // Use service to update monthly progress in Supabase
      const success = await updateMonthlyProgressService(employee.id, monthKey, progress);

      if (success) {
        const newMonthlyActivities = {
          ...monthlyProgressData,
          [monthKey]: progress
        };

        // Always update local state
        setMonthlyProgressData(newMonthlyActivities);

        // Update localStorage
        const storedUsers = localStorage.getItem('allUsersData');
        if (storedUsers) {
          try {
            const allUsers = JSON.parse(storedUsers);
            if (allUsers[employee.id]) {
              allUsers[employee.id].employee.monthlyActivities = newMonthlyActivities;
              localStorage.setItem('allUsersData', JSON.stringify(allUsers));
            }
          } catch (e) {
            console.error('Failed to update localStorage:', e);
          }
        }

        // Update employee in parent store if callback is provided
        if (onUpdateEmployee && employee) {
          const updatedEmployee = {
            ...employee,
            monthlyActivities: newMonthlyActivities
          };
          onUpdateEmployee(updatedEmployee);
        }

        return true;
      } else {
        setError('Gagal menyimpan progres ke Supabase');
        return false;
      }

    } catch (err) {
      console.error('Error updating monthly progress:', err);
      setError('Gagal menyimpan progres bulanan');
      return false;
    }
  }, [employee?.id, monthlyProgressData]);

  // Setup realtime subscription (optional, only if Supabase is configured)
  useEffect(() => {
    if (!employee?.id) return;

    // Check if Supabase is configured before setting up subscription
    const checkAndSetupSubscription = async () => {
      try {
        const { isSupabaseConfigured } = await import('@/lib/supabase');
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, skipping realtime subscription');
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
              console.log('Employee data changed via realtime:', payload);
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
        console.warn('Failed to setup realtime subscription (non-critical):', err);
      }
    };

    checkAndSetupSubscription();
  }, [employee?.id, getCurrentMonthKey]);

  // Initialize when employee changes
  useEffect(() => {
    if (employee) {
      // Short timeout to ensure smooth transition
      const timeoutId = setTimeout(() => {
        initializeFromEmployee(employee);
        setIsLoading(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      setIsLoading(false);
      setIsCurrentMonthActivated(false);
      setActivatedMonths([]);
      setMonthlyProgressData({});
      setWeeklyReportSubmissions([]);
    }
  }, [employee?.id]); // Only depend on employee.id, not the whole object or function

  const value: MutabaahContextType = {
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
  };

  return (
    <MutabaahContext.Provider value={value}>
      {children}
    </MutabaahContext.Provider>
  );
};
