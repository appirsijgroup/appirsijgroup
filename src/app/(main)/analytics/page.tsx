'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useDailyActivitiesStore } from '@/store/store';
import BrandedLoader from '@/components/BrandedLoader';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/Analytics'), {
    loading: () => <BrandedLoader fullScreen={false} message="Memuat grafik..." />,
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData, loadAllEmployees, isLoadingEmployees } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🔥 REPAIR: Eager load ALL employee data for Analytics
    useEffect(() => {
        const loadAnalyticsData = async () => {
            try {
                // If already loading, don't double trigger
                if (isLoadingEmployees) return;

                // For Analytics, we ALWAYS want to try a fresh full load to ensure analysis is up to date
                // and to fill any gaps from previous paginated loads.
                setIsLoading(true);
                setError(null);

                console.log('📊 [AnalyticsPage] Triggering full employee load for analysis...');
                await loadAllEmployees();

                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Gagal memuat data karyawan');
                setIsLoading(false);
            }
        };

        // Trigger on mount or if store state indicates we are severely under-loaded
        if (Object.keys(allUsersData).length < 5) {
            loadAnalyticsData();
        } else {
            // If we have some data, still trigger a background refresh but don't show full page spinner
            loadAllEmployees().catch(e => console.error('Silent refresh failed:', e));
            setIsLoading(false);
        }
    }, [loadAllEmployees]); // Removed allUsersData to prevent loops

    // Show loading state
    if (isLoading) {
        return <BrandedLoader fullScreen={false} message="Menganalisis data..." />;
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
