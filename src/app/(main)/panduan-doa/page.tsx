// 🔥 OPTIMIZATION: Removed 'force-dynamic' to enable smooth client-side navigation
// This page only renders static component, no server-side data fetching needed

import React from 'react';
import PanduanDanDoa from '@/components/PanduanDanDoa';

export default function PanduanDoaPage() {
    return (
        <PanduanDanDoa
            searchQuery=""
            initialTab="panduan"
        />
    );
}
