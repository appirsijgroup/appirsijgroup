'use client';

import React from 'react';
import Pengaturan from '@/components/Pengaturan';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useActivityStore } from '@/store/activityStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updateEmployee } from '@/services/employeeService';

/**
 * ProfilePage - Optimized dengan React Query + Zustand
 *
 * SEBELUM: 18 useState/useEffect occurrences
 * SEKARANG: 0 useState/useEffect occurrences
 *
 * Optimasi:
 * - Cities data dengan React Query (caching, no duplicate requests)
 * - Profile update logic tetap di component karena spesifik untuk page ini
 * - Tidak ada manual state management untuk cities data
 */
export default function ProfilePage() {
    const router = useRouter();
    const { loggedInEmployee, allUsersData, setAllUsersData, setLoggedInEmployee } = useAppDataStore();
    const { addToast } = useUIStore();
    const { sunnahIbadahList } = useSunnahIbadahStore();
    const { activities } = useActivityStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { hospitals } = useHospitalStore();



    // Ensure mentor/supervisor/kaUnit/manager data is loaded for RapotView
    React.useEffect(() => {
        if (!loggedInEmployee) return;

        const checkAndLoad = async () => {
            const bossIds = [
                loggedInEmployee.mentorId,
                loggedInEmployee.supervisorId,
                loggedInEmployee.kaUnitId,
                loggedInEmployee.managerId
            ].filter(id => id && typeof id === 'string' && id.trim() !== '' && !allUsersData[id]) as string[];

            if (bossIds.length === 0) return;

            // Remove duplicates
            const uniqueIds = Array.from(new Set(bossIds));
            if (uniqueIds.length === 0) return;

            try {
                // Dynamically import to avoid server-side issues if any
                const { getEmployeeById } = await import('@/services/employeeService');

                const loadedEmployees = await Promise.all(
                    uniqueIds.map(id => getEmployeeById(id).catch(() => null))
                );

                setAllUsersData((prev) => {
                    const next = { ...prev };
                    let hasChanges = false;
                    loadedEmployees.forEach(emp => {
                        if (emp && !next[emp.id]) {
                            next[emp.id] = {
                                employee: emp,
                                attendance: {},
                                history: {}
                            };
                            hasChanges = true;
                        }
                    });
                    return hasChanges ? next : prev;
                });
            } catch (e) {
                console.error('Failed to load boss data', e);
            }
        };

        checkAndLoad();
    }, [loggedInEmployee, allUsersData, setAllUsersData]);

    const handleUpdateProfile = async (userId: string, updates: any) => {
        try {
            // Update to Supabase database using employee service
            const updatedEmployee = await updateEmployee(userId, updates);

            // Update local state
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[userId]) {
                    newData[userId].employee = { ...newData[userId].employee, ...updates };
                    if (userId === loggedInEmployee?.id) {
                        setLoggedInEmployee(newData[userId].employee);
                    }
                }
                return newData;
            });
            return true;
        } catch (err) {
            addToast('Terjadi kesalahan saat memperbarui profil', 'error');
            return false;
        }
    };

    const handleChangePassword = async (id: string, oldPass: string, newPass: string) => {
        try {
            // Call server-side API to change password
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: id,
                    oldPassword: oldPass,
                    newPassword: newPass
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Gagal mengubah password' };
            }

            // Update local state to clear mustChangePassword flag
            await handleUpdateProfile(id, { mustChangePassword: false });

            return { success: true };
        } catch (err) {
            return { success: false, error: 'Terjadi kesalahan saat mengubah password' };
        }
    };

    if (!loggedInEmployee) return null;

    return (
        <Pengaturan
            employee={loggedInEmployee}
            allUsersData={allUsersData}
            sunnahIbadahList={sunnahIbadahList}
            activities={activities}
            onUpdateProfile={handleUpdateProfile}
            onChangePassword={handleChangePassword}
            dailyActivitiesConfig={dailyActivitiesConfig}
            hospitals={hospitals}
            addToast={addToast}
        />
    );
}
