'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';
import { useAppDataStore } from '@/store/store';

const LoginContainer = () => {
    const router = useRouter();
    const { setLoggedInEmployee } = useAppDataStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (identifier: string, password: string) => {
        setIsLoading(true);

        try {
            console.log('🔑 Login:', identifier);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { employee: null, error: data.error };
            }

            // Simpan ke localStorage untuk client-side
            localStorage.setItem('loggedInUserId', data.employee.id);

            console.log('✅ Success:', data.employee.name);

            // Redirect ke dashboard
            // MainLayoutShell akan memuat data lengkap melalui loadLoggedInEmployee()
            router.push('/dashboard');

            return { employee: data.employee };

        } catch (err) {
            console.error('❌ Error:', err);
            return { employee: null, error: 'Terjadi kesalahan' };
        } finally {
            setIsLoading(false);
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
