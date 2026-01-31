import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Lock } from 'lucide-react';
import PasswordInput from './PasswordInput';
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

    const isLoading = isAuthenticating || propIsAuthenticating;

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

        // 🔥 SECURITY FIX: Server-side validation ONLY
        // Client-side password validation removed for security
        // All validation (including password comparison) happens on the server
        setIsAuthenticating(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: employeeId, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login gagal. Silakan coba lagi.');
                return;
            }

            if (data.success) {
                // Server sets HTTP-only cookie, redirect to last visited page or dashboard
                if (typeof window !== 'undefined') {
                    const lastPage = localStorage.getItem('lastVisitedPage');
                    router.push(lastPage || '/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }
        } catch (err: unknown) {
            setError('Terjadi kesalahan saat login. Silakan coba lagi.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-transparent flex items-center justify-center p-4 antialiased">
            <div className="w-full max-w-sm sm:max-w-md mx-auto relative group">
                {/* Decorative background glow */}
                <div className="absolute -inset-1 bg-linear-to-r from-teal-500/20 to-blue-500/20 rounded-2xl blur-xl transition duration-1000 group-hover:duration-200 group-hover:opacity-100 opacity-70"></div>

                <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-pop-in p-8 sm:p-12">
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-8 relative">
                            {/* Glow behind logo */}
                            <div className="absolute inset-0 bg-teal-500/10 blur-2xl rounded-full"></div>
                            <Image
                                src="/logorsijsp.png"
                                alt="Logo RSI Jakarta Group"
                                width={128}
                                height={128}
                                priority
                                className="h-32 w-auto relative drop-shadow-2xl brightness-110"
                            />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight uppercase">
                            Aplikasi Perilaku <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-400">
                                Pelayanan Islami
                            </span>
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group/input">
                                <label htmlFor="nip" className="text-[10px] font-bold text-teal-400 uppercase tracking-widest ml-1 mb-1.5 block opacity-70 group-focus-within/input:opacity-100 transition-opacity">NIP / Email</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
                                    <input
                                        id="nip"
                                        type="text"
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                        placeholder="Masukkan NIP atau Email"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 pl-12 focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 focus:outline-none text-white transition-all placeholder:text-slate-600 font-medium"
                                        suppressHydrationWarning
                                    />
                                </div>
                            </div>

                            <div className="relative group/input">
                                <label htmlFor="password" className="text-[10px] font-bold text-teal-400 uppercase tracking-widest ml-1 mb-1.5 block opacity-70 group-focus-within/input:opacity-100 transition-opacity">Kata Sandi</label>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan kata sandi"
                                    leadingIcon={<Lock className="h-5 w-5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 focus:outline-none text-white transition-all placeholder:text-slate-600 font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isAuthenticating || propIsAuthenticating}
                                className="w-full bg-linear-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-black uppercase tracking-widest py-4 px-4 rounded-xl shadow-xl shadow-teal-500/20 hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center active:scale-[0.98]"
                                suppressHydrationWarning
                            >
                                {(isAuthenticating || propIsAuthenticating) ? (
                                    <div className="flex items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Memproses...</span>
                                    </div>
                                ) : (
                                    <span>Masuk ke Akun</span>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};


export default Login;