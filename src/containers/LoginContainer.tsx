'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';
import { useAppDataStore, useUIStore } from '@/store/store';

import { timeValidationService } from '@/services/timeValidationService';
import { useEffect } from 'react';

const LoginContainer = () => {
    const router = useRouter();
    const { loggedInEmployee, setLoggedInEmployee, setHydrated, setAllUsersData, setIsLoggingOut } = useAppDataStore();
    const { setGlobalLoading } = useUIStore();
    const [isLoading, setIsLoading] = useState(false);

    const [loadingMessage, setLoadingMessage] = useState('Memuat...');

    // 🔥 FIX: Clear global loading when on login page (e.g. after logout)
    useEffect(() => {
        setGlobalLoading(false);
        setIsLoggingOut(false);
    }, [setGlobalLoading, setIsLoggingOut]);

    // 🔥 FIX: Redirect to dashboard if already logged in (prevents "stuck" on login page)
    useEffect(() => {
        if (loggedInEmployee && !isLoading) {
            router.push('/dashboard');
        }
    }, [loggedInEmployee, router, isLoading]);

    const handleLogin = async (identifier: string, password: string) => {
        setIsLoading(true);
        setGlobalLoading(true, 'Menyiapkan Sesi...');
        setLoadingMessage('Menyiapkan Sesi...');

        try {


            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setIsLoading(false);
                setGlobalLoading(false);
                return { employee: null, error: data.error };
            }


            const employee = data.employee;

            // 🔥 OPTIMIZATION: Set store state immediately before redirect
            // This prevents MainLayoutShell from showing skeleton and calling /api/auth/me again
            localStorage.setItem('loggedInUserId', employee.id);

            // Sync time in background (don't wait for it if we want maximum speed, 
            // but syncWithServerTime is generally fast)
            timeValidationService.syncWithServerTime();

            // Store in global state
            setLoggedInEmployee(employee);
            setHydrated(true); // Mark as hydrated so MainLayoutShell doesn't reload
            setAllUsersData(prev => ({
                ...prev,
                [employee.id]: {
                    employee,
                    attendance: prev[employee.id]?.attendance || {},
                    history: prev[employee.id]?.history || {}
                }
            }));

            // Redirect ke dashboard
            router.push('/dashboard');

            return { employee };


        } catch (err) {
            setIsLoading(false);
            setGlobalLoading(false);
            return { employee: null, error: 'Terjadi kesalahan' };
        }

    };

    return (
        <Login
            onLogin={handleLogin}
            isAuthenticating={isLoading}
        />
    );
};

export default LoginContainer;
