'use client';

// 🔥 OPTIMIZATION: Removed 'force-dynamic' to enable smooth client-side navigation
// This page only renders static component, no server-side data fetching needed

import React from 'react';
import dynamic from 'next/dynamic';

const PanduanDanDoa = dynamic(() => import('@/components/PanduanDanDoa'), {
    loading: () => <div className="p-8 text-center text-gray-500 animate-pulse">Memuat panduan...</div>,
    ssr: false // No need for SSR effectively as content is static but large
});

export default function PanduanDoaPage() {
    return (
        <PanduanDanDoa
            searchQuery=""
            initialTab="panduan"
        />
    );
}
