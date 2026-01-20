'use client';

import React, { useState } from 'react';
import { UnifiedActivitySessionForm } from '@/components/UnifiedActivitySessionForm';
import { useAppDataStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { useRouter } from 'next/navigation';
import type { Activity, TeamAttendanceSession } from '@/types';

const CreateActivityPage = () => {
  const allUsers = Object.values(useAppDataStore.getState().allUsersData || {}).map(d => d.employee);
  const { addActivity, addTeamAttendanceSessions } = useActivityStore();
  const { loggedInEmployee } = useAppDataStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateActivity = async (data: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
        const creator = {
            id: loggedInEmployee?.id || '',
            name: loggedInEmployee?.name || 'System'
        };

        const newActivity: Activity = {
            ...data,
            id: '', // ID akan di-generate oleh Supabase (UUID)
            createdBy: creator.id,
            createdByName: creator.name
        };

        // ⚡ UPDATE: Sekarang async - insert ke Supabase
        await addActivity(newActivity);

        // Sukses - navigate ke halaman jadwal
        router.push('/jadwal-sesi');
    } catch (err) {
        console.error('Failed to create activity:', err);
        setError(err instanceof Error ? err.message : 'Gagal membuat kegiatan. Silakan coba lagi.');
        setIsSubmitting(false);
    }
  };

  const handleCreateSessions = async (sessions: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentCount' | 'updatedAt'>[]) => {
    setIsSubmitting(true);
    setError(null);

    try {
        const creator = {
            id: loggedInEmployee?.id || '',
            name: loggedInEmployee?.name || 'System'
        };

        const sessionsWithCreator = sessions.map(session => ({
            ...session,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date().getTime(),
            creatorId: creator.id,
            creatorName: creator.name,
            presentCount: 0 // ⚡ UPDATE: Sesuaikan dengan interface baru (hapus presentUserIds, tambah presentCount)
        }));

        // ⚡ CRITICAL: Sekarang async - insert ke Supabase
        await addTeamAttendanceSessions(sessionsWithCreator);

        // Sukses - navigate ke halaman jadwal
        router.push('/jadwal-sesi');
    } catch (err) {
        console.error('Failed to create sessions:', err);
        setError(err instanceof Error ? err.message : 'Gagal membuat sesi. Silakan coba lagi.');
        setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Buat Kegiatan atau Sesi Baru</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-200">
          Menyimpan ke Supabase...
        </div>
      )}

      <UnifiedActivitySessionForm
        allUsers={allUsers || []}
        onCreateActivity={handleCreateActivity}
        onCreateSessions={handleCreateSessions}
        disabled={isSubmitting} // ⚡ Disable form saat submitting
      />
    </div>
  );
};

export default CreateActivityPage;