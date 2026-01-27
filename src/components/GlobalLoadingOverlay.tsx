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
    const [shouldRender, setShouldRender] = useState(false);

    // Gunakan local state untuk menangani sedikit delay saat closing 
    // agar transisi visual lebih halus
    useEffect(() => {
        if (globalLoading.show) {
            setShouldRender(true);
        } else {
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [globalLoading.show]);

    if (!shouldRender) return null;

    return (
        <div className={`
            fixed inset-0 z-9999 transition-opacity duration-300
            ${globalLoading.show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>


            <BrandedLoader

                fullScreen={true}
                message={globalLoading.message}
            />
        </div>
    );
};

export default GlobalLoadingOverlay;
