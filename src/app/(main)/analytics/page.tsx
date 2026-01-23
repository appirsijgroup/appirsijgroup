'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useDailyActivitiesStore } from '@/store/store';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/Analytics'), {
    loading: () => (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400"></div>
        </div>
    ),
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData, loadAllEmployees } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🔥 FIX: Use loadAllEmployees from store - ensures data is loaded for ALL users
    useEffect(() => {
        const loadAnalyticsData = async () => {
            try {
                // Check if we already have data loaded
                const employeeCount = Object.keys(allUsersData).length;

                // 🔥 FIX: Validate data completeness
                // If we have employees but NO activities (likely due to previous 401 error or partial load),
                // we must force a reload.
                const firstUser = Object.values(allUsersData)[0];
                const hasActivities = firstUser &&
                    firstUser.employee &&
                    (firstUser.employee.monthlyActivities || (firstUser.employee as any).monthly_activities) &&
                    Object.keys(firstUser.employee.monthlyActivities || (firstUser.employee as any).monthly_activities || {}).length > 0;

                // If data is sufficient, stop loading
                if (employeeCount >= 15 && hasActivities) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                setError(null);

                // 🔥 OPTIMIZATION: Load only top 50 employees initially for faster dashboard
                // loadAllEmployees handles the fetching logic. 
                // We'll trust the store to handle caching if it's already loading.
                await loadAllEmployees(50);

                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load employees data');
                setIsLoading(false);
            }
        };

        loadAnalyticsData();
    }, [allUsersData, loadAllEmployees]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400"></div>
            </div>
        );
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
