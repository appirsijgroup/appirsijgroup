'use client';

import React from 'react';
import Persetujuan from '@/components/Persetujuan';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useNotificationStore } from '@/store/notificationStore';

export default function PersetujuanPage() {
    const { loggedInEmployee, allUsersData, loadDetailedEmployeeData } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const {
        monthlyReportSubmissions,
        tadarusRequests,
        missedPrayerRequests,
        addOrUpdateMonthlyReportSubmission,
        updateTadarusSession, // Assuming these update local store optimistically
        // Need methods to call API services actually...
    } = useGuidanceStore();

    // We need actual API handlers here, or reuse what's in GuidanceStore if it handles API calls
    // useGuidanceStore mostly handles local state? Let's check.
    // DashboardContainer.tsx defines handleReviewReport etc.

    // We'll import the services directly here for the handlers

    // Wait... MyDashboard receives props for handlers.
    // Let's implement handlers here.

    // Correct way to access actions might be directly or structured differently depending on store implementation
    // But commonly just use properties from the hook if they are exposed
    const { addToast } = useUIStore();

    if (!loggedInEmployee) {
        return <div className="p-8 text-center text-gray-400">Silakan login terlebih dahulu.</div>;
    }

    const hasApprovalRole = loggedInEmployee.canBeMentor || loggedInEmployee.canBeSupervisor || loggedInEmployee.canBeManager || loggedInEmployee.canBeKaUnit || ['admin', 'super-admin'].includes(loggedInEmployee.role.toLowerCase());

    if (!hasApprovalRole) {
        return <div className="p-8 text-center text-gray-400">Anda tidak memiliki akses ke halaman ini.</div>;
    }

    const handleReviewReport = async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'supervisor' | 'manager' | 'kaunit' | 'mentor') => {
        try {
            const { reviewMonthlyReport } = await import('@/services/monthlySubmissionService');

            // Logic transition status
            let newStatus = 'pending_mentor';
            if (decision === 'rejected') {
                newStatus = `rejected_${reviewerRole}`;
            } else {
                // Approved
                if (reviewerRole === 'mentor') newStatus = 'pending_supervisor';
                else if (reviewerRole === 'supervisor') newStatus = 'pending_kaunit';
                else if (reviewerRole === 'kaunit') newStatus = 'pending_manager';
                else if (reviewerRole === 'manager') newStatus = 'approved';
            }

            const reviews: any = {
                status: newStatus,
                [`${reviewerRole}Notes`]: notes,
                [`${reviewerRole}ReviewedAt`]: Date.now()
            };

            const result = await reviewMonthlyReport(submissionId, reviews);

            if (result) {
                const { addOrUpdateMonthlyReportSubmission } = useGuidanceStore.getState();
                addOrUpdateMonthlyReportSubmission(result);

                // --- Notification Logic ---
                const { createNotification } = useNotificationStore.getState();
                const submission = monthlyReportSubmissions.find(s => s.id === submissionId);

                if (submission) {
                    // Notify Mentee
                    const message = decision === 'approved'
                        ? `Laporan bulanan bulan ${submission.monthKey} telah disetujui oleh ${reviewerRole}.`
                        : `Laporan bulanan bulan ${submission.monthKey} DITOLAK oleh ${reviewerRole}. ${notes ? `Catatan: ${notes}` : ''}`;

                    createNotification({
                        userId: submission.menteeId,
                        type: decision === 'approved' ? 'monthly_report_approved' : 'monthly_report_rejected',
                        title: `Laporan Bulanan ${decision === 'approved' ? 'Disetujui' : 'Ditolak'}`,
                        message: message,
                        linkTo: `/aktifitas-saya?reportId=${submissionId}` as any,
                        relatedEntityId: submissionId
                    });

                    // If approved, notify the NEXT person in line
                    if (decision === 'approved') {
                        let nextReviewerId = '';
                        if (reviewerRole === 'mentor') nextReviewerId = result.supervisorId || '';
                        else if (reviewerRole === 'supervisor') nextReviewerId = result.kaUnitId || '';
                        else if (reviewerRole === 'kaunit') nextReviewerId = result.managerId || '';

                        if (nextReviewerId) {
                            createNotification({
                                userId: nextReviewerId,
                                type: 'monthly_report_needs_review',
                                title: 'Validasi Laporan Diperlukan',
                                message: `Laporan ${submission.menteeName} telah disetujui oleh ${reviewerRole} dan menunggu validasi Anda.`,
                                linkTo: `/persetujuan?reportId=${submissionId}` as any,
                                relatedEntityId: submissionId
                            });
                        }
                    }
                }

                addToast(`Laporan berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
            } else {
                addToast('Gagal memproses laporan', 'error');
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleReviewTadarusRequest = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const { updateTadarusRequest } = await import('@/services/tadarusService');

            await updateTadarusRequest(requestId, {
                status: status,
                reviewedAt: Date.now()
            });

            // Update local store - we need to fetch the full object or manually update
            const { addOrUpdateTadarusRequest, tadarusRequests } = useGuidanceStore.getState();
            const existing = tadarusRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateTadarusRequest({
                    ...existing,
                    status,
                    reviewedAt: Date.now()
                });
            }

            addToast(`Permohonan tadarus berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleReviewMissedPrayerRequest = async (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => {
        try {
            const { updateMissedPrayerRequest } = await import('@/services/prayerRequestService');

            await updateMissedPrayerRequest(requestId, {
                status,
                reviewedAt: Date.now(),
                mentorNotes
            });

            const { addOrUpdateMissedPrayerRequest, missedPrayerRequests } = useGuidanceStore.getState();
            const existing = missedPrayerRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateMissedPrayerRequest({
                    ...existing,
                    status,
                    reviewedAt: Date.now(),
                    mentorNotes: mentorNotes || existing.mentorNotes
                });
            }

            addToast(`Permohonan uzur sholat berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Persetujuan & Validasi</h1>
                <p className="text-blue-200">Kelola persetujuan laporan bulanan dan permohonan manual dari tim Anda.</p>
            </div>

            <Persetujuan
                loggedInEmployee={loggedInEmployee}
                monthlyReportSubmissions={monthlyReportSubmissions}
                onReviewReport={handleReviewReport}
                allUsersData={allUsersData}
                pendingTadarusRequests={tadarusRequests}
                pendingMissedPrayerRequests={missedPrayerRequests}
                onReviewTadarusRequest={handleReviewTadarusRequest}
                onReviewMissedPrayerRequest={handleReviewMissedPrayerRequest}
                loadDetailedEmployeeData={loadDetailedEmployeeData}
                dailyActivitiesConfig={dailyActivitiesConfig}
            />
        </div>
    );
}
