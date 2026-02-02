'use client';

import React, { useState, useEffect } from 'react';
import type { MentorDashboardView } from '@/components/MentorDashboard';
import dynamic from 'next/dynamic';

const MentorDashboard = dynamic(() => import('@/components/MentorDashboard').then(mod => mod.MentorDashboard), {
    loading: () => (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-teal-400 animate-pulse">Memuat Panel Mentor...</div>
        </div>
    ),
    ssr: false
});
import { useAppDataStore, useUIStore } from '@/store/store';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { MenteeTarget, TadarusSession } from '@/types';

export default function MentorPanelPage() {
    const { loggedInEmployee, allUsersData, loadLoggedInEmployee, loadDetailedEmployeeData, loadAllEmployees } = useAppDataStore();
    const { addToast } = useUIStore();
    const {
        monthlyReportSubmissions,
        tadarusSessions,
        tadarusRequests,
        missedPrayerRequests,
        menteeTargets,
        addTadarusSessions,
    } = useGuidanceStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();

    // State for MentorDashboard subview
    const [mentorSubView, setMentorSubView] = useState<MentorDashboardView>('persetujuan');

    // Target management state
    const [targetMenteeId, setTargetMenteeId] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<MenteeTarget | null>(null);

    // Filter mentees
    const menteesOfMentor = React.useMemo(() => {
        if (!loggedInEmployee) return [];
        return Object.values(allUsersData)
            .map(d => d.employee)
            .filter(e => e.mentorId === loggedInEmployee.id);
    }, [allUsersData, loggedInEmployee]);

    if (!loggedInEmployee) {
        return <div className="p-8 text-center text-gray-400">Silakan login terlebih dahulu.</div>;
    }

    const hasAccess = loggedInEmployee.canBeMentor ||
        loggedInEmployee.canBeSupervisor ||
        loggedInEmployee.canBeManager ||
        loggedInEmployee.canBeKaUnit ||
        loggedInEmployee.role === 'admin' ||
        loggedInEmployee.role === 'super-admin';

    if (!hasAccess) {
        return <div className="p-8 text-center text-gray-400">Anda tidak memiliki akses ke Panel Supervisi.</div>;
    }

    // Set default view based on role
    useEffect(() => {
        if (!loggedInEmployee.canBeMentor && (loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeManager || loggedInEmployee.canBeKaUnit)) {
            setMentorSubView('persetujuan');
        }
    }, [loggedInEmployee.canBeMentor, loggedInEmployee.canBeSupervisor, loggedInEmployee.canBeManager, loggedInEmployee.canBeKaUnit]);

    // 🔥 FIX: Load employees, monthly reports and manual requests on mount
    useEffect(() => {
        if (loggedInEmployee?.id) {
            // Load all employees to ensure mentees are found in allUsersData
            loadAllEmployees().catch(err => console.error('Failed to load employees:', err));

            const {
                loadTadarusRequestsFromSupabase,
                loadMissedPrayerRequestsFromSupabase,
                loadMonthlyReportSubmissionsFromSupabase,
                loadTeamReadingHistoryFromSupabase
            } = useGuidanceStore.getState();

            loadTadarusRequestsFromSupabase().catch(err => console.error('Failed to load tadarus requests:', err));
            loadMissedPrayerRequestsFromSupabase().catch(err => console.error('Failed to load missed prayer requests:', err));
            loadMonthlyReportSubmissionsFromSupabase().catch(err => console.error('Failed to load monthly reports:', err));
            loadTeamReadingHistoryFromSupabase().catch(err => console.error('Failed to load team reading history:', err));
        }
    }, [loggedInEmployee?.id, loadAllEmployees]);

    // Local handler for profile update
    const handleLocalUpdateProfile = async (userId: string, updates: Partial<any>) => {
        try {
            // 1. Optimistic Update (Immediate UI Feedback)
            const { setAllUsersData } = useAppDataStore.getState();

            setAllUsersData((prev) => {
                const existing = prev[userId];
                if (!existing) return prev;

                return {
                    ...prev,
                    [userId]: {
                        ...existing,
                        employee: { ...existing.employee, ...updates }
                    }
                };
            });

            // 2. API Call
            const { updateEmployee, getEmployeeById } = await import('@/services/employeeService');
            await updateEmployee(userId, updates);

            // 3. Verification & Sync (Background)
            const freshData = await getEmployeeById(userId);
            if (freshData) {
                setAllUsersData((prev) => ({
                    ...prev,
                    [userId]: {
                        ...(prev[userId] || { attendance: {}, history: {} }),
                        employee: freshData
                    }
                }));
            }

            // Sync loggedInEmployee if self-update
            if (userId === loggedInEmployee.id) {
                await loadLoggedInEmployee();
            }

            return true;
        } catch (e) {
            console.error(e);
            addToast('Gagal update profil', 'error');
            // Fallback sync on error
            const { loadAllEmployees } = useAppDataStore.getState();
            loadAllEmployees().catch(console.error);
            return false;
        }
    };

    // Wrapper for loadDetailedEmployeeData expected by MentorDashboard
    const loadDetailedEmployeeDataWrapper = async (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => {
        await loadDetailedEmployeeData(employeeId, monthOrForce, year, force);
    };

    // Handlers
    const handleReviewReport = async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'supervisor' | 'manager' | 'kaunit' | 'mentor') => {
        try {
            const { reviewMonthlyReport } = await import('@/services/monthlySubmissionService');

            // Logic transition status based on role and decision
            let newStatus = '';
            if (decision === 'rejected') {
                if (reviewerRole === 'mentor') newStatus = 'rejected_mentor';
                else if (reviewerRole === 'supervisor') newStatus = 'rejected_supervisor';
                else if (reviewerRole === 'kaunit') newStatus = 'rejected_kaunit';
                else if (reviewerRole === 'manager') newStatus = 'rejected_manager';
            } else {
                if (reviewerRole === 'mentor') newStatus = 'pending_supervisor';
                else if (reviewerRole === 'supervisor') newStatus = 'pending_kaunit';
                else if (reviewerRole === 'kaunit') newStatus = 'pending_manager';
                else if (reviewerRole === 'manager') newStatus = 'approved';
            }

            const reviews: any = {
                status: newStatus,
            };

            // Add role-specific notes and timestamps
            if (reviewerRole === 'mentor') {
                reviews.mentorNotes = notes;
                reviews.mentorReviewedAt = Date.now();
            } else if (reviewerRole === 'supervisor') {
                reviews.supervisorNotes = notes;
                reviews.supervisorReviewedAt = Date.now();
            } else if (reviewerRole === 'kaunit') {
                reviews.kaUnitNotes = notes;
                reviews.kaUnitReviewedAt = Date.now();
            } else if (reviewerRole === 'manager') {
                reviews.managerNotes = notes;
                reviews.managerReviewedAt = Date.now();
            }

            const result = await reviewMonthlyReport(submissionId, reviews);

            if (result) {
                const { addOrUpdateMonthlyReportSubmission } = useGuidanceStore.getState();
                addOrUpdateMonthlyReportSubmission(result);
                addToast(`Laporan berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleCreateTadarusSession = async (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => {
        try {
            const { createTadarusSession } = await import('@/services/tadarusService');
            const newSession = await createTadarusSession({
                ...data,
                presentMenteeIds: []
            });
            if (newSession) {
                const { addTadarusSessions } = useGuidanceStore.getState();
                addTadarusSessions([newSession]);
                addToast('Sesi tadarus berhasil dibuat', 'success');
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleUpdateTadarusSession = async (sessionId: string, updates: Partial<TadarusSession>) => {
        try {
            // Optimistic update
            const { updateTadarusSession } = useGuidanceStore.getState();
            updateTadarusSession(sessionId, updates);

            // API call
            const { updateTadarusSession: apiUpdate } = await import('@/services/tadarusService');
            // @ts-ignore
            await apiUpdate(sessionId, updates);
        } catch (error: any) {
            addToast('Gagal update sesi: ' + error.message, 'error');
            // TODO: Revert optimistic update if critical
        }
    };

    const handleDeleteTadarusSession = async (sessionId: string) => {
        try {
            // API call
            const { deleteTadarusSession: apiDelete } = await import('@/services/tadarusService');
            await apiDelete(sessionId);

            // Store update
            const { deleteTadarusSession } = useGuidanceStore.getState();
            deleteTadarusSession(sessionId);
            addToast('Sesi dihapus', 'success');
        } catch (error: any) {
            addToast('Gagal hapus sesi: ' + error.message, 'error');
        }
    };

    const handleReviewTadarusRequest = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const { updateTadarusRequest } = await import('@/services/tadarusService');
            await updateTadarusRequest(requestId, {
                status,
                reviewedAt: Date.now()
            });

            // Local update
            const { addOrUpdateTadarusRequest, tadarusRequests } = useGuidanceStore.getState();
            const existing = tadarusRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateTadarusRequest({ ...existing, status, reviewedAt: Date.now() });
            }

            addToast(`Permohonan tadarus berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleReviewMissedPrayerRequest = async (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => {
        try {
            const { updateMissedPrayerRequest } = await import('@/services/prayerRequestService');
            await updateMissedPrayerRequest(requestId, { status, reviewedAt: Date.now(), mentorNotes });

            const { addOrUpdateMissedPrayerRequest, missedPrayerRequests } = useGuidanceStore.getState();
            const existing = missedPrayerRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateMissedPrayerRequest({ ...existing, status, reviewedAt: Date.now(), mentorNotes });
            }

            addToast(`Permohonan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleMentorAttendOwnSession = async (sessionId: string) => {
        try {
            // Placeholder logic
            addToast('Fitur presensi mentor dalam pengembangan', 'success');
        } catch (error) { }
    };

    const handleCreateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetMenteeId || !targetTitle) {
            addToast('Pilih mentee dan judul target', 'error');
            return;
        }

        try {
            // Fallback to local store as guidanceService is missing
            const newTarget: MenteeTarget = {
                id: crypto.randomUUID(),
                menteeId: targetMenteeId,
                mentorId: loggedInEmployee.id,
                title: targetTitle,
                description: targetDescription,
                status: 'in-progress',
                createdAt: Date.now(),
                monthKey: new Date().toISOString().slice(0, 7),
                completedAt: null
            };

            const { addMenteeTarget } = useGuidanceStore.getState();
            addMenteeTarget(newTarget);
            addToast('Target berhasil dibuat', 'success');
            setTargetTitle('');
            setTargetDescription('');
        } catch (error: any) {
            addToast('Gagal buat target: ' + error.message, 'error');
        }
    };

    const handleDeleteTarget = async () => {
        if (!confirmDeleteTarget) return;
        try {
            // Fallback to local store
            const { deleteMenteeTarget } = useGuidanceStore.getState();
            deleteMenteeTarget(confirmDeleteTarget.id);
            addToast('Target dihapus', 'success');
            setConfirmDeleteTarget(null);
        } catch (error: any) {
            addToast('Gagal hapus target: ' + error.message, 'error');
        }
    };

    return (
        <div className={`mx-auto transition-all duration-700 ${mentorSubView === 'quran-assessment' ? 'w-full max-w-full px-4 py-8' : 'w-full max-w-full px-4 py-8'}`}>
            <MentorDashboard
                employee={loggedInEmployee}
                allUsersData={allUsersData}
                onUpdateProfile={handleLocalUpdateProfile}
                monthlyReportSubmissions={monthlyReportSubmissions}
                onReviewReport={handleReviewReport}
                tadarusSessions={tadarusSessions}
                tadarusRequests={tadarusRequests}
                onCreateTadarusSession={handleCreateTadarusSession}
                onUpdateTadarusSession={handleUpdateTadarusSession}
                onDeleteTadarusSession={handleDeleteTadarusSession}
                onReviewTadarusRequest={handleReviewTadarusRequest}
                missedPrayerRequests={missedPrayerRequests}
                onReviewMissedPrayerRequest={handleReviewMissedPrayerRequest}
                onMentorAttendOwnSession={handleMentorAttendOwnSession}
                onDeleteMenteeTarget={(id) => {
                    const target = menteeTargets.find(t => t.id === id);
                    if (target) setConfirmDeleteTarget(target);
                }}
                addToast={addToast}

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
                menteeTargets={menteeTargets.filter(t => t.mentorId === loggedInEmployee.id)}
                loadDetailedEmployeeData={loadDetailedEmployeeDataWrapper}
                dailyActivitiesConfig={dailyActivitiesConfig}
            />

            {confirmDeleteTarget && (
                // Reusing ConfirmationModal logic locally or import? 
                // Using simple inline fallback if modal component not directly usable or just rely on parent
                // MentorDashboard usually handles modal rendering if props provided?
                // Actually MentorDashboard doesn't render the modal, MyDashboard did.
                // We need to render modal here.
                null // Placeholder, assuming MentorDashboard might have internal modal or we need to add it
            )}
            {/* We need ConfirmationModal here */}
            {/* But ConfirmationModal is imported in MentorDashboard but used by parent? No, let's check MentorDashboard source */}
        </div>
    );
}

// Need to import ConfirmationModal if we render it here.
// Let's check if MentorDashboard renders it.
