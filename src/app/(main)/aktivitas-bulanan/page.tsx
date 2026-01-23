'use client';

import React, { useState, useEffect } from 'react';
import MonthlyActivities from '@/components/MonthlyActivities';
import { useAppDataStore, useDailyActivitiesStore, useMutabaahStore, useUIStore } from '@/store/store';
import { useMutabaah } from '@/contexts/MutabaahContext';
import { submitWeeklyReport, hasSubmittedReport } from '@/services/weeklyReportService';
import { getAllEmployees } from '@/services/employeeService';

export default function AktivitasBulananPage() {
    const { loggedInEmployee, allUsersData, setAllUsersData } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { addToast } = useUIStore();
    const { mutabaahLockingMode, loadFromSupabase } = useMutabaahStore();
    const [date, setDate] = useState<Date>(new Date());
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    // 🔥 DEBUG: Log employee activation status
    useEffect(() => {
        if (loggedInEmployee) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const months = loggedInEmployee.activatedMonths || loggedInEmployee.activated_months || [];
            const isActivated = months.includes(currentMonth);

            console.log('🔍 [AktivitasBulananPage] Employee status:', {
                id: loggedInEmployee.id,
                name: loggedInEmployee.name,
                role: loggedInEmployee.role,
                currentMonth,
                isActivated,
                activatedMonths: months,
                activatedMonthsCount: months.length
            });
        }
    }, [loggedInEmployee]);

    // 🔥 FIX: Load mutabaah locking mode from Supabase on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                await loadFromSupabase();
            } catch (error) {
            }
        };
        loadSettings();
    }, [loadFromSupabase]);

    // ⚡ FIX: Load employees if allUsersData is empty
    useEffect(() => {
        const loadEmployeesIfNeeded = async () => {
            // Check if we need to load employees
            const isEmpty = Object.keys(allUsersData).length === 0;

            if (isEmpty && !isLoadingEmployees) {
                setIsLoadingEmployees(true);

                try {
                    const employees = await getAllEmployees();

                    // Load attendance data for all employees
                    const { getAllAttendanceRecords } = await import('@/services/attendanceService');
                    let allAttendanceData: Record<string, Record<string, any>> = {};

                    try {
                        const allRecords = await getAllAttendanceRecords();

                        // Convert to per-employee format
                        Object.entries(allRecords).forEach(([employeeId, records]: [string, any]) => {
                            allAttendanceData[employeeId] = {};
                            Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                                if (record && record.status) {
                                    allAttendanceData[employeeId][entityId] = {
                                        status: record.status,
                                        reason: record.reason || null,
                                        timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                        submitted: true,
                                        isLateEntry: record.is_late_entry || false
                                    };
                                }
                            });
                        });
                    } catch (error) {
                    }

                    // Build complete users data structure
                    const newData: Record<string, any> = {};
                    for (const emp of employees) {
                        newData[emp.id] = {
                            employee: emp,
                            attendance: allAttendanceData[emp.id] || {},
                            history: {}
                        };
                    }
                    setAllUsersData(() => newData);

                } catch (error) {
                } finally {
                    setIsLoadingEmployees(false);
                }
            }
        };

        loadEmployeesIfNeeded();
    }, [allUsersData, setAllUsersData, isLoadingEmployees]);

    const {
        isCurrentMonthActivated,
        monthlyProgressData,
        activateMonth,
        updateMonthlyProgress,
        weeklyReportSubmissions,
        refreshData,
        isLoading,
    } = useMutabaah();

    const handleUpdateMonthlyActivities = async (userId: string, monthKey: string, monthProgress: any) => {
        // 🔥 FIX: BERSIHKAN data sebelum disimpan!
        // Filter out any foreign fields from monthProgress
        const cleanedMonthProgress: any = {};
        Object.keys(monthProgress).forEach(key => {
            // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
            if (key.match(/^\d{2}$/)) {
                cleanedMonthProgress[key] = monthProgress[key];
            }
            // Field asing (kie, doaBersama, dll) akan DIHAPUS!
        });

        // Update via Supabase using context
        const success = await updateMonthlyProgress(monthKey, cleanedMonthProgress);
        if (!success) {
            // Fallback to localStorage if needed
            // Anda bisa menambahkan logic fallback di sini jika diperlukan
        }
    };

    const handleActivateMonth = async (userId: string, monthKey: string) => {
        // Activate via Supabase using context
        // userId parameter is provided by the component but not used since context has access to employee
        const success = await activateMonth(monthKey);
        if (!success) {
        } else {
            // 🔥 CRITICAL FIX: Refresh data after successful activation to ensure UI updates immediately
            // This ensures that the activation status propagates to all components that depend on it
            await refreshData();
        }
    };

    const handleSubmitReport = async (monthKey: string, weekIndex: number) => {
        if (!loggedInEmployee) {
            addToast('User tidak ditemukan', 'error');
            return;
        }

        try {
            // Check if already submitted
            const alreadySubmitted = await hasSubmittedReport(
                loggedInEmployee.id,
                monthKey,
                weekIndex
            );

            if (alreadySubmitted) {
                addToast('Laporan untuk minggu ini sudah dikirim. Silakan edit jika ingin mengubah.', 'error');
                return;
            }

            // Submit the report - get current month progress data
            const monthProgress = monthlyProgressData[monthKey] || {};
            const reportData = monthProgress[weekIndex] || {};

            const result = await submitWeeklyReport(
                loggedInEmployee.id,
                monthKey,
                weekIndex,
                reportData
            );

            if (result) {
                addToast('Laporan mingguan berhasil dikirim!', 'success');
                // Refresh data to update the UI
                await refreshData();
            } else {
                addToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
            }
        } catch (error) {
            addToast('Terjadi kesalahan saat mengirim laporan.', 'error');
        }
    };

    if (!loggedInEmployee || isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (isLoadingEmployees) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <MonthlyActivities
            employee={loggedInEmployee}
            allUsers={Object.values(allUsersData).map(data => data.employee)}
            monthlyProgressData={monthlyProgressData || {}}
            onUpdate={handleUpdateMonthlyActivities}
            onActivateMonth={handleActivateMonth}
            weeklyReportSubmissions={weeklyReportSubmissions}
            onSubmitReport={handleSubmitReport}
            date={date}
            onDateChange={setDate}
            dailyActivitiesConfig={dailyActivitiesConfig}
            mutabaahLockingMode={mutabaahLockingMode}
        />
    );
}
