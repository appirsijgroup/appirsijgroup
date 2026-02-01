'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react';
import Announcements from '@/components/Announcements';
import { useAppDataStore, useAnnouncementStore, useUIStore } from '@/store/store';
import type { Announcement } from '@/types';
import MinimalistLoader from '@/components/MinimalistLoader';
import { isAnyAdmin } from '@/lib/rolePermissions';

export default function PengumumanPage() {
    const { loggedInEmployee, allUsersData, markAnnouncementAsRead, hospitalsData, loadHospitals, loadAllEmployees } = useAppDataStore();
    const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement, loadAnnouncements, isLoading } = useAnnouncementStore();
    const { addToast } = useUIStore();
    // 🔥 OPTIMIZATION: Check if we already have data in store to show immediately
    const hasData = announcements.length > 0;
    const [initLoaded, setInitLoaded] = useState(hasData);

    // Get hospitals from hospitalsData
    const hospitalsList = React.useMemo(() => {
        return Object.values(hospitalsData || {});
    }, [hospitalsData]);

    // Get all users from allUsersData
    const allUsersList = React.useMemo(() => {
        return Object.values(allUsersData || {}).map(data => data.employee);
    }, [allUsersData]);

    // Load announcements and hospitals from Supabase on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Determine if we need to show a blocking loader
                // If we already have data, we just do a silent refresh in background
                const needsBlockingLoad = !hasData;

                if (needsBlockingLoad) {
                    setInitLoaded(false);
                }

                // Phase 1: Announcements (Critical for this page)
                // We always refresh but only await if we have no data
                const announcePromise = loadAnnouncements(needsBlockingLoad);

                // Phase 2: Non-blocking data (Hospitals, Employees)
                // These are only needed for the Create/Edit modal
                loadHospitals();

                if (loggedInEmployee && (isAnyAdmin(loggedInEmployee) || loggedInEmployee.canBeMentor)) {
                    // Separate loadAllEmployees context so it doesn't block the UI
                    loadAllEmployees().catch(() => { });
                }

                if (needsBlockingLoad) {
                    await announcePromise;
                }

            } catch (error) {
                console.error('Error loading pengumuman data:', error);
            } finally {
                setInitLoaded(true);
            }
        };

        if (loggedInEmployee) {
            loadInitialData();
        } else {
            // Public view refresh
            loadAnnouncements().then(() => setInitLoaded(true));
        }
    }, [loadAnnouncements, loadHospitals, loadAllEmployees, loggedInEmployee, hasData]);

    // Handler to create announcement with proper structure and save to Supabase
    const handleCreateAnnouncement = async (data: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, imageFile?: File, documentFile?: File) => {
        if (!loggedInEmployee) {
            addToast('Anda harus login terlebih dahulu', 'error');
            return;
        }

        // Check if user has permission to create announcement
        const canCreate = isAnyAdmin(loggedInEmployee) || loggedInEmployee.canBeMentor === true;

        if (!canCreate) {
            addToast('Anda tidak memiliki izin untuk membuat pengumuman', 'error');
            return;
        }

        try {
            await addAnnouncement(
                {
                    ...data,
                    authorId: loggedInEmployee.id,
                    authorName: loggedInEmployee.name
                },
                imageFile,
                documentFile
            );

            addToast('Pengumuman berhasil dibuat dan disimpan ke database!', 'success');
            // Refresh announcements after creation
            await loadAnnouncements();
        } catch (error: any) {
            addToast(`Gagal membuat pengumuman: ${error.message || 'Terjadi kesalahan'}`, 'error');
        }
    };

    // Handler to update announcement
    const handleUpdateAnnouncement = async (announcementId: string, data: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, imageFile?: File, documentFile?: File) => {
        if (!loggedInEmployee) {
            addToast('Anda harus login terlebih dahulu', 'error');
            return;
        }

        try {
            await updateAnnouncement(announcementId, data, imageFile, documentFile);
            addToast('Pengumuman berhasil diperbarui!', 'success');
            // Refresh announcements after update
            await loadAnnouncements();
        } catch (error: any) {
            addToast(`Gagal memperbarui pengumuman: ${error.message || 'Terjadi kesalahan'}`, 'error');
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            await removeAnnouncement(id);
            addToast('Pengumuman berhasil dihapus dari database!', 'success');
        } catch (error: any) {
            addToast(`Gagal menghapus pengumuman: ${error.message || 'Terjadi kesalahan'}`, 'error');
        }
    };

    // ... inside the component
    if (!initLoaded || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] w-full">
                <MinimalistLoader message="Memuat pengumuman..." />
            </div>
        );
    }

    return (
        <Announcements
            announcements={announcements}
            loggedInEmployee={loggedInEmployee || null}
            allUsers={allUsersList}
            hospitals={hospitalsList}
            onCreate={handleCreateAnnouncement}
            onUpdate={handleUpdateAnnouncement}
            onDelete={handleDeleteAnnouncement}
            onMarkAsRead={markAnnouncementAsRead}
        />
    );
}
