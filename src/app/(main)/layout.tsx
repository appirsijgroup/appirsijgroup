'use client';

import { useAppDataStore } from '@/store/store';
import MainLayoutShell from '@/components/MainLayoutShell';
import { MutabaahProvider } from '@/contexts/MutabaahContext';
import DataLoader from '@/components/DataLoader';
import type { Employee } from '@/types';
import { useCallback } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { loggedInEmployee, setAllUsersData, setLoggedInEmployee } = useAppDataStore();

    const handleUpdateEmployee = useCallback((updatedEmployee: Employee) => {
        // Update the main store
        setAllUsersData(prev => ({
            ...prev,
            [updatedEmployee.id]: {
                ...prev[updatedEmployee.id],
                employee: updatedEmployee
            }
        }));

        // CRITICAL FIX: Also update loggedInEmployee if it's the same user
        // This prevents data inconsistency between allUsersData and loggedInEmployee
        if (loggedInEmployee && loggedInEmployee.id === updatedEmployee.id) {
            setLoggedInEmployee(updatedEmployee);
        }

    }, [loggedInEmployee, setAllUsersData, setLoggedInEmployee]);

    return (
        <MutabaahProvider employee={loggedInEmployee} onUpdateEmployee={handleUpdateEmployee}>
            <DataLoader>
                <MainLayoutShell>{children}</MainLayoutShell>
            </DataLoader>
        </MutabaahProvider>
    );
}
