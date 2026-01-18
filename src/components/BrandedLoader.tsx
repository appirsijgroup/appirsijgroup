'use client';

import React from 'react';
import Image from 'next/image';

interface BrandedLoaderProps {
    message?: string;
}

/**
 * BrandedLoader - Loading screen dengan logo app dan animasi yang smooth
 * Digunakan untuk memberikan experience yang lebih baik saat loading
 */
export const BrandedLoader: React.FC<BrandedLoaderProps> = ({ message = "Memuat..." }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-800">
            {/* Logo Container dengan Pulse Animation */}
            <div className="relative mb-8">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping"></div>
                <div className="absolute inset-0 rounded-full bg-teal-400/10 animate-pulse"></div>

                {/* Logo */}
                <div className="relative z-10 bg-slate-900/50 backdrop-blur-sm rounded-full p-6 border border-teal-400/30 shadow-2xl shadow-teal-400/20">
                    <Image
                        src="/logorsijsp.png"
                        alt="Logo RSI Jakarta Group"
                        width={96}
                        height={96}
                        priority
                        className="h-24 w-auto"
                    />
                </div>
            </div>

            {/* Loading Spinner di bawah logo */}
            <div className="relative mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-teal-400"></div>
            </div>

            {/* Message */}
            <div className="text-center">
                <p className="text-white text-lg font-semibold tracking-wide animate-pulse">
                    {message}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                    Mohon tunggu sebentar...
                </p>
            </div>
        </div>
    );
};

/**
 * CompactBrandedLoader - Versi lebih kecil untuk inline loading
 */
export const CompactBrandedLoader: React.FC<{ message?: string }> = ({ message = "Memuat..." }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-teal-400/10 animate-ping"></div>
                <div className="relative bg-slate-900 rounded-full p-4 border border-teal-400/30">
                    <Image
                        src="/logorsijsp.png"
                        alt="Logo RSI Jakarta Group"
                        width={64}
                        height={64}
                        priority
                        className="h-16 w-auto"
                    />
                </div>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-700 border-t-teal-400 mb-3"></div>
            <p className="text-slate-400 text-sm">{message}</p>
        </div>
    );
};

export default BrandedLoader;
