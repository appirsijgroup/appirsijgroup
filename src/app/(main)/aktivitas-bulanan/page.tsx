'use client';

import React, { useState, useEffect } from 'react';
import MonthlyActivities from '@/components/MonthlyActivities';
import { useAppDataStore, useDailyActivitiesStore, useMutabaahStore } from '@/store/store';
import { useMutabaah } from '@/contexts/MutabaahContext';
import { submitWeeklyReport, hasSubmittedReport } from '@/services/weeklyReportService';
import { getAllEmployees } from '@/services/employeeService';

export default function AktivitasBulananPage() {
    const { loggedInEmployee, allUsersData, setAllUsersData } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { mutabaahLockingMode, loadFromSupabase } = useMutabaahStore();
    const [date, setDate] = useState<Date>(new Date());
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    // 🔥 FIX: Load mutabaah locking mode from Supabase on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                await loadFromSupabase();
                console.log('✅ Loaded mutabaah locking mode from Supabase');
            } catch (error) {
                console.error('❌ Error loading mutabaah locking mode:', error);
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
                console.log('🔄 allUsersData is empty in aktivitas-bulanan, loading from Supabase...');
                setIsLoadingEmployees(true);

                try {
                    const employees = await getAllEmployees();
                    console.log(`✅ Loaded ${employees.length} employees in aktivitas-bulanan`);

                    // Load attendance data for all employees
                    const { getAllAttendanceRecords } = await import('@/services/attendanceService');
                    let allAttendanceData: Record<string, Record<string, any>> = {};

                    try {
                        const allRecords = await getAllAttendanceRecords();
                        console.log(`✅ Loaded attendance data for ${Object.keys(allRecords).length} employees`);

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
                        console.error('⚠️ Error loading bulk attendance:', error);
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

                    console.log('✅ Employee data loaded and ready in aktivitas-bulanan');
                } catch (error) {
                    console.error('❌ Error loading employees in aktivitas-bulanan:', error);
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
        // Update via Supabase using context
        const success = await updateMonthlyProgress(monthKey, monthProgress);
        if (!success) {
            console.error('Gagal menyimpan progres ke Supabase');
            // Fallback to localStorage if needed
            // Anda bisa menambahkan logic fallback di sini jika diperlukan
        }
    };

    const handleActivateMonth = async (userId: string, monthKey: string) => {
        console.log("handleActivateMonth called");
        // Activate via Supabase using context
        // userId parameter is provided by the component but not used since context has access to employee
        const success = await activateMonth(monthKey);
        console.log('activateMonth result:', success);
        if (!success) {
            console.error('Gagal mengaktifkan bulan di Supabase');
        } else {
            console.log('Berhasil mengaktifkan bulan');
            // No need to refresh data here - activateMonth already updates local state correctly
            // Calling refreshData() here can cause race conditions with Supabase data
        }
    };

    const handleSubmitReport = async (monthKey: string, weekIndex: number) => {
        if (!loggedInEmployee) {
            alert('User tidak ditemukan');
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
                alert('Laporan untuk minggu ini sudah dikirim. Silakan edit jika ingin mengubah.');
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
                alert('Laporan mingguan berhasil dikirim!');
                // Refresh data to update the UI
                await refreshData();
            } else {
                alert('Gagal mengirim laporan. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Error submitting weekly report:', error);
            alert('Terjadi kesalahan saat mengirim laporan.');
        }
    };

    if (!loggedInEmployee || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Memuat data...</p>
                </div>
            </div>
        );
    }

    if (isLoadingEmployees) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Memuat data employees...</p>
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
