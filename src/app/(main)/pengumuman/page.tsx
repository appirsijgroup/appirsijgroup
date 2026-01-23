'use client';

import React, { useEffect, useState } from 'react';
import Announcements from '@/components/Announcements';
import { useAppDataStore, useAnnouncementStore, useUIStore } from '@/store/store';
import type { Announcement } from '@/types';
import { isAnyAdmin } from '@/lib/rolePermissions';

export default function PengumumanPage() {
    const { loggedInEmployee, allUsersData, markAnnouncementAsRead, hospitalsData, loadHospitals } = useAppDataStore();
    const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement, loadAnnouncements, isLoading } = useAnnouncementStore();
    const { addToast } = useUIStore();
    const [initLoaded, setInitLoaded] = useState(false);

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
                await Promise.all([
                    loadAnnouncements(),
                    loadHospitals()
                ]);
            } catch (error) {
            } finally {
                setInitLoaded(true);
            }
        };
        loadInitialData();
    }, [loadAnnouncements, loadHospitals]);

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

    if (!initLoaded || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 to-indigo-800">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400"></div>
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
