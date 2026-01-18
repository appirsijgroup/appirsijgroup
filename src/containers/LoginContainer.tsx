'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';
import BrandedLoader from '@/components/BrandedLoader';
import { useAppDataStore } from '@/store/store';

const LoginContainer = () => {
    const router = useRouter();
    const { setLoggedInEmployee } = useAppDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');

    const handleLogin = async (identifier: string, password: string) => {
        setIsLoading(true);
        setLoadingMessage('Memproses login...');

        try {
            console.log('🔑 Login:', identifier);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setIsLoading(false);
                return { employee: null, error: data.error };
            }

            // Simpan ke localStorage untuk client-side
            localStorage.setItem('loggedInUserId', data.employee.id);

            console.log('✅ Success:', data.employee.name);

            // 🔥 ENHANCEMENT: Show branded loading before redirect
            setLoadingMessage(`Selamat datang, ${data.employee.name}!`);

            // Tunggu sebentar untuk menampilkan loading dengan logo
            await new Promise(resolve => setTimeout(resolve, 800));

            // Redirect ke dashboard
            // MainLayoutShell akan memuat data lengkap melalui loadLoggedInEmployee()
            router.push('/dashboard');

            return { employee: data.employee };

        } catch (err) {
            console.error('❌ Error:', err);
            setIsLoading(false);
            return { employee: null, error: 'Terjadi kesalahan' };
        }
    };

    // 🔥 FIX: Show BrandedLoader overlay when loading, not replacing the entire page
    if (isLoading) {
        return <BrandedLoader message={loadingMessage} />;
    }

    return (
        <Login
            onLogin={handleLogin}
            isAuthenticating={false}
        />
    );
};

export default LoginContainer;
