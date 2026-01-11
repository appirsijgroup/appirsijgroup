'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore } from '@/store/store';
import type { MenteeTarget } from '@/types';

// ⚡ LAZY LOADING: MentorDashboard will only load when user visits /binroh
// This saves ~1377 lines of code + recharts + xlsx from initial bundle
const MentorDashboard = dynamic(() => import('@/components/MentorDashboard').then(mod => ({
    default: mod.MentorDashboard
})), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Dashboard Bimbingan Rohani...</p>
            </div>
        </div>
    ),
    ssr: false // Disable SSR for this client component
});

// Define type locally to match MentorDashboard component
type MentorDashboardView = 'overview' | 'sessions' | 'mentees' | 'progress' | 'missed-requests' | 'laporan-bacaan' | 'persetujuan' | 'target';

export default function BinrohPage() {
    const { loggedInEmployee, allUsersData } = useAppDataStore();
    const [mentorSubView, setMentorSubView] = useState<MentorDashboardView>('mentees');
    const [targetMenteeId, setTargetMenteeId] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<MenteeTarget | null>(null);

    // Placeholder handlers - needs proper implementation
    const handleUpdateProfile = (userId: string, updates: any) => {
        return true;
    };

    const handleCreateTarget = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Create target');
    };

    const handleDeleteMenteeTarget = (targetId: string) => {
        console.log('Delete target:', targetId);
    };

    const menteesOfMentor = Object.values(allUsersData)
        .filter(u => u.employee.mentorId === loggedInEmployee?.id)
        .map(u => u.employee);

    return (
        <MentorDashboard
            employee={loggedInEmployee!}
            allUsersData={allUsersData}
            onUpdateProfile={handleUpdateProfile}
            weeklyReportSubmissions={[]}
            onReviewReport={() => {}}
            tadarusSessions={[]}
            tadarusRequests={[]}
            onCreateTadarusSession={() => {}}
            onUpdateTadarusSession={() => {}}
            onDeleteTadarusSession={() => {}}
            onReviewTadarusRequest={() => {}}
            missedPrayerRequests={[]}
            onReviewMissedPrayerRequest={() => {}}
            onMentorAttendOwnSession={() => {}}
            onLogAudit={() => {}}
            onDeleteMenteeTarget={handleDeleteMenteeTarget}
            mentorSubView={mentorSubView}
            setMentorSubView={setMentorSubView}
            menteesOfMentor={menteesOfMentor}
            targetMenteeId={targetMenteeId}
            setTargetMenteeId={setTargetMenteeId}
            targetTitle={targetTitle}
            setTargetTitle={setTargetTitle}
            targetDescription={targetDescription}
            setTargetDescription={setTargetDescription}
            handleCreateTarget={handleCreateTarget}
            setConfirmDeleteTarget={setConfirmDeleteTarget}
            menteeTargets={[]}
        />
    );
}
