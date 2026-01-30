'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MinimalistLoader from '@/components/MinimalistLoader';
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
    const { addToast, setGlobalLoading } = useUIStore();
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
                // ⚡ OPTIMIZATION: Try to find data in existing store first (fastest)
                let data: Activity | TeamAttendanceSession | undefined;

                if (kind === 'activity') {
                    data = activities.find(a => a.id === id);
                } else if (kind === 'session') {
                    data = teamAttendanceSessions.find(s => s.id === id);
                }

                // If found in store, use it immediately
                if (data) {
                    // ⚡ ADD: Permission Check - Only creator or super-admin can edit
                    const isSuperAdmin = loggedInEmployee?.role === 'super-admin';
                    const creatorId = (data as any).createdBy || (data as any).creatorId;

                    if (!isSuperAdmin && creatorId !== loggedInEmployee?.id) {
                        addToast('Anda tidak memiliki akses untuk mengedit data ini', 'error');
                        router.push('/jadwal-sesi');
                        return;
                    }

                    setInitialData(data);
                    // Still load dependencies in background for form dropdowns
                    Promise.all([loadAllEmployees(), loadHospitals()]).catch(console.error);
                } else {
                    // Not found in store? Then we MUST wait for everything
                    await Promise.all([
                        loadAllEmployees(),
                        loadHospitals(),
                    ]);

                    // Check again after ensuring data is loaded (if we implemented fetch-by-id)
                    // For now, we assume if it wasn't in store initially, we might need to handle it.
                    // But since we persist store, it should be there.
                    // If refresh happened, LayoutShell loads data. 

                    // Simple fallback: If really not found, maybe redirect or show error?
                    // Let's rely on the previous logic but inside this block
                    if (kind === 'activity') {
                        // Re-check store after potential background sync (if any)
                        data = useActivityStore.getState().activities.find(a => a.id === id);
                    } else {
                        data = useActivityStore.getState().teamAttendanceSessions.find(s => s.id === id);
                    }

                    if (data) {
                        // ⚡ ADD: Permission Check - Only creator or super-admin can edit
                        const isSuperAdmin = useAppDataStore.getState().loggedInEmployee?.role === 'super-admin';
                        const currentEmpId = useAppDataStore.getState().loggedInEmployee?.id;
                        const creatorId = (data as any).createdBy || (data as any).creatorId;

                        if (!isSuperAdmin && creatorId !== currentEmpId) {
                            addToast('Anda tidak memiliki akses untuk mengedit data ini', 'error');
                            router.push('/jadwal-sesi');
                            return;
                        }

                        setInitialData(data);
                    } else {
                        addToast('Data tidak ditemukan', 'error');
                        router.push('/jadwal-sesi');
                    }
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
        return <MinimalistLoader message="Memuat data..." />;
    }

    if (!initialData) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <button
                    onClick={() => router.push('/jadwal-sesi')}
                    className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-2 mb-4 group transition-colors"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Kembali ke Jadwal & Sesi
                </button>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Edit <span className="text-teal-400">{kind === 'activity' ? 'Kegiatan' : 'Sesi Presensi'}</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">Perbarui informasi kegiatan atau sesi presensi karyawan.</p>
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
