'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MonthlyActivities from '@/components/MonthlyActivities';
import { useAppDataStore, useDailyActivitiesStore, useUIStore } from '@/store/store';
import { useMutabaahStore } from '@/store/mutabaahStore';
import MinimalistLoader from '@/components/MinimalistLoader';
import { submitMonthlyReport as submitReport, hasSubmittedReport } from '@/services/monthlySubmissionService';
import { getAllEmployees } from '@/services/employeeService';

export default function AktivitasBulananPage() {
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { addToast } = useUIStore();
    const { mutabaahLockingMode, loadFromSupabase } = useMutabaahStore();
    const { loggedInEmployee, loadDetailedEmployeeData, allUsersData } = useAppDataStore();
    const [date, setDate] = useState<Date>(new Date());
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    const {
        isCurrentMonthActivated,
        monthlyProgressData,
        activateMonth,
        updateMonthlyProgress,
        monthlyReportSubmissions,
        refreshData,
        isLoading,
    } = useMutabaahStore();

    // 🔥 FIX: Move useMemo BEFORE conditional returns to avoid hooks order issue
    const enrichedMonthlyProgressData = useMemo(() => {
        // High fidelity source: store's loggedInEmployee.monthlyActivities
        // This is pre-loaded via loadDetailedEmployeeData in Dashboard
        return loggedInEmployee?.monthlyActivities || monthlyProgressData || {};
    }, [loggedInEmployee?.monthlyActivities, monthlyProgressData]);

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

    const handleSubmitReport = async (monthKey: string) => {
        if (!loggedInEmployee) {
            addToast('User tidak ditemukan', 'error');
            return;
        }

        try {
            // Check if already submitted
            const alreadySubmitted = await hasSubmittedReport(
                loggedInEmployee.id,
                monthKey
            );

            if (alreadySubmitted) {
                addToast('Laporan untuk bulan ini sudah dikirim.', 'error');
                return;
            }

            const submissionPayload = {
                content: monthlyProgressData[monthKey] || {},
                menteeName: loggedInEmployee.name,
                mentorId: loggedInEmployee.mentorId,
                supervisorId: loggedInEmployee.supervisorId,
                managerId: loggedInEmployee.managerId,
                kaUnitId: loggedInEmployee.kaUnitId,
                hospitalId: loggedInEmployee.hospitalId,
                unit: loggedInEmployee.unit,
                bagian: loggedInEmployee.bagian
            };

            const result = await submitReport(
                loggedInEmployee.id,
                monthKey,
                submissionPayload
            );

            if (result) {
                addToast('Laporan bulanan berhasil dikirim!', 'success');
                // Refresh data to update the UI
                await refreshData();
            } else {
                addToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
            }
        } catch (error) {
            addToast('Terjadi kesalahan saat mengirim laporan.', 'error');
        }
    };

    // Conditional renders MUST be AFTER all hooks
    if (!loggedInEmployee || isLoading) {
        return <MinimalistLoader message="Memuat data mutabaah..." />;
    }

    if (isLoadingEmployees) {
        return <MinimalistLoader message="Memuat data karyawan..." />;
    }

    return (
        <MonthlyActivities
            employee={loggedInEmployee}
            allUsers={Object.values(allUsersData).map(data => data.employee)}
            monthlyProgressData={enrichedMonthlyProgressData}
            onUpdate={handleUpdateMonthlyActivities}
            onActivateMonth={handleActivateMonth}
            monthlyReportSubmissions={monthlyReportSubmissions}
            onSubmitReport={handleSubmitReport}
            date={date}
            onDateChange={setDate}
            dailyActivitiesConfig={dailyActivitiesConfig}
            mutabaahLockingMode={mutabaahLockingMode}
        />
    );
}
