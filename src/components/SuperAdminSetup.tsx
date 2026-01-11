import React, { useState } from 'react';
import type { Employee, Hospital } from '../types';
import { MosqueIcon } from './Icons';
import { validatePassword, isPasswordValid, type PasswordValidationResult } from './passwordUtils';
import PasswordInput from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

interface SuperAdminSetupProps {
    onSetup: (hospitalData: Omit<Hospital, 'id' | 'isActive'>, adminData: Pick<Employee, 'id' | 'name' | 'password' | 'unit' | 'bagian' | 'professionCategory' | 'profession' | 'gender'>) => void;
}

const SuperAdminSetup: React.FC<SuperAdminSetupProps> = ({ onSetup }) => {
    const [hospitalBrand, setHospitalBrand] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [adminNopeg, setAdminNopeg] = useState('');
    const [adminName, setAdminName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        setPasswordValidation(validatePassword(newPassword));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!hospitalBrand || !hospitalName || !adminNopeg || !adminName || !password) {
            setError('Semua kolom wajib diisi.');
            return;
        }
        
        if (!isPasswordValid(validatePassword(password))) {
            setError('Password tidak memenuhi syarat keamanan.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok.');
            return;
        }

        const hospitalData = {
            brand: hospitalBrand,
            name: hospitalName,
            address: '', // Address can be edited later by the admin
            logo: null,
        };

        const adminData = {
            id: adminNopeg,
            name: adminName,
            password: password,
            // These are dummy values, can be edited later in profile
            unit: 'Manajemen',
            bagian: 'Direksi',
            professionCategory: 'NON MEDIS' as const,
            profession: 'Administrator',
            gender: 'Laki-laki' as const,
        };

        onSetup(hospitalData, adminData);
    };

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center p-4 antialiased">
            <div className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-pop-in p-8 sm:p-10">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-teal-500 rounded-full mb-5">
                        <MosqueIcon className="h-9 w-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-wider text-white">
                        Pengaturan Awal APPI
                    </h1>
                    <p className="text-md text-slate-300 mt-2">
                        Selamat datang! Silakan daftarkan rumah sakit dan Super Admin pertama.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Hospital Info */}
                    <fieldset className="border-t-2 border-teal-500/50 pt-4">
                        <legend className="px-2 text-lg font-semibold text-teal-300">1. Informasi Rumah Sakit</legend>
                        <div className="space-y-4 mt-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Brand / ID Unik RS</label>
                                 <input type="text" value={hospitalBrand} onChange={e => setHospitalBrand(e.target.value)} placeholder="Contoh: RSIJSP" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap Rumah Sakit</label>
                                 <input type="text" value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="Contoh: RS Islam Jakarta Sukapura" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"/>
                            </div>
                        </div>
                    </fieldset>

                     {/* Admin Info */}
                    <fieldset className="border-t-2 border-teal-500/50 pt-4">
                        <legend className="px-2 text-lg font-semibold text-teal-300">2. Super Administrator</legend>
                         <div className="space-y-4 mt-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">NIP / NOPEG Admin</label>
                                 <input type="text" value={adminNopeg} onChange={e => setAdminNopeg(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Lengkap Admin</label>
                                 <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"/>
                            </div>
                            <PasswordInput
                                id="password"
                                label="Password"
                                value={password}
                                onChange={handlePasswordChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"
                            />
                            <PasswordInput
                                id="confirmPassword"
                                label="Konfirmasi Password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-white transition-colors"
                            />
                            <PasswordStrengthIndicator validationResult={passwordValidation} />
                        </div>
                    </fieldset>

                     {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-teal-500/20 hover:bg-teal-400 disabled:bg-gray-600 transition-all duration-300 mt-4"
                        >
                            Selesaikan Pengaturan & Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminSetup;