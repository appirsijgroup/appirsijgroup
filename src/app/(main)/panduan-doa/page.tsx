'use client';

import React from 'react';
import PanduanDanDoa from '@/components/PanduanDanDoa';

export default function PanduanDoaPage() {
    return (
        <PanduanDanDoa
            searchQuery=""
            clearSearchQuery={() => {}}
            initialTab="panduan"
        />
    );
}
