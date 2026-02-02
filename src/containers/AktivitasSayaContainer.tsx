'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AktivitasSaya from '@/components/AktivitasSaya';
import MinimalistLoader from '@/components/MinimalistLoader';
import AssignmentLetter from '@/components/AssignmentLetter';
import {
    useAppDataStore,
    useUIStore
} from '@/store/store';
import { isAnyAdmin } from '@/lib/rolePermissions';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useActivityStore } from '@/store/activityStore';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { PRAYERS } from '@/data/prayers';
import { getBalancedWeeks } from '@/utils/dateUtils';
import { updateEmployee, getEmployeeById } from '@/services/employeeService';
import type {
    TadarusRequest,
    MissedPrayerRequest,
    Employee,
    ReadingHistory
} from '@/types';

interface AktivitasSayaContainerProps {
    initialTab?: string;
}

const AktivitasSayaContainer: React.FC<AktivitasSayaContainerProps> = ({ initialTab }) => {
    const searchParams = useSearchParams();
    const { loggedInEmployee, setAllUsersData, allUsersData, setLoggedInEmployee, loadDetailedEmployeeData, loadAllEmployees } = useAppDataStore();
    const { addToast } = useUIStore();
    // Note: Navigation handled by useRouter

    // Stores
    const { sunnahIbadahList } = useSunnahIbadahStore();
    const { createNotification } = useNotificationStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { activities, teamAttendanceSessions, teamAttendanceRecords, addActivity, addTeamAttendanceSessions, createTeamAttendanceRecord, updateTeamAttendanceSessionData, deleteTeamAttendanceSession, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase } = useActivityStore();
    const { monthlyReportSubmissions, tadarusSessions, tadarusRequests, missedPrayerRequests, menteeTargets, addOrUpdateMonthlyReportSubmission, addTadarusSessions, updateTadarusSession, deleteTadarusSession, addOrUpdateTadarusRequest, addOrUpdateMissedPrayerRequest, addMenteeTarget, updateMenteeTarget, deleteMenteeTarget, loadTadarusRequestsFromSupabase, loadMissedPrayerRequestsFromSupabase, loadMonthlyReportSubmissionsFromSupabase } = useGuidanceStore();
    const { addAnnouncement, deleteAnnouncement } = useAnnouncementStore();
    const { hospitals } = useHospitalStore();

    // Assignment Letter State
    const [assignmentLetter, setAssignmentLetter] = useState<{
        recipient: Employee;
        roleName: 'Mentor' | 'Supervisor' | 'Kepala Unit';
        assignmentType: 'assignment' | 'removal' | 'change' | 'designation' | 'revocation';
        assigneeName?: string;
        previousAssigneeName?: string;
        notificationTimestamp: number;
    } | null>(null);

    // Sync old team attendance data to monthlyActivities
    const [hasSyncedOldAttendance, setHasSyncedOldAttendance] = useState(false);
    const isSyncingRef = useRef(false);

    // 🔥 NEW: Trigger detailed data loading on mount
    // This ensures that even if user navigates directly to this page, data is refreshed
    useEffect(() => {
        if (loggedInEmployee?.id) {
            loadDetailedEmployeeData(loggedInEmployee.id).catch(err => {
                console.error('⚠️ [AktivitasSayaContainer] Pre-load failed:', err);
            });

            // 🔥 FIX: Load monthly report submissions to ensure status is up to date
            loadMonthlyReportSubmissionsFromSupabase().catch(console.error);

            // 🔥 FIX: Load Requests for Mentor Approval
            if (loggedInEmployee.canBeMentor || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                loadTadarusRequestsFromSupabase().catch(console.error);
                loadMissedPrayerRequestsFromSupabase().catch(console.error);
            }
        }
    }, [loggedInEmployee?.id, loadDetailedEmployeeData, loadMonthlyReportSubmissionsFromSupabase]);

    const { activityStatsRefreshCounter } = useAppDataStore();
    // 🔥 NEW: Trigger detailed load when activityStatsRefreshCounter changes
    useEffect(() => {
        if (loggedInEmployee?.id && activityStatsRefreshCounter > 0) {
            console.log(`🔄 [AktivitasSayaContainer] Triggering detailed data refresh (Counter: ${activityStatsRefreshCounter})`);
            loadDetailedEmployeeData(loggedInEmployee.id, true); // Force refresh
        }
    }, [activityStatsRefreshCounter, loggedInEmployee?.id, loadDetailedEmployeeData]);

    // 🔥 FIX: Load all employees data for mentors to display mentee list
    // This is necessary because mentee data comes from allUsersData
    useEffect(() => {
        const hasMentorRole = loggedInEmployee?.canBeMentor === true;
        const hasApprovalRole = loggedInEmployee?.canBeSupervisor === true || loggedInEmployee?.canBeKaUnit === true;

        // Only load if user has mentor/approval role and allUsersData is mostly empty
        if ((hasMentorRole || hasApprovalRole) && Object.keys(allUsersData).length <= 1) {
            console.log('🔄 [AktivitasSayaContainer] Loading all employees for mentor/approval roles...');
            loadAllEmployees().catch(err => {
                console.error('⚠️ [AktivitasSayaContainer] Failed to load all employees:', err);
            });
        }
    }, [loggedInEmployee?.canBeMentor, loggedInEmployee?.canBeSupervisor, loggedInEmployee?.canBeKaUnit, allUsersData, loadAllEmployees]);

    // --- Handlers ---
    const handleUpdateProfile = useCallback(async (userId: string, updates: Partial<Omit<Employee, 'id' | 'password'>>) => {
        const oldUser = allUsersData[userId]?.employee;
        if (!oldUser) return false;

        // 🔥 FIX: Check if this is the logged-in user BEFORE updating
        const isLoggedInUser = loggedInEmployee?.id === userId;

        // Update local state FIRST (optimistic update)
        setAllUsersData(prevData => {
            const allDataCopy: typeof prevData = JSON.parse(JSON.stringify(prevData));
            const userToUpdateData = allDataCopy[userId];
            if (!userToUpdateData) return prevData;

            const existingMonthlyActivities = userToUpdateData.employee.monthlyActivities || {};
            const updatedEmployee = {
                ...userToUpdateData.employee,
                ...updates,
                monthlyActivities: updates.monthlyActivities ? { ...existingMonthlyActivities, ...updates.monthlyActivities } : existingMonthlyActivities
            };
            allDataCopy[userId].employee = updatedEmployee;

            // 🔥 FIX: ONLY update loggedInEmployee if role changes (affects navigation)
            if (isLoggedInUser && (updates as any).role) {
                setLoggedInEmployee(updatedEmployee);
            }

            return allDataCopy;
        });

        // 🔥 FIX: Save to Supabase database
        try {
            // Use updateEmployee service to persist changes to database
            const updatedEmployee = await updateEmployee(userId, updates);

            // Force refresh data from Supabase to ensure consistency
            const freshEmployee = await getEmployeeById(userId);
            if (freshEmployee) {
                setAllUsersData(prev => ({
                    ...prev,
                    [freshEmployee.id]: {
                        ...prev[freshEmployee.id],
                        employee: freshEmployee
                    }
                }));

                // 🔥 FIX: ONLY update loggedInEmployee if role changes
                if (isLoggedInUser && (updates as any).role) {
                    setLoggedInEmployee(freshEmployee);
                }
            }

            return true;
        } catch (error) {
            // Rollback the optimistic update on failure
            console.error('Failed to update profile in database:', error);

            // Restore original data from local state
            setAllUsersData(prev => {
                const allDataCopy: typeof prev = JSON.parse(JSON.stringify(prev));
                allDataCopy[userId].employee = oldUser;

                // 🔥 FIX: ONLY restore loggedInEmployee if role was changed
                if (isLoggedInUser && (updates as any).role) {
                    setLoggedInEmployee(oldUser);
                }

                return allDataCopy;
            });

            // Show error notification
            addToast(
                `Gagal menyimpan perubahan: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );

            return false;
        }
    }, [allUsersData, setAllUsersData, loggedInEmployee?.id, setLoggedInEmployee, addToast]);





    // --- Sync old team attendance data to monthlyActivities ---
    const syncOldTeamAttendanceData = useCallback(async () => {
        // Prevent infinite loop with ref
        if (isSyncingRef.current || hasSyncedOldAttendance || !loggedInEmployee) {
            return;
        }

        // Set syncing flag
        isSyncingRef.current = true;

        // Mapping session type to activity ID
        const sessionTypeToActivityId: Record<string, string> = {
            'Doa Bersama': 'doa_bersama',
            'KIE': 'tepat_waktu_kie',
        };

        let updateCount = 0;
        const syncedActivities: Array<{ date: string; type: string; activityId: string }> = [];

        try {
            // Process all team attendance records
            for (const record of teamAttendanceRecords) {
                const { sessionDate: date, sessionType: type, userId } = record;

                // Only update if this user is the logged in employee
                if (userId !== loggedInEmployee.id) continue;

                // Get activity ID for this session type
                const activityId = sessionTypeToActivityId[type];
                if (!activityId) {
                    continue;
                }

                // Extract month key and day key from date (YYYY-MM-DD)
                const monthKey = date.substring(0, 7); // YYYY-MM
                const dayKey = date.substring(8, 10); // DD

                const currentMonthProgress = loggedInEmployee.monthlyActivities?.[monthKey] || {};
                const currentDayProgress = currentMonthProgress[dayKey] || {};

                // Check if activity is already marked
                if (currentDayProgress[activityId]) {
                    continue;
                }

                // 🔥 FIX: BERSIHKAN data sebelum disimpan!
                // Filter out any foreign fields (kie, doaBersama, etc.) from currentMonthProgress
                const cleanedMonthProgress: any = {};
                Object.keys(currentMonthProgress).forEach(key => {
                    // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
                    if (key.match(/^\d{2}$/)) {
                        cleanedMonthProgress[key] = currentMonthProgress[key];
                    }
                    // Field asing akan DIHAPUS!
                });

                // Update monthlyActivities with CLEANED data
                const updatedMonthProgress = {
                    ...cleanedMonthProgress,
                    [dayKey]: {
                        ...currentDayProgress,
                        [activityId]: true,
                    }
                };

                // 🔥 FIX: JANGAN simpan ke loggedInEmployee - akan simpan data kotor!
                // Simpan ke allUsersData dan Supabase saja
                const fullMonthlyActivities = {
                    ...(loggedInEmployee.monthlyActivities || {}),
                    [monthKey]: updatedMonthProgress
                };

                // Hanya update allUsersData, JANGAN update loggedInEmployee
                setAllUsersData(prev => ({
                    ...prev,
                    [userId]: {
                        ...prev[userId],
                        employee: {
                            ...prev[userId].employee,
                            monthlyActivities: fullMonthlyActivities
                        }
                    }
                }));

                // 🔥 FIX: Simpan ke employee_monthly_activities sebagai CACHE
                try {
                    const { updateMonthlyActivities: updateService } = await import('@/services/monthlyActivityService');
                    await updateService(userId, fullMonthlyActivities);
                } catch (error) {
                    if (process.env.NODE_ENV === "development") {
                        console.error('❌ [syncOldTeamAttendanceData] Failed to cache:', error);
                    }
                }

                updateCount++;
                syncedActivities.push({ date, type, activityId });
            }

            if (updateCount > 0) {
                addToast(`${updateCount} data kehadiran lama berhasil disinkronkan ke dashboard`, 'success');
            }

            setHasSyncedOldAttendance(true);
        } catch (error) {
            console.error('Error syncing old team attendance:', error);
        } finally {
            // Always clear the syncing flag
            isSyncingRef.current = false;
        }
    }, [hasSyncedOldAttendance, loggedInEmployee, teamAttendanceRecords, setAllUsersData, addToast]);

    // Sync old data when team attendance sessions are loaded
    useEffect(() => {
        if (teamAttendanceSessions.length > 0 && !hasSyncedOldAttendance && !isSyncingRef.current) {
            syncOldTeamAttendanceData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamAttendanceSessions.length, hasSyncedOldAttendance]); // Only trigger on count change, not on function reference change

    const handleSubmitMonthlyReport = async (monthKey: string) => {
        if (!loggedInEmployee) return;

        try {
            const { submitMonthlyReport } = await import('@/services/monthlySubmissionService');
            const newSubmission = await submitMonthlyReport(loggedInEmployee.id, monthKey, {
                menteeName: loggedInEmployee.name,
                mentorId: loggedInEmployee.mentorId || '',
                supervisorId: loggedInEmployee.supervisorId || '',
                kaUnitId: loggedInEmployee.kaUnitId || '',
                managerId: loggedInEmployee.managerId || '',
            });

            if (newSubmission) {
                addOrUpdateMonthlyReportSubmission(newSubmission);

                // Notify Mentor
                if (loggedInEmployee.mentorId) {
                    createNotification({
                        userId: loggedInEmployee.mentorId,
                        type: 'monthly_report_submitted',
                        title: 'Laporan Bulanan Baru',
                        message: `${loggedInEmployee.name} telah mengirimkan laporan bulanan ${monthKey}.`,
                        linkTo: `/persetujuan?reportId=${newSubmission.id}` as any,
                        relatedEntityId: newSubmission.id,
                    });
                }

                addToast('Laporan bulanan berhasil dikirim', 'success');
            } else {
                addToast('Gagal mengirim laporan bulanan. Mungkin Anda sudah mengirim laporan untuk bulan ini.', 'error');
            }
        } catch (error: any) {
            addToast(`Gagal mengirim laporan: ${error.message}`, 'error');
        }
    };

    // Helper function to validate if a date is within the current month and not locked
    const isDateValidForMutabaahUpdate = useCallback((dateString: string, employee: Employee): boolean => {
        if (!dateString) return false;

        const selectedDate = new Date(dateString);
        selectedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Block future dates
        if (selectedDate > today) {
            return false;
        }

        // 2. Check if selectedDate is in the current month
        // "Tepat jam 00 akhir bulan laporan di tutup"
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedYear = selectedDate.getFullYear();

        if (todayYear !== selectedYear || todayMonth !== selectedMonth) {
            return false;
        }

        // 3. Check if month is already submitted
        const monthKey = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}`;
        const hasSubmitted = monthlyReportSubmissions.some(s => s.menteeId === employee.id && s.monthKey === monthKey && (s.status.startsWith('pending_') || s.status === 'approved'));
        if (hasSubmitted) {
            return false;
        }

        return true;
    }, [monthlyReportSubmissions]);

    const handleLogManualActivity = useCallback(async (activityId: string, date: string): Promise<boolean> => {
        if (!loggedInEmployee) return false;

        if (process.env.NODE_ENV === "development") console.log('🔵 [handleLogManualActivity] Called with:', { activityId, date, employeeId: loggedInEmployee.id });

        if (isDateValidForMutabaahUpdate(date, loggedInEmployee)) {
            // 🔥 FIX: Get latest data from allUsersData instead of loggedInEmployee
            const latestEmployeeData = allUsersData[loggedInEmployee.id]?.employee || loggedInEmployee;
            // Original data for rollback - use deep copy to avoid reference issues
            const originalMonthlyActivities = JSON.parse(JSON.stringify(latestEmployeeData.monthlyActivities || {}));

            try {
                const dateObj = new Date(date + 'T12:00:00Z');
                const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                const dayKey = dateObj.getDate().toString().padStart(2, '0');

                // 1. Optimistic Update in allUsersData
                const monthlyActivities = JSON.parse(JSON.stringify(latestEmployeeData.monthlyActivities || {}));
                if (!monthlyActivities[monthKey]) monthlyActivities[monthKey] = {};
                if (!monthlyActivities[monthKey][dayKey]) monthlyActivities[monthKey][dayKey] = {};
                monthlyActivities[monthKey][dayKey][activityId] = true;

                setAllUsersData(prev => ({
                    ...prev,
                    [loggedInEmployee.id]: {
                        ...prev[loggedInEmployee.id],
                        employee: {
                            ...prev[loggedInEmployee.id].employee,
                            monthlyActivities: monthlyActivities
                        }
                    }
                }));

                // 2. Save to database using monthlyReportService (SOURCE OF TRUTH)
                if (process.env.NODE_ENV === "development") console.log('🔄 [handleLogManualActivity] Saving to database...');

                const { addManualReportByDate } = await import('@/services/monthlyReportService');
                await addManualReportByDate(loggedInEmployee.id, monthKey, activityId, date);

                if (process.env.NODE_ENV === "development") console.log('✅ [handleLogManualActivity] Saved to DB (employee_monthly_reports)');

                addToast('Aktivitas berhasil dilaporkan.', 'success');
                return true;

            } catch (error: any) {
                if (process.env.NODE_ENV === "development") console.error('❌ [handleLogManualActivity] Error saving:', error);

                // Rollback optimistic update
                setAllUsersData(prev => ({
                    ...prev,
                    [loggedInEmployee.id]: {
                        ...prev[loggedInEmployee.id],
                        employee: {
                            ...prev[loggedInEmployee.id].employee,
                            monthlyActivities: originalMonthlyActivities
                        }
                    }
                }));

                const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Gagal menyimpan data');
                addToast(`Gagal menyimpan: ${errorMessage}`, 'error');
                return false;
            }
        } else {
            if (process.env.NODE_ENV === "development") console.log('❌ [handleLogManualActivity] Date validation failed');
            addToast('Tidak dapat melaporkan aktivitas karena pekan telah terlewat/terkunci.', 'error');
            return false;
        }
    }, [loggedInEmployee, allUsersData, isDateValidForMutabaahUpdate, addToast, setAllUsersData]);

    const handleLogBookReading = useCallback(async (bookTitle: string, pagesRead: string, dateCompleted: string) => {
        if (!loggedInEmployee) return;

        try {
            const newHistory: ReadingHistory = {
                id: Date.now().toString(),
                bookTitle,
                pagesRead,
                dateCompleted
            };
            const updatedHistory = [...(loggedInEmployee.readingHistory || []), newHistory];

            // Get activity ID
            const activityIdToUpdate = dailyActivitiesConfig.find(d => d.automationTrigger?.type === 'BOOK_READING_REPORT')?.id;

            if (activityIdToUpdate) {
                if (isDateValidForMutabaahUpdate(dateCompleted, loggedInEmployee)) {
                    // Calculate month key from dateCompleted
                    const date = new Date(dateCompleted + 'T12:00:00Z');
                    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                    // Save to employee_monthly_reports table using new service
                    const { addBookReadingReport } = await import('@/services/monthlyReportService');
                    await addBookReadingReport(
                        loggedInEmployee.id,
                        monthKey,
                        activityIdToUpdate,
                        bookTitle,
                        pagesRead,
                        dateCompleted
                    );

                    // Update local state
                    handleUpdateProfile(loggedInEmployee.id, {
                        readingHistory: updatedHistory
                    });

                    addToast('Laporan membaca buku berhasil disimpan!', 'success');
                } else {
                    addToast('Riwayat membaca dicatat, namun tidak ditandai di mutaba\'ah karena pekan telah terlewat/terkunci.', 'success');
                    // Still save readingHistory even if not valid for mutabaah
                    handleUpdateProfile(loggedInEmployee.id, {
                        readingHistory: updatedHistory
                    });
                }
            }
        } catch (error) {
            console.error('Error in handleLogBookReading:', error);
            addToast('Gagal menyimpan laporan buku ke database. Silakan coba lagi.', 'error');
        }
    }, [loggedInEmployee, handleUpdateProfile, dailyActivitiesConfig, isDateValidForMutabaahUpdate, addToast]);


    const handleReviewReport = useCallback(async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'manager' | 'kaunit') => {
        if (!loggedInEmployee) return;

        try {
            // 1. Determine new status based on decision and reviewer role
            let status = '';
            if (decision === 'rejected') {
                status = `rejected_${reviewerRole}`;
            } else {
                if (reviewerRole === 'mentor') status = 'pending_supervisor';
                else if (reviewerRole === 'supervisor') status = 'pending_kaunit';
                else if (reviewerRole === 'kaunit') status = 'pending_manager';
                else if (reviewerRole === 'manager') status = 'approved';
            }

            // 2. Prepare update payload
            const updates: any = { status };
            const now = Date.now();
            if (reviewerRole === 'mentor') {
                updates.mentorNotes = notes;
                updates.mentorReviewedAt = now;
            } else if (reviewerRole === 'supervisor') {
                updates.supervisorNotes = notes;
                updates.supervisorReviewedAt = now;
            } else if (reviewerRole === 'kaunit') {
                updates.kaUnitNotes = notes;
                updates.kaUnitReviewedAt = now;
            } else if (reviewerRole === 'manager') {
                updates.managerNotes = notes;
                updates.managerReviewedAt = now;
            }

            // 3. Call service
            const { reviewMonthlyReport } = await import('@/services/monthlySubmissionService');
            const updatedSubmission = await reviewMonthlyReport(submissionId, updates);

            if (updatedSubmission) {
                // 4. Update local store
                addOrUpdateMonthlyReportSubmission(updatedSubmission);

                // 5. Notify parties
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
                        let nextRoleLabel = '';

                        if (reviewerRole === 'mentor') {
                            nextReviewerId = updatedSubmission.supervisorId || '';
                            nextRoleLabel = 'Supervisor';
                        } else if (reviewerRole === 'supervisor') {
                            nextReviewerId = updatedSubmission.kaUnitId || '';
                            nextRoleLabel = 'Kepala Unit';
                        } else if (reviewerRole === 'kaunit') {
                            nextReviewerId = updatedSubmission.managerId || '';
                            nextRoleLabel = 'Manajer';
                        }

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
                throw new Error('Failed to update report');
            }
        } catch (error) {
            console.error('Error reviewing report:', error);
            addToast('Gagal memperbarui status laporan. Silakan coba lagi.', 'error');
        }
    }, [loggedInEmployee, monthlyReportSubmissions, addOrUpdateMonthlyReportSubmission, createNotification, addToast]);

    const handleOpenAssignmentLetter = (detail: {
        recipient: Employee;
        roleName: 'Mentor' | 'Supervisor' | 'Kepala Unit';
        assignmentType: 'assignment' | 'removal' | 'change' | 'designation' | 'revocation';
        assigneeName?: string;
        previousAssigneeName?: string;
        notificationTimestamp: number;
    }) => {
        setAssignmentLetter(detail);
    };

    // Render the AktivitasSaya component
    const aktivitasSayaComponent = loggedInEmployee ? (
        <AktivitasSaya
            employee={loggedInEmployee}
            dailyActivitiesConfig={dailyActivitiesConfig}
            onLogBookReading={handleLogBookReading}
            onLogManualActivity={handleLogManualActivity}
            onDeleteReadingHistory={(type, id, date) => {
                // Implementation would go here
            }}
            submissions={monthlyReportSubmissions}
            allUsersData={allUsersData}
            monthlyReportSubmissions={monthlyReportSubmissions}
            onSubmitMonthlyReport={handleSubmitMonthlyReport}
            initialTab={(searchParams?.get('tab') as any) || initialTab}
            tadarusRequests={tadarusRequests}
            tadarusSessions={tadarusSessions}
            missedPrayerRequests={missedPrayerRequests}
            onUpdateProfile={handleUpdateProfile}
            onReviewReport={handleReviewReport}
            onCreateTadarusSession={(data: any) => {
                addTadarusSessions([data]);
            }}
            onUpdateTadarusSession={(sessionId: string, updates: any) => {
                updateTadarusSession(sessionId, () => updates);
            }}
            onDeleteTadarusSession={deleteTadarusSession}
            onReviewTadarusRequest={async (requestId: string, status: string) => {
                const req = (tadarusRequests as any[]).find(r => r.id === requestId);
                if (!req) return;

                try {
                    // 1. Update request status in DB
                    // 🔥 Side effect: Backend API will now automatically update monthly_reports AND team_attendance_records
                    const response = await fetch('/api/manual-requests/tadarus', {
                        method: 'PATCH',
                        body: JSON.stringify({ id: requestId, status })
                    });

                    if (!response.ok) throw new Error('Failed to update request');

                    // 2. Update local state
                    const updatedRequest: TadarusRequest = {
                        ...req,
                        status: status as any,
                        reviewedAt: Date.now()
                    };
                    await addOrUpdateTadarusRequest(updatedRequest);

                    // 3. If Approved, update local performance UI (Optimistic)
                    if (status === 'approved') {
                        const categoryMap: Record<string, string> = {
                            'bbq': 'tadarus', 'umum': 'tadarus', 'tadarus': 'tadarus',
                            'kie': 'tepat_waktu_kie',
                            'doa bersama': 'doa_bersama',
                            'kajian selasa': 'kajian_selasa',
                            'pengajian persyarikatan': 'persyarikatan',
                            'persyarikatan': 'persyarikatan'
                        };
                        const categoryKey = (req.category || 'umum').toLowerCase().trim();
                        const activityId = categoryMap[categoryKey] || 'tadarus';

                        try {
                            const menteeData = allUsersData[req.menteeId]?.employee;
                            if (menteeData) {
                                const dateObj = new Date(req.date + 'T12:00:00Z');
                                const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                                const dayKey = dateObj.getDate().toString().padStart(2, '0');

                                // Local checklist update
                                const currentMonthAct = menteeData.monthlyActivities?.[monthKey] || {};
                                const currentDayAct = currentMonthAct[dayKey] || {};
                                const newMonthlyActivities = {
                                    ...menteeData.monthlyActivities,
                                    [monthKey]: {
                                        ...currentMonthAct,
                                        [dayKey]: { ...currentDayAct, [activityId]: true }
                                    }
                                };

                                setAllUsersData(prev => ({
                                    ...prev,
                                    [req.menteeId]: {
                                        ...prev[req.menteeId],
                                        employee: { ...prev[req.menteeId].employee, monthlyActivities: newMonthlyActivities }
                                    }
                                }));

                                // FORCE REFRESH: Reload from backend to sync side-effects
                                await loadDetailedEmployeeData(req.menteeId, true);
                            }
                        } catch (err) {
                            console.error('Failed to update local activity UI:', err);
                        }
                    }

                    // 4. Notify Mentee
                    createNotification({
                        userId: req.menteeId,
                        type: status === 'approved' ? 'tadarus_approved' : 'tadarus_rejected',
                        title: `Pengajuan ${req.category || 'Kegiatan'} ${status === 'approved' ? 'Disetujui' : 'Ditolak'}`,
                        message: `Pengajuan ${req.category || 'kegiatan'} tanggal ${new Date(req.date).toLocaleDateString('id-ID')} telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.`,
                        linkTo: '/aktifitas-saya',
                        relatedEntityId: req.id,
                    });

                    addToast(`Pengajuan ${req.category || 'tadarus'} berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
                } catch (error) {
                    addToast('Gagal memproses pengajuan tadarus.', 'error');
                }
            }}
            onReviewMissedPrayerRequest={async (requestId: string, status: string, mentorNotes?: string) => {
                const req = (missedPrayerRequests as any[]).find(r => r.id === requestId);
                if (!req) return;

                try {
                    // 1. Update request status in DB
                    // 🔥 Side effect: Backend API will now automatically insert into attendance_records
                    const response = await fetch('/api/manual-requests/prayer', {
                        method: 'PATCH',
                        body: JSON.stringify({ id: requestId, status, mentor_notes: mentorNotes })
                    });

                    if (!response.ok) throw new Error('Failed to update request');

                    // 2. Update local state
                    const updatedRequest: MissedPrayerRequest = {
                        ...req,
                        status: status as any,
                        reviewedAt: Date.now(),
                        mentorNotes: mentorNotes
                    };
                    addOrUpdateMissedPrayerRequest(updatedRequest);

                    // 3. If Approved, update local performance UI
                    if (status === 'approved') {
                        try {
                            const menteeData = allUsersData[req.menteeId]?.employee;
                            if (menteeData) {
                                const dateObj = new Date(req.date + 'T12:00:00Z');
                                const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                                const dayKey = dateObj.getDate().toString().padStart(2, '0');
                                const prayerId = req.prayerId;

                                // Update local checklist
                                const currentMonthAct = menteeData.monthlyActivities?.[monthKey] || {};
                                const currentDayAct = currentMonthAct[dayKey] || {};
                                const newMonthlyActivities = {
                                    ...menteeData.monthlyActivities,
                                    [monthKey]: {
                                        ...currentMonthAct,
                                        [dayKey]: { ...currentDayAct, [prayerId]: true }
                                    }
                                };

                                setAllUsersData(prev => ({
                                    ...prev,
                                    [req.menteeId]: {
                                        ...prev[req.menteeId],
                                        employee: { ...prev[req.menteeId].employee, monthlyActivities: newMonthlyActivities }
                                    }
                                }));

                                // FORCE REFRESH: Reload detailed data to sync charts with backend side-effects
                                await loadDetailedEmployeeData(req.menteeId, true);
                            }
                        } catch (err) {
                            console.error('Failed to update local performance UI:', err);
                        }
                    }

                    // 4. Notify Mentee
                    createNotification({
                        userId: req.menteeId,
                        type: status === 'approved' ? 'missed_prayer_approved' : 'missed_prayer_rejected',
                        title: `Presensi Sholat ${status === 'approved' ? 'Disetujui' : 'Ditolak'}`,
                        message: `Pengajuan presensi ${req.prayerName} tanggal ${new Date(req.date).toLocaleDateString('id-ID')} telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.`,
                        linkTo: '/aktifitas-saya',
                        relatedEntityId: req.id,
                    });

                    addToast(`Permohonan presensi berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
                } catch (error) {
                    addToast('Gagal memproses permohonan presensi.', 'error');
                }
            }}
            onMentorAttendOwnSession={async (sessionId: string) => {
                try {
                    await updateTadarusSession(sessionId, { mentorPresent: true });
                    addToast('Kehadiran mentor berhasil dicatat', 'success');
                } catch (error) {
                    addToast('Gagal mencatat kehadiran mentor.', 'error');
                }
            }}
            hospitals={hospitals}
            addToast={addToast}
            loadDetailedEmployeeData={loadDetailedEmployeeData}
        />
    ) : (
        <MinimalistLoader message="Memuat data..." />
    );

    return (
        <>
            {aktivitasSayaComponent}
            {/* AssignmentLetter modal */}
            {assignmentLetter && (
                <AssignmentLetter
                    recipient={assignmentLetter.recipient}
                    roleName={assignmentLetter.roleName}
                    assignmentType={assignmentLetter.assignmentType}
                    assigneeName={assignmentLetter.assigneeName}
                    previousAssigneeName={assignmentLetter.previousAssigneeName}
                    onClose={() => setAssignmentLetter(null)}
                    notificationTimestamp={assignmentLetter.notificationTimestamp}
                />
            )}
        </>
    );
};

export default AktivitasSayaContainer;