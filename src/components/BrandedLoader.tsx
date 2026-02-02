'use client';

import React from 'react';
import Image from 'next/image';

interface BrandedLoaderProps {
    message?: string;
    fullScreen?: boolean;
}

/**
 * BrandedLoader - Loading screen dengan logo app dan animasi yang smooth
 * Digunakan untuk memberikan experience yang lebih baik saat loading
 */
export const BrandedLoader: React.FC<BrandedLoaderProps> = ({ message = "Memuat...", fullScreen = false }) => {
    return (
        <div className={`
            ${fullScreen ? 'fixed inset-0 z-9999 bg-slate-950' : 'py-16 w-full bg-transparent'} 
            flex flex-col items-center justify-center animate-fade-in
        `}>



            {/* Logo Container with Modern Glass Look */}
            <div className="relative mb-6">
                {/* Logo with slight hover-like effect */}
                <div className="relative z-10 bg-white/5 backdrop-blur-xs rounded-full border border-white/5 shadow-xl p-8">

                    <Image
                        src="/logorsijsp.png"
                        alt="Logo RSI Jakarta Group"
                        width={80}
                        height={80}
                        priority
                        className="h-16 w-auto opacity-90 brightness-110"
                    />
                </div>

            </div>

            {/* Minimal Spinner */}
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500/20 border-t-teal-400"></div>
                <p className="text-teal-200/60 text-sm font-medium tracking-wide">
                    {message}
                </p>
            </div>

            {fullScreen && (
                <div className="absolute bottom-12 text-center">
                    <p className="text-teal-500/60 text-[10px] uppercase tracking-[0.3em] font-black">
                        Aplikasi Perilaku Pelayanan Islami
                    </p>
                </div>
            )}
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
                <div className="relative bg-slate-900 rounded-full p-4 border border-teal-400/30">
                    <Image
                        src="/logorsijsp.png"
                        alt="Logo RSI Jakarta Group"
                        width={80}
                        height={80}
                        priority
                        className="h-20 w-auto"
                    />

                </div>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-700 border-t-teal-400 mb-3"></div>
            <p className="text-slate-400 text-sm">{message}</p>
        </div>
    );
};

export default BrandedLoader;
