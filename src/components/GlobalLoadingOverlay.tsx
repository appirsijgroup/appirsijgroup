'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/store/store';
import BrandedLoader from './BrandedLoader';

/**
 * GlobalLoadingOverlay - Melayani loading state yang bersifat global
 * Menggunakan state dari useUIStore untuk menampilkan loader yang konsisten
 * di seluruh aplikasi, terutama saat transisi login atau persiapan session.
 */
export const GlobalLoadingOverlay: React.FC = () => {
    const { globalLoading } = useUIStore();
    const [isVisible, setIsVisible] = useState(false);

    // Track active state to prevent "blink" during internal state updates
    useEffect(() => {
        if (globalLoading.show) {
            setIsVisible(true);
        } else {
            // Give time for CSS transition to finish before unmounting
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [globalLoading.show]);

    if (!isVisible && !globalLoading.show) return null;

    return (
        <div
            className={`
                fixed inset-0 z-9999 transition-opacity duration-500
                ${globalLoading.show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                bg-slate-950
            `}
        >
            <BrandedLoader
                fullScreen={true}
                message={globalLoading.message}
            />
        </div>
    );
};

export default GlobalLoadingOverlay;
