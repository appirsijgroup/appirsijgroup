'use client';

import React, { useState } from 'react';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { UnifiedActivitySessionForm } from '@/components/UnifiedActivitySessionForm';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { useHospitalStore } from '@/store/hospitalStore'; // 🔥 Added
import { useRouter } from 'next/navigation';
import type { Activity, TeamAttendanceSession } from '@/types';

const CreateActivityPage = () => {
  const { addActivity, addTeamAttendanceSessions } = useActivityStore();
  const { loggedInEmployee, allUsersData, loadAllEmployees } = useAppDataStore();
  const { setGlobalLoading } = useUIStore();
  const { hospitals, loadHospitals } = useHospitalStore(); // 🔥 Added

  // Transform allUsersData to array
  const allUsers = React.useMemo(() => Object.values(allUsersData || {}).map(d => d.employee), [allUsersData]);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const init = async () => {
      await Promise.all([loadAllEmployees(), loadHospitals()]);
    };
    init();
  }, [loadAllEmployees, loadHospitals, setGlobalLoading]);

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

      // Update data di halaman jadwal
      router.refresh();
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
      const teamAttendanceTypes = ['KIE', 'Doa Bersama', 'BBQ', 'UMUM'];

      const teamSessions = sessions.filter(s => teamAttendanceTypes.includes(s.type as any));

      // 1. Handle Team Attendance Sessions (KIE, Doa Bersama, BBQ, UMUM)
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

      // Update data di halaman jadwal
      router.refresh();
      // Sukses - navigate ke halaman jadwal
      router.push('/jadwal-sesi');
    } catch (err) {
      console.error('Failed to create sessions:', err);
      setError(err instanceof Error ? err.message : 'Gagal membuat sesi. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

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
          Buat <span className="text-teal-400">Kegiatan Baru</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Lengkapi formulir di bawah untuk menjadwalkan kegiatan atau sesi presensi karyawan secara terpusat.</p>
      </div>

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
        hospitals={hospitals || []} // 🔥 Added
        onCreateActivity={handleCreateActivity}
        onCreateSessions={handleCreateSessions}
        disabled={isSubmitting} // ⚡ Disable form saat submitting
      />
    </div>
  );
};

export default CreateActivityPage;