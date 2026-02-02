'use client';

import React, { useState } from 'react';
import { CalendarDaysIcon } from './Icons';
import { useUIStore } from '@/store/store';


interface ActivationRequiredProps {
    monthName: string | undefined;
    monthKey: string;
    isPastMonth?: boolean;
    onActivate: (monthKey: string) => Promise<boolean>;
    isLoading?: boolean;
}

const ActivationRequired: React.FC<ActivationRequiredProps> = ({
    monthName,
    monthKey,
    isPastMonth = false,
    onActivate,
    isLoading = false
}) => {
    const [isActivating, setIsActivating] = useState(false);
    const { setGlobalLoading } = useUIStore();


    const handleActivate = async () => {
        if (isPastMonth) return;

        setIsActivating(true);
        setGlobalLoading(true, "Mengaktifkan Lembar Mutaba'ah...");
        try {
            const success = await onActivate(monthKey);
            // Parent will update state and trigger re-render
        } catch (error) {
            console.error("Activation error:", error);
        } finally {
            setIsActivating(false);
            setGlobalLoading(false);
        }
    };


    const isButtonDisabled = isPastMonth || isLoading || isActivating;

    return (
        <div className="flex flex-col items-center justify-center text-center bg-black/20 rounded-2xl p-8 sm:p-12 animate-view-change border-2 border-dashed border-teal-500/50 w-full max-w-7xl mx-auto">
            <CalendarDaysIcon className="w-20 h-20 text-teal-300 mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Aktivasi Lembar Mutaba'ah Diperlukan</h2>
            <p className="text-blue-200 text-base sm:text-lg mt-3 max-w-3xl">
                Untuk dapat melakukan presensi dan mencatat aktivitas lainnya, Anda harus mengaktifkan Lembar Mutaba'ah untuk bulan <strong>{monthName || 'ini'}</strong> terlebih dahulu.
            </p>
            <button
                onClick={handleActivate}
                disabled={isButtonDisabled}
                className="mt-8 bg-teal-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-teal-400 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-base flex items-center gap-2"
            >
                {isButtonDisabled ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        {isPastMonth ? "Bulan Telah Lewat" : "Memproses..."}
                    </>
                ) : (
                    "Aktifkan Lembar Mutaba'ah"
                )}
            </button>
            {isPastMonth && <p className="text-xs text-yellow-300 mt-4">Anda tidak dapat mengaktifkan lembar untuk bulan yang telah berlalu.</p>}
        </div>
    );
};

export default ActivationRequired;
