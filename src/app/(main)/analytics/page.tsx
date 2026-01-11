'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useDailyActivitiesStore } from '@/store/store';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/Analytics'), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Analytics...</p>
            </div>
        </div>
    ),
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();

    return <Analytics allUsersData={allUsersData} dailyActivitiesConfig={dailyActivitiesConfig} />;
}
