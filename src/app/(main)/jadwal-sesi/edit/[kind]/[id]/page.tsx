'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BrandedLoader from '@/components/BrandedLoader';
import { useActivityStore } from '@/store/activityStore';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useHospitalStore } from '@/store/hospitalStore';
import { UnifiedActivitySessionForm } from '@/components/UnifiedActivitySessionForm';
import type { Activity, TeamAttendanceSession } from '@/types';

export default function EditActivitySessionPage() {
    const router = useRouter();
    const params = useParams();
    const kind = params.kind as string;
    const id = params.id as string;

    const { loggedInEmployee, allUsersData, loadAllEmployees } = useAppDataStore();
    const { addToast } = useUIStore();
    const { activities, teamAttendanceSessions, updateActivity, updateTeamAttendanceSessionData } = useActivityStore();
    const { hospitals, loadHospitals } = useHospitalStore();

    const [initialData, setInitialData] = useState<Activity | TeamAttendanceSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Transform allUsersData to array
    const allUsers = useMemo(() => Object.values(allUsersData || {}).map(d => d.employee), [allUsersData]);

    useEffect(() => {
        const loadPageData = async () => {
            if (!kind || !id) {
                setLoading(false);
                return;
            }

            try {
                // Ensure dependencies are loaded
                await Promise.all([
                    loadAllEmployees(),
                    loadHospitals()
                ]);

                let data: Activity | TeamAttendanceSession | undefined;
                if (kind === 'activity') {
                    data = activities.find(a => a.id === id);
                } else if (kind === 'session') {
                    data = teamAttendanceSessions.find(s => s.id === id);
                }

                if (data) {
                    setInitialData(data);
                } else {
                    addToast('Data tidak ditemukan', 'error');
                    router.push('/jadwal-sesi');
                }
            } catch (err) {
                console.error('Failed to load data:', err);
                addToast('Gagal memuat data', 'error');
                router.push('/jadwal-sesi');
            } finally {
                setLoading(false);
            }
        };

        loadPageData();
    }, [kind, id, activities, teamAttendanceSessions, router, loadAllEmployees, loadHospitals, addToast]);

    const handleUpdateActivity = async (data: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
        setIsSubmitting(true);
        try {
            await updateActivity(id, data);
            addToast('Kegiatan berhasil diupdate!', 'success');
            router.push('/jadwal-sesi');
        } catch (err) {
            console.error('Failed to update activity:', err);
            addToast('Gagal mengupdate kegiatan', 'error');
            setIsSubmitting(false);
        }
    };

    const handleUpdateSession = async (sessions: any[]) => {
        if (sessions.length === 0) return;
        setIsSubmitting(true);
        try {
            // Edit mode only allows one session at a time
            const sessionData = sessions[0];
            await updateTeamAttendanceSessionData(id, sessionData);
            addToast('Sesi berhasil diupdate!', 'success');
            router.push('/jadwal-sesi');
        } catch (err) {
            console.error('Failed to update session:', err);
            addToast('Gagal mengupdate sesi', 'error');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <BrandedLoader message="Memuat data..." />;
    }

    if (!initialData) return null;

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <div className="mb-6">
                <button
                    onClick={() => router.push('/jadwal-sesi')}
                    className="text-gray-300 hover:text-white flex items-center gap-2 mb-4"
                >
                    ← Kembali ke Jadwal & Sesi
                </button>
                <h1 className="text-2xl font-bold text-white">
                    Edit {kind === 'activity' ? 'Kegiatan' : 'Sesi Presensi'}
                </h1>
            </div>

            <UnifiedActivitySessionForm
                allUsers={allUsers}
                hospitals={hospitals}
                initialData={initialData}
                isEditing={true}
                disabled={isSubmitting}
                onCreateActivity={handleUpdateActivity}
                onCreateSessions={handleUpdateSession}
            />
        </div>
    );
}
