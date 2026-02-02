'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useDailyActivitiesStore } from '@/store/store';
import MinimalistLoader from '@/components/MinimalistLoader';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/Analytics'), {
    loading: () => <MinimalistLoader message="Memuat grafik..." />,
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData, loadAllEmployees } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();

    // 🔥 OPTIMIZATION: Default to not loading if we already have data in store
    const [isLoading, setIsLoading] = useState(Object.keys(allUsersData).length < 5);
    const [error, setError] = useState<string | null>(null);

    // 🔥 REPAIR: Use caching to prevent redundant Supabase calls
    useEffect(() => {
        const loadAnalyticsData = async () => {
            try {
                // If we already have data, don't show the initial full-screen loader
                const hasExistingData = Object.keys(allUsersData).length > 5;
                if (!hasExistingData) {
                    setIsLoading(true);
                }

                // Call loadAllEmployees (which now has its own internal 5-min cache)
                await loadAllEmployees();

                setIsLoading(false);
            } catch (err) {
                console.error('📊 [AnalyticsPage] Data load failed:', err);
                // Only show error if we have no data at all
                if (Object.keys(allUsersData).length === 0) {
                    setError('Gagal memuat data analisis. Silakan periksa koneksi Anda.');
                }
                setIsLoading(false);
            }
        };

        loadAnalyticsData();
    }, [loadAllEmployees]); // Removed allUsersData to prevent loops

    // Show loading state
    if (isLoading) {
        return <MinimalistLoader message="" />;
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
                    <p className="text-white mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    // Show analytics if not loading and no error
    return <Analytics
        allUsersData={allUsersData}
        dailyActivitiesConfig={dailyActivitiesConfig}
        onLoadAllData={() => loadAllEmployees()} // No limit = load all
    />;
}
