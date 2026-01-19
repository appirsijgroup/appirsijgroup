'use client';

import React from 'react';
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

  const handleCreateActivity = (data: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
    const creator = {
        id: loggedInEmployee?.id || '',
        name: loggedInEmployee?.name || 'System'
    };
    const newActivity: Activity = {
        ...data,
        id: Date.now().toString(),
        createdBy: creator.id,
        createdByName: creator.name
    };
    addActivity(newActivity);
    router.push('/jadwal-sesi');
  };

  const handleCreateSessions = (sessions: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>[]) => {
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
        presentUserIds: []
    }));
    addTeamAttendanceSessions(sessionsWithCreator);
    router.push('/jadwal-sesi');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Buat Kegiatan atau Sesi Baru</h1>
      <UnifiedActivitySessionForm
        allUsers={allUsers || []}
        onCreateActivity={handleCreateActivity}
        onCreateSessions={handleCreateSessions}
      />
    </div>
  );
};

export default CreateActivityPage;