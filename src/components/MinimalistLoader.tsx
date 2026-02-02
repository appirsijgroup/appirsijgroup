'use client';

import React from 'react';

/**
 * MinimalistLoader - Spinner sederhana untuk loading transisi antar tab atau data
 * Digunakan agar pengalaman pengguna terasa lebih ringan dan tidak mengganggu alur.
 */
export const MinimalistLoader: React.FC<{ message?: string; fullScreen?: boolean }> = ({ message = 'Memuat data...', fullScreen = false }) => {
    const content = (
        <div className={`flex flex-col items-center justify-center p-12 sm:p-20 ${!fullScreen ? 'bg-black/5 rounded-2xl border border-white/5' : ''} animate-fade-in`}>
            <div className={`animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-400 ${message ? 'mb-4' : ''}`}></div>
            {message && <p className="text-teal-200/60 text-sm font-medium animate-pulse">{message}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-950/80 backdrop-blur-md">
                {content}
            </div>
        );
    }

    return content;
};

export default MinimalistLoader;
