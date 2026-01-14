import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon, LockClosedIcon } from './Icons';
import PasswordInput from './PasswordInput';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/types';

interface LoginProps {
    onLogin?: (identifier: string, password: string) => Promise<{ employee: Employee | null; error?: string }>;
    isAuthenticating?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isAuthenticating: propIsAuthenticating }) => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!employeeId || !password) {
            setError('Username/NIP dan Password harus diisi.');
            return;
        }

        // If onLogin prop is provided, use it (for LoginContainer)
        if (onLogin) {
            const result = await onLogin(employeeId, password);
            if (result.error) {
                setError(result.error);
            }
            return;
        }

        // Otherwise use direct login logic
        setIsAuthenticating(true);
        try {
            // Clear any existing Supabase auth sessions
            await supabase.auth.signOut();

            // Query employee by NIP or email
            const { data: employeeData, error } = await supabase
                .from('employees')
                .select('*')
                .or(`id.eq.${employeeId},email.eq.${employeeId}`)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    setError(`NIP/Email "${employeeId}" tidak ditemukan di database.`);
                    return;
                }
                setError(`Database error: ${error.message}`);
                return;
            }

            if (!employeeData) {
                setError(`NIP/Email "${employeeId}" tidak ditemukan. Pastikan NIP/Email sudah benar.`);
                return;
            }

            // 🔥 FIX: Type guard to ensure employeeData is valid Employee
            if ('error' in employeeData || !('id' in employeeData)) {
                setError('Data karyawan tidak valid. Hubungi admin.');
                return;
            }

            const employee = employeeData as Employee;
            const dbIsActive = (employee as any).is_active;
            const isActive = dbIsActive !== false && employee.isActive !== false;

            let isMatch = false;

            // Check if password is hashed
            const isHashed = employee.password && (employee.password.startsWith('$2a$') || employee.password.startsWith('$2b$') || employee.password.startsWith('$2y$'));

            if (isHashed) {
                try {
                    isMatch = bcrypt.compareSync(password, employee.password);
                } catch (err) {
                    // Bcrypt error, password invalid
                }
            } else {
                if (employee.password === password || employee.password === `hashed_${password}`) {
                    isMatch = true;
                }
            }

            if (!isMatch) {
                setError('Password salah. Silakan coba lagi.');
                return;
            }

            // Check if account is active
            if (!isActive) {
                setError(`Akun untuk ${employee.name} (NIP: ${employee.id}) dinonaktifkan. Hubungi Admin.`);
                return;
            }

            // Success - API will handle setting the HTTP-only cookie
            router.push('/dashboard');

        } catch (err: unknown) {
            setError('Terjadi kesalahan saat login. Silakan coba lagi.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center p-4 antialiased">
            <div className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-pop-in p-8 sm:p-10">

                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logorsijsp.png"
                            alt="Logo RSI Jakarta Group"
                            className="h-32 w-auto"
                        />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide text-white leading-tight">
                        APLIKASI PERILAKU PELAYANAN ISLAMI
                    </h1>
                    <p className="text-sm text-slate-300 mt-3">
                        Rumah Sakit Islam Jakarta Group
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                id="nip"
                                type="text"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder="Masukkan NIP atau Email"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 pl-12 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"
                            />
                        </div>
                    </div>
                    <PasswordInput
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password Anda"
                        leadingIcon={<LockClosedIcon className="h-5 w-5 text-slate-500" />}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-12 pr-12 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"
                    />

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isAuthenticating || propIsAuthenticating}
                            className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-teal-500/20 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed transition-all duration-300 mt-4 flex items-center justify-center"
                        >
                            {(isAuthenticating || propIsAuthenticating) && (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isAuthenticating || propIsAuthenticating ? 'Logging In...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;