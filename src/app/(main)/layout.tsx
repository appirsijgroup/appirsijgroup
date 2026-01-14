'use client';

import { useAppDataStore } from '@/store/store';
import MainLayoutShell from '@/components/MainLayoutShell';
import { MutabaahProvider } from '@/contexts/MutabaahContext';
import DataLoader from '@/components/DataLoader';
import type { Employee } from '@/types';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { loggedInEmployee, setAllUsersData, setLoggedInEmployee } = useAppDataStore();

    const handleUpdateEmployee = (updatedEmployee: Employee) => {
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
            console.log('loggedInEmployee also updated to maintain consistency');
        }

        console.log('Employee data updated in store');
    };

    return (
        <MutabaahProvider employee={loggedInEmployee} onUpdateEmployee={handleUpdateEmployee}>
            <DataLoader>
                <MainLayoutShell>{children}</MainLayoutShell>
            </DataLoader>
        </MutabaahProvider>
    );
}
