'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import AktivitasSaya from '@/components/AktivitasSaya';
import AssignmentLetter from '@/components/AssignmentLetter';
import {
    useAppDataStore,
    useUIStore
} from '@/store/store';
import { isAnyAdmin } from '@/lib/rolePermissions';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuditLogStore } from '@/store/auditLogStore';
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
    const { loggedInEmployee, setAllUsersData, allUsersData, setLoggedInEmployee, loadDetailedEmployeeData, loadAllEmployees } = useAppDataStore();
    const { addToast } = useUIStore();
    // Note: Navigation handled by useRouter

    // Stores
    const { sunnahIbadahList } = useSunnahIbadahStore();
    const { createNotification } = useNotificationStore();
    const { logAudit } = useAuditLogStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { activities, teamAttendanceSessions, teamAttendanceRecords, addActivity, addTeamAttendanceSessions, createTeamAttendanceRecord, updateTeamAttendanceSessionData, deleteTeamAttendanceSession, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase } = useActivityStore();
    const { weeklyReportSubmissions, tadarusSessions, tadarusRequests, missedPrayerRequests, menteeTargets, addOrUpdateWeeklyReportSubmission, addTadarusSessions, updateTadarusSession, deleteTadarusSession, addOrUpdateTadarusRequest, addOrUpdateMissedPrayerRequest, addMenteeTarget, updateMenteeTarget, deleteMenteeTarget } = useGuidanceStore();
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
        }
    }, [loggedInEmployee?.id, loadDetailedEmployeeData]);

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

    const handleSubmitWeeklyReport = (monthKey: string, weekIndex: number) => {
        if (!loggedInEmployee) return;
        const subId = `${loggedInEmployee.id}-${monthKey}-${weekIndex}`;
        addOrUpdateWeeklyReportSubmission({
            id: subId,
            menteeId: loggedInEmployee.id,
            menteeName: loggedInEmployee.name,
            monthKey,
            weekIndex,
            submittedAt: Date.now(),
            status: 'pending_mentor',
            mentorId: loggedInEmployee.mentorId || '',
        });
        addToast('Laporan mingguan berhasil dikirim', 'success');
    };

    // Helper function to validate if a date is within the current week and not locked
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

        // 2. Check if selectedDate is in the current week (Monday to Sunday)
        const currentDayOfWeek = today.getDay();
        const firstDayOfThisWeek = new Date(today);
        const dayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        firstDayOfThisWeek.setDate(today.getDate() - dayOffset);

        if (selectedDate < firstDayOfThisWeek) {
            return false;
        }

        // 3. Check submission status for the current week
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const weeksForCurrentMonth = getBalancedWeeks(new Date(today.getFullYear(), today.getMonth(), 1));
        const currentWeekIndexForToday = weeksForCurrentMonth.findIndex(w => w.days.includes(today.getDate()));

        if (currentWeekIndexForToday !== -1) {
            const userSubmissions = weeklyReportSubmissions.filter(s => s.menteeId === employee.id);
            const currentWeeklySubmission = userSubmissions.find(s => s.monthKey === monthKey && s.weekIndex === currentWeekIndexForToday);
            if (currentWeeklySubmission && (currentWeeklySubmission.status.startsWith('pending_') || currentWeeklySubmission.status === 'approved')) {
                return false;
            }
        }

        return true;
    }, [weeklyReportSubmissions]);

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


    const handleReviewReport = useCallback(async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit') => {
        if (!loggedInEmployee) return;

        try {
            // Save to database
            const { updateWeeklyReport } = await import('@/services/weeklyReportService');

            let status = '';
            if (decision === 'approved') {
                if (reviewerRole === 'mentor') status = 'pending_supervisor';
                else if (reviewerRole === 'supervisor') status = 'pending_kaunit';
                else if (reviewerRole === 'kaunit') status = 'approved';
            } else {
                status = `rejected_${reviewerRole}`;
            }

            await updateWeeklyReport(submissionId, loggedInEmployee.id, { status, notes });

            addToast(`Laporan berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error) {
            addToast('Gagal memperbarui status laporan. Silakan coba lagi.', 'error');
        }
    }, [loggedInEmployee?.id, addToast]);

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
            submissions={weeklyReportSubmissions}
            allUsersData={allUsersData}
            weeklyReportSubmissions={weeklyReportSubmissions}
            weeklyReportSubmissions={weeklyReportSubmissions}
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
                try {
                    const existingRequest = (tadarusRequests as any[]).find(r => r.id === requestId);
                    if (!existingRequest) return;

                    const updatedRequest: TadarusRequest = {
                        ...existingRequest,
                        status: status as any,
                        reviewedAt: Date.now()
                    };

                    await addOrUpdateTadarusRequest(updatedRequest);
                    addToast(`Pengajuan tadarus berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
                } catch (error) {
                    addToast('Gagal memproses pengajuan tadarus.', 'error');
                }
            }}
            onReviewMissedPrayerRequest={async (requestId: string, status: string, mentorNotes?: string) => {
                try {
                    const existingRequest = (missedPrayerRequests as any[]).find(r => r.id === requestId);
                    if (!existingRequest) return;

                    const updatedRequest: MissedPrayerRequest = {
                        ...existingRequest,
                        status: status as any,
                        reviewedAt: Date.now(),
                        mentorNotes: mentorNotes
                    };

                    // Implement saving to database for missed prayer request if service exists
                    // For now, update local state
                    addOrUpdateMissedPrayerRequest(updatedRequest);
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
            onLogAudit={logAudit}
            onCreateMenteeTarget={(target) => {
                addMenteeTarget(target);
                addToast('Target baru berhasil ditetapkan!', 'success');
            }}
            onDeleteMenteeTarget={(targetId) => {
                deleteMenteeTarget(targetId);
                addToast('Target berhasil dihapus!', 'success');
            }}
            menteeTargets={menteeTargets}
            hospitals={hospitals}
            addToast={addToast}
            loadDetailedEmployeeData={loadDetailedEmployeeData}
        />
    ) : (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
                <p className="mt-4 text-white">Memuat data...</p>
            </div>
        </div>
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