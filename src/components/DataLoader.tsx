'use client';

import React, { useEffect, useState } from 'react';
import { useAnnouncementStore, useAppDataStore, useHospitalStore } from '@/store/store';

/**
 * DataLoader Component
 *
 * Loads essential data in background after login
 * This prevents race conditions and ensures data is available
 * when user navigates to different pages.
 */
interface DataLoaderProps {
    children: React.ReactNode;
}

export const DataLoader: React.FC<DataLoaderProps> = ({ children }) => {
    const { loadHospitals } = useAppDataStore();
    const { loadAnnouncements } = useAnnouncementStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEssentialData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Load essential data in background
                const loadPromises = [
                    // Announcements - needed for sidebar badge and admin dashboard
                    loadAnnouncements().catch(err => {
                        // Don't throw - allow other data to load
                    }),

                    // Hospitals - needed for various features
                    loadHospitals().catch(err => {
                        // Don't throw - allow other data to load
                    }),
                ];

                await Promise.allSettled(loadPromises);

            } catch (err: any) {
                setError(err.message);
                // Don't block UI - data will load when needed
            } finally {
                setIsLoading(false);
            }
        };

        loadEssentialData();
    }, [loadAnnouncements, loadHospitals]);

    // Don't block rendering - load in background
    return <>{children}</>;
};

/**
 * Hook to manually reload essential data
 * Useful when you want to refresh data after mutations
 */
export const useReloadData = () => {
    const { loadHospitals } = useAppDataStore();
    const { loadAnnouncements } = useAnnouncementStore();

    const reload = async () => {
        try {
            await Promise.all([
                loadAnnouncements(),
                loadHospitals(),
            ]);
            return true;
        } catch (error) {
            return false;
        }
    };

    return { reload, isLoading: false };
};

export default DataLoader;
