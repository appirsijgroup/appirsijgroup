'use client';

import React, { useState } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

      // Split sessions based on allowed types in team_attendance_sessions table
      const teamAttendanceTypes = ['KIE', 'Doa Bersama'];
      const tadarusTypes = ['BBQ', 'UMUM'];

      const teamSessions = sessions.filter(s => teamAttendanceTypes.includes(s.type as any));
      const tadarusSessionsList = sessions.filter(s => tadarusTypes.includes(s.type as any));

      // 1. Handle Team Attendance Sessions (KIE, Doa Bersama)
      if (teamSessions.length > 0) {
        const sessionsWithCreator = teamSessions.map(session => ({
          ...session,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().getTime(),
          creatorId: creator.id,
          creatorName: creator.name,
          presentCount: 0
        }));

        await addTeamAttendanceSessions(sessionsWithCreator);
      }

      // 2. Handle Tadarus Sessions (BBQ, UMUM)
      if (tadarusSessionsList.length > 0) {
        const { createTadarusSession } = await import('@/services/tadarusService');
        // We use getState() inside the function to ensure we get the store, 
        // but we can also use the hook if we extracted it. 
        // Since this component is client-side, dynamic import is fine.
        // Note: useGuidanceStore needs to be imported if we want to update local state immediately
        // But for now, we rely on implicit refresh or just navigation.
        // Let's grab the store updater if possible. 
        // Just inserting to DB is enough as navigation triggers refresh usually.

        const tadarusPromises = tadarusSessionsList.map(session => {
          const title = (session.type as any) === 'BBQ' ? 'Bimbingan Baca Al-Qur\'an' : 'Tadarus Umum';

          // Construct TadarusSession object
          // Note: manualParticipantIds maps to participantIds
          // We default audienceRules to empty as Tadarus doesn't support it natively yet
          return createTadarusSession({
            title: title,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            category: session.type as unknown as 'BBQ' | 'UMUM',
            notes: '',
            isRecurring: false,
            mentorId: creator.id,
            participantIds: session.manualParticipantIds || [],
            presentMenteeIds: [],
            status: 'open',
            mentorPresent: true
          });
        });

        await Promise.all(tadarusPromises);

        // Optionally update store if needed, but page reload/navigate handles it
      }

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