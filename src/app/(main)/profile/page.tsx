'use client';

import React from 'react';
import Pengaturan from '@/components/Pengaturan';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useActivityStore } from '@/store/activityStore';
import { useCities } from '@/store/locationStore';
import { useRouter } from 'next/navigation';
import bcrypt from 'bcryptjs';
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

    // React Query untuk cities data (otomatis caching, loading, error handling)
    const { data: cities = [], isLoading: citiesLoading } = useCities();

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
            console.error('❌ Error updating profile:', err);
            addToast('Terjadi kesalahan saat memperbarui profil', 'error');
            return false;
        }
    };

    const handleChangePassword = async (id: string, newPass: string) => {
        try {
            // 1. Hash the new password with bcrypt
            const saltRounds = 10;
            const hashedPassword = bcrypt.hashSync(newPass, saltRounds);

            // 2. Update to Supabase using employee service
            await updateEmployee(id, {
                password: hashedPassword,
                mustChangePassword: false // Clear flag after password change
            });

            // 3. Update local state with plain text password (for current session)
            // In production, you might want to keep only the hashed version
            await handleUpdateProfile(id, { password: newPass, mustChangePassword: false });

            return true;
        } catch (err) {
            console.error('❌ Error changing password:', err);
            addToast('Terjadi kesalahan saat mengubah password', 'error');
            return false;
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
            cities={cities}
            addToast={addToast}
        />
    );
}
