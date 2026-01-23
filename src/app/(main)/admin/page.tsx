'use client';
// @ts-nocheck

// 🔥 OPTIMIZATION: Removed 'force-dynamic' to enable smooth client-side navigation
// Data is already fetched client-side via useEffect, so server-side rendering is not needed
// This provides SPA-like experience with no full page refreshes

import React, { useEffect, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useJobStructureStore } from '@/store/jobStructureStore';
import { useAuditLogStore } from '@/store/auditLogStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useMutabaahStore } from '@/store/mutabaahStore';
import { useNotificationStore } from '@/store/notificationStore';
import ConfirmationModal from '@/components/ConfirmationModal';
import BrandedLoader from '@/components/BrandedLoader';

// 🔥 OPTIMIZATION: Dynamic import untuk AdminDashboard - 200KB+ akan di-load LAZY!
// Ini mengurangi initial bundle size dan mempercepat first load
const AdminDashboard = dynamicImport(() => import('@/components/AdminDashboard'), {
    loading: () => <BrandedLoader />,
    ssr: false // Admin Dashboard tidak butuh SEO
});
import { Activity, SunnahIbadah, Announcement, type RawEmployee, type Hospital, type Employee, type Attendance, type FunctionalRole, type MutabaahLockingMode, type Role } from '@/types';
import { getAllEmployees, updateEmployee as updateEmployeeSupabase, deleteEmployee as deleteEmployeeSupabase, createEmployee as createEmployeeSupabase, convertToCamelCase } from '@/services/employeeService';
import { getPaginatedEmployees } from '@/services/employeeServicePaginated';
import { getAllHospitals, createHospital as createHospitalSupabase, updateHospital as updateHospitalSupabase, deleteHospital as deleteHospitalSupabase, toggleHospitalStatus as toggleHospitalStatusSupabase } from '@/services/hospitalService';
import { validateRoleChange } from '@/lib/rolePermissions';
// import { supabase } from '@/lib/supabase'; // Unused import

export default function AdminPage() {
    const { allUsersData, loggedInEmployee, setAllUsersData, loadAllEmployees, isLoadingEmployees } = useAppDataStore();
    const { addToast } = useUIStore();
    const { activities, addActivity, updateActivity, deleteActivity } = useActivityStore();
    const { sunnahIbadahList, addSunnahIbadah, updateSunnahIbadah, deleteSunnahIbadah } = useSunnahIbadahStore();
    const { dailyActivitiesConfig, updateDailyActivitiesConfig } = useDailyActivitiesStore();
    const { jobStructure, updateJobStructure } = useJobStructureStore();
    const { auditLog, logAudit } = useAuditLogStore();
    const { announcements, addAnnouncement, deleteAnnouncement, loadAnnouncements } = useAnnouncementStore();
    const { mutabaahLockingMode, setMutabaahLockingMode } = useMutabaahStore();
    const { createNotification } = useNotificationStore();
    // const { hospitals: localHospitals, addHospital, updateHospital, deleteHospital, toggleHospitalStatus } = useHospitalStore(); // Unused - using hospitals state instead

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);

    // ✅ Pagination state (for employee management)
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [employeesLoaded, setEmployeesLoaded] = useState(false); // Track if employees have been loaded

    const [mutabaahConfirmModal, setMutabaahConfirmModal] = useState<{
        isOpen: boolean;
        mode: MutabaahLockingMode | null;
    }>({ isOpen: false, mode: null });

    // Handler untuk update mutabaah locking mode dengan konfirmasi
    const handleUpdateMutabaahLockingMode = async (mode: MutabaahLockingMode) => {
        // 🔥 NEW: Allow owner and super-admin to change this setting
        if (loggedInEmployee?.role !== 'super-admin') {
            addToast('❌ Hanya Super Admin yang dapat mengubah pengaturan global ini!', 'error');
            return;
        }

        // Buka modal konfirmasi
        setMutabaahConfirmModal({ isOpen: true, mode });
    };

    const handleConfirmMutabaahChange = async () => {
        const { mode } = mutabaahConfirmModal;
        if (!mode) return;

        // Simpan ke Supabase (dengan isSuperAdmin=true dan userId)
        await setMutabaahLockingMode(mode, true, loggedInEmployee?.id);
        addToast('✅ Pengaturan berhasil disimpan!', 'success');

        // Tutup modal
        setMutabaahConfirmModal({ isOpen: false, mode: null });
    };

    const handleCloseMutabaahModal = () => {
        setMutabaahConfirmModal({ isOpen: false, mode: null });
    };

    // ✅ NEW: Pagination handlers
    const handleNextPage = () => {
        setPage(p => Math.min(p + 1, totalPages));
    };

    const handlePrevPage = () => {
        setPage(p => Math.max(p - 1, 1));
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setPage(1); // Reset to page 1 when searching
    };

    const handleRoleFilter = (role: string) => {
        setRoleFilter(role);
        setPage(1); // Reset to page 1 when filtering
    };

    const handleIsActiveFilter = (isActive: boolean | undefined) => {
        setIsActiveFilter(isActive);
        setPage(1); // Reset to page 1 when filtering
    };

    const handleRefresh = () => {
        // Trigger refetch by keeping same page
        setPage(p => p);
    };

    // Load admin data from Supabase (NOT including employee data - loaded on-demand)
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 🔥 Load sunnah ibadah from Supabase FIRST
                try {
                    const { getAllSunnahIbadah } = await import('@/services/sunnahIbadahService');
                    const sunnahIbadahFromDb = await getAllSunnahIbadah();

                    // 🔥 REPLACE store data with data from Supabase (not merge!)
                    const { setSunnahIbadahList } = useSunnahIbadahStore.getState();
                    setSunnahIbadahList(sunnahIbadahFromDb);
                } catch (error) {
                }

                // 🔥 REMOVED: Employee data loading - now loaded on-demand in AdminDashboard
                // This prevents "Failed to load employees" error on page load

                // Load hospitals
                const hospitalsData = await getAllHospitals();
                setHospitals(hospitalsData);

                // 🔥 FIX: Load announcements
                try {
                    await loadAnnouncements();
                } catch (error) {
                }

            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load employees from database');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [setAllUsersData, loadAnnouncements]); // 🔥 Removed pagination deps - employee data loaded on-demand in AdminDashboard

    // Handler functions
    const handleToggleStatus = async (userId: string) => {
        try {
            const user = allUsersData[userId];
            if (!user) return;

            const newStatus = !user.employee.isActive;

            // Update in Supabase
            await updateEmployeeSupabase(userId, { isActive: newStatus });

            // Update local state
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[userId]) {
                    newData[userId].employee.isActive = newStatus;
                }
                return newData;
            });
        } catch (err: unknown) {
            addToast('Gagal mengupdate status: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleSetRole = async (userId: string, newRole: Role) => {
        try {
            // Get the user data before updating
            const userToUpdate = allUsersData[userId];
            if (!userToUpdate) {
                throw new Error('User not found');
            }
            const oldRole = userToUpdate.employee.role;

            // 🔥 NEW: Validate role change using permission system
            const validationError = validateRoleChange(loggedInEmployee, userToUpdate.employee, newRole);
            if (validationError) {
                addToast(`❌ ${validationError}`, 'error');
                return;
            }

            // Update in Supabase
            await updateEmployeeSupabase(userId, { role: newRole });

            // Update local state
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[userId]) {
                    newData[userId].employee.role = newRole;
                }
                if (loggedInEmployee) {
                    logAudit({
                        adminId: loggedInEmployee.id,
                        adminName: loggedInEmployee.name,
                        action: 'Role Change',
                        target: `User: ${newData[userId].employee.name} (${userId})`,
                        reason: `Changed role from ${oldRole} to ${newRole}`
                    });
                }
                return newData;
            });

            // 🔥 FIX: Create notification for the user whose role was changed
            const roleLabels: Record<string, string> = {
                'owner': 'Owner',
                'super-admin': 'Super Admin',
                'admin': 'Admin',
                'user': 'User'
            };

            createNotification({
                userId: userId,
                type: 'account_role_changed',
                title: 'Peran Akun Anda Telah Diubah',
                message: `Peran akun Anda telah diubah dari ${roleLabels[oldRole]} menjadi ${roleLabels[newRole]}. Silakan periksa dashboard Anda.`,
                linkTo: {
                    view: 'admin',
                },
                dismissOnClick: false,
            });
        } catch (err: unknown) {
            addToast('Gagal mengupdate role: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleAddUser = async (id: string, newEmployeeData: RawEmployee) => {
        try {
            // Convert RawEmployee to Employee format
            const employee: Employee = {
                ...newEmployeeData,
                id,
                email: `${id}@rsijsp.co.id`, // Generate email from ID
                password: `hashed_${id}`, // Default password
                role: 'user', // Default role for new employees
                gender: newEmployeeData.gender || 'Laki-laki', // Use provided gender
                isActive: true,
                lastVisitDate: new Date().toISOString().split('T')[0],
                notificationEnabled: true,
                profilePicture: null,
                monthlyActivities: {},
                activatedMonths: [],
                canBeMentor: false,
                canBeSupervisor: false,
                canBeKaUnit: false,
                canBeDirut: false,
                functionalRoles: [],
                managerScope: undefined,
                locationId: undefined,
                locationName: undefined,
                readingHistory: [],
                quranReadingHistory: [],
                todoList: [],
                signature: null,
                lastAnnouncementReadTimestamp: undefined,
                managedHospitalIds: [],
                achievements: [],
                mustChangePassword: true // Require password change on first login
            };


            // Create in Supabase
            await createEmployeeSupabase(employee);

            // Reload all employees and their attendance
            const employees = await getAllEmployees();
            const { getEmployeeAttendance } = await import('@/services/attendanceService');

            const newData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }> = {};

            for (const emp of employees) {
                // Load attendance records from Supabase
                let attendanceData: Attendance = {};
                try {
                    const records = await getEmployeeAttendance(emp.id);

                    // Convert AttendanceRecord from Supabase to AttendanceStatus format
                    Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                        if (record && record.status) {
                            attendanceData[entityId] = {
                                status: record.status,
                                reason: record.reason || null,
                                timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                submitted: true,
                                isLateEntry: record.is_late_entry || false
                            };
                        }
                    });
                } catch (error) {
                    attendanceData = {};
                }

                newData[emp.id] = {
                    employee: emp,
                    attendance: attendanceData,
                    history: {}
                };
            }

            setAllUsersData(() => newData);
            return { success: true };
        } catch (err: unknown) {
            // Enhanced error logging

            // Try to extract more error details
            let errorMessage = 'Unknown error';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'object' && err !== null) {
                errorMessage = JSON.stringify(err);
            } else {
                errorMessage = String(err);
            }

            return { success: false, error: errorMessage };
        }
    };

    const handleUpdateUser = async (id: string, updates: RawEmployee) => {
        try {
            // Update in Supabase
            await updateEmployeeSupabase(id, updates);

            // 🔥 FIX: Update ONLY the changed user, don't reload everything!
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[id]) {
                    newData[id].employee = {
                        ...newData[id].employee,
                        ...updates
                    };
                }
                return newData;
            });

            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            // Delete from Supabase
            await deleteEmployeeSupabase(userId);

            // Update local state
            setAllUsersData((prev) => {
                const newData = { ...prev };
                delete newData[userId];
                return newData;
            });
        } catch (err: unknown) {
            addToast('Gagal menghapus user: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleBulkUpdateUsers = async (usersToProcess: (RawEmployee & { id: string; })[]) => {
        let added = 0;
        let updated = 0;
        const failed: { record: RawEmployee & { id: string; }; reason: string; }[] = [];

        for (const user of usersToProcess) {
            try {
                // Check if user exists
                const existing = allUsersData[user.id];

                if (existing) {
                    // Update existing user
                    await updateEmployeeSupabase(user.id, user);
                    updated++;

                    // Update local state
                    setAllUsersData((prev) => {
                        const newData = { ...prev };
                        if (newData[user.id]) {
                            newData[user.id].employee = {
                                ...newData[user.id].employee,
                                ...user
                            };
                        }
                        return newData;
                    });
                } else {
                    // Create new user
                    await createEmployeeSupabase(user as Employee); // Convert to Employee type
                    added++;

                    // Reload all employees to get the new data
                    const employees = await getAllEmployees();
                    const { getEmployeeAttendance } = await import('@/services/attendanceService');

                    const newData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }> = {};

                    for (const emp of employees) {
                        // Load attendance records from Supabase
                        let attendanceData: Attendance = {};
                        try {
                            const records = await getEmployeeAttendance(emp.id);

                            // Convert AttendanceRecord from Supabase to AttendanceStatus format
                            Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                                if (record && record.status) {
                                    attendanceData[entityId] = {
                                        status: record.status,
                                        reason: record.reason || null,
                                        timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                        submitted: true,
                                        isLateEntry: record.is_late_entry || false
                                    };
                                }
                            });
                        } catch (error) {
                            attendanceData = {};
                        }

                        newData[emp.id] = {
                            employee: emp,
                            attendance: attendanceData,
                            history: {}
                        };
                    }

                    setAllUsersData(() => newData);
                }
            } catch (error) {
                failed.push({
                    record: user,
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return { added, updated, failed };
    };

    const handleAdminUpdateAttendance = async (payload: { userId: string; date: string; entityId: string; status: "hadir" | "tidak-hadir" | null; reason: string | null; }) => {
        try {
            // ⚡ CRITICAL: Cek apakah ini team session atau presensi biasa
            const isTeamSession = payload.entityId.startsWith('team-');

            if (isTeamSession && payload.status === 'hadir') {
                // ⚡ FIX: Untuk team sessions (KIE/Doa Bersama), gunakan team_attendance_records
                const sessionId = payload.entityId.replace('team-', '');

                // Import team attendance service
                const { getAllTeamAttendanceSessions } = await import('@/services/teamAttendanceService');

                // Ambil semua sessions untuk cari session yang sesuai
                const sessions = await getAllTeamAttendanceSessions();
                const session = sessions.find(s => s.id === sessionId);

                if (!session) {
                    throw new Error('Session tidak ditemukan');
                }

                // Import dan gunakan createTeamAttendanceRecord
                const { createTeamAttendanceRecord } = await import('@/services/teamAttendanceService');

                // Ambil data user
                const user = allUsersData[payload.userId]?.employee;
                if (!user) {
                    throw new Error('User tidak ditemukan');
                }

                await createTeamAttendanceRecord({
                    sessionId: session.id,
                    userId: payload.userId,
                    userName: user.name,
                    attendedAt: Date.now(),
                    sessionType: session.type,
                    sessionDate: session.date,
                    sessionStartTime: session.startTime,
                    sessionEndTime: session.endTime
                });

            } else {
                // ⚡ Untuk presensi biasa (sholat, dll), gunakan attendance_records
                const { submitAttendance, deleteAttendance, getEmployeeAttendance } = await import('@/services/attendanceService');

                if (!payload.status) {
                    // If status is null, delete the attendance record
                    await deleteAttendance(payload.userId, payload.entityId);
                } else {
                    // Otherwise, submit or update attendance (upsert)
                    await submitAttendance(
                        payload.userId,
                        payload.entityId,
                        payload.status,
                        payload.reason || null,
                        false // isLateEntry - set to false for admin updates
                    );
                }
            }

            // Reload attendance data for this user from Supabase
            const { getEmployeeAttendance } = await import('@/services/attendanceService');
            const records = await getEmployeeAttendance(payload.userId);
            const convertedAttendance: Attendance = {};

            Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                if (record && record.status) {
                    convertedAttendance[entityId] = {
                        status: record.status,
                        reason: record.reason || null,
                        timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                        submitted: true,
                        isLateEntry: record.is_late_entry || false
                    };
                }
            });

            // Update local state - update attendance
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[payload.userId]) {
                    // Update attendance field with fresh data from Supabase
                    newData[payload.userId].attendance = convertedAttendance;

                    // Also update history for the specific date
                    const userHistory = newData[payload.userId].history;
                    if (!userHistory[payload.date]) {
                        userHistory[payload.date] = {};
                    }
                    const dayAttendance = userHistory[payload.date];
                    if (payload.status) {
                        dayAttendance[payload.entityId] = {
                            status: payload.status,
                            reason: payload.reason,
                            timestamp: Date.now()
                        };
                    } else {
                        delete dayAttendance[payload.entityId];
                    }
                }
                return newData;
            });

            return true;
        } catch (error) {
            addToast('Gagal mengupdate kehadiran: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            return false;
        }
    };

    const handleUpdateProfile = async (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>> | { functionalRoles: FunctionalRole[] }) => {
        try {

            // Get old user data before updating
            const oldUserData = allUsersData[userId];
            const oldFunctionalRoles = oldUserData?.employee.functionalRoles || [];
            const userMap = new Map(Object.values(allUsersData).map(u => [u.employee.id, u.employee.name]));

            // Update in Supabase
            await updateEmployeeSupabase(userId, updates);

            // Update local state
            setAllUsersData((prev) => {
                const newData = { ...prev };
                if (newData[userId]) {
                    newData[userId].employee = {
                        ...newData[userId].employee,
                        ...updates
                    };
                }
                return newData;
            });

            // 🔥 FIX: Create notification if functional roles changed
            if ('functionalRoles' in updates && updates.functionalRoles) {
                const newRoles = updates.functionalRoles;
                const addedRoles = newRoles.filter(role => !oldFunctionalRoles.includes(role));
                const removedRoles = oldFunctionalRoles.filter(role => !newRoles.includes(role));

                if (addedRoles.length > 0 || removedRoles.length > 0) {
                    const messages: string[] = [];
                    if (addedRoles.length > 0) {
                        messages.push(`Peran baru ditambahkan: ${addedRoles.join(', ')}`);
                    }
                    if (removedRoles.length > 0) {
                        messages.push(`Peran dicabut: ${removedRoles.join(', ')}`);
                    }

                    createNotification({
                        userId: userId,
                        type: 'account_role_changed',
                        title: 'Peran Fungsional Anda Telah Diperbarui',
                        message: messages.join('. ') + '. Anda sekarang memiliki akses ke fitur Analytics.',
                        linkTo: {
                            view: 'analytics',
                        },
                        dismissOnClick: false,
                    });
                }
            }

            // 🔥 FIX: Create notification for relation changes (mentor, supervisor, kaUnit, dirut)
            // Support both camelCase (mentorId) and snake_case (mentor_id)
            const relationFields: Array<{ camel: keyof Employee, snake: string }> = [
                { camel: 'mentorId', snake: 'mentor_id' },
                { camel: 'supervisorId', snake: 'supervisor_id' },
                { camel: 'kaUnitId', snake: 'ka_unit_id' }
            ];
            const relationLabels: Record<string, string> = {
                mentorId: 'Mentor',
                supervisorId: 'Supervisor',
                kaUnitId: 'Kepala Unit'
            };

            for (const { camel, snake } of relationFields) {
                // Check both camelCase and snake_case
                const newValue = (updates as any)[camel] ?? (updates as any)[snake];
                const oldValue = (oldUserData?.employee as any)[camel];


                // 🔥 PERBAIKAN: Buat notifikasi jika field ada di updates (BAHKAUN nilai sama atau beda)
                if (newValue !== undefined) {

                    // Determine assignment type
                    let assignmentType: 'assignment' | 'change' | 'removal' = 'assignment';
                    if (oldValue && !newValue) {
                        assignmentType = 'removal';
                    } else if (oldValue && newValue) {
                        assignmentType = 'change';
                    }

                    const newRelationName = newValue ? userMap.get(newValue) || newValue : null;
                    const oldRelationName = oldValue ? userMap.get(oldValue) || oldValue : null;

                    const notificationData = {
                        userId: userId,
                        type: 'account_role_changed' as const,
                        title: assignmentType === 'removal'
                            ? `Pemberhentian ${relationLabels[camel]}`
                            : assignmentType === 'assignment'
                                ? `Penugasan ${relationLabels[camel]} Baru`
                                : `Perubahan ${relationLabels[camel]}`,
                        message: assignmentType === 'removal'
                            ? `Penugasan Anda di bawah ${relationLabels[camel]} (${oldRelationName}) telah berakhir.`
                            : assignmentType === 'assignment'
                                ? `Anda telah ditugaskan ${relationLabels[camel]} baru: ${newRelationName}`
                                : `${relationLabels[camel]} Anda telah diubah dari ${oldRelationName} menjadi ${newRelationName}`,
                        linkTo: {
                            view: 'assignment_letter' as const,
                            params: {
                                roleName: relationLabels[camel] as 'Mentor' | 'Supervisor' | 'Kepala Unit',
                                assignmentType: assignmentType,
                                assigneeId: newValue || oldValue,
                                previousAssigneeId: oldValue,
                                previousAssigneeName: oldRelationName || undefined,
                            }
                        }
                    };

                    await createNotification(notificationData);
                }
            }

            return true;
        } catch (error) {
            // Don't throw error here, just return false so the calling component can handle it
            return false;
        }
    };

    const handleAddHospital = async (data: Omit<Hospital, 'id' | 'isActive'> & { logoFile?: File }) => {
        try {
            // Upload logo to Supabase Storage if file provided
            let logoUrl = data.logo;
            if (data.logoFile) {
                const { uploadHospitalLogo } = await import('@/services/hospitalService');
                // Generate temporary ID for upload (brand as ID)
                const tempId = data.brand.toLowerCase().replace(/\s+/g, '-');
                logoUrl = await uploadHospitalLogo(data.logoFile, tempId);
            }

            // Add isActive field before creating
            const hospitalData = { ...data, logo: logoUrl, isActive: true };
            // Create in Supabase
            await createHospitalSupabase(hospitalData);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);

            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    };

    const handleUpdateHospital = async (id: string, data: Partial<Omit<Hospital, 'id'>> & { logoFile?: File }) => {
        try {
            // Upload new logo to Supabase Storage if file provided
            let finalData = { ...data };
            if (data.logoFile) {
                const { uploadHospitalLogo } = await import('@/services/hospitalService');
                const logoUrl = await uploadHospitalLogo(data.logoFile, id);
                finalData = { ...finalData, logo: logoUrl };
            }

            // Update in Supabase
            await updateHospitalSupabase(id, finalData);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);

            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    };

    const handleDeleteHospital = async (id: string) => {
        try {
            // Delete from Supabase
            await deleteHospitalSupabase(id);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);

            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    };

    const handleToggleHospitalStatus = async (id: string) => {
        try {
            // Toggle in Supabase
            await toggleHospitalStatusSupabase(id);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);
        } catch (err: unknown) {
            addToast('Gagal mengupdate status RS: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleAddActivity = async (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
        const creator = {
            id: loggedInEmployee?.id || '',
            name: loggedInEmployee?.name || 'System'
        };

        try {
            // ⚡ UPDATE: addActivity sekarang sudah handle insert ke Supabase
            const newActivity: Activity = {
                ...activityData,
                id: '', // ID akan di-generate oleh Supabase (UUID)
                createdBy: creator.id,
                createdByName: creator.name
            };

            // addActivity akan insert ke Supabase dan update local store
            await addActivity(newActivity);

            addToast('Kegiatan berhasil dibuat!', 'success');
        } catch (error) {
            // Error handling
            console.error('Failed to create activity:', error);
            addToast('Gagal membuat kegiatan: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
        }
    };

    const handleAddSunnahIbadah = async (ibadahData: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>) => {
        const creator = {
            id: loggedInEmployee?.id || '',
            name: loggedInEmployee?.name || 'System'
        };

        try {
            // 🔥 Sync to Supabase
            const { createSunnahIbadah } = await import('@/services/sunnahIbadahService');
            const createdIbadah = await createSunnahIbadah(ibadahData, creator);

            // Add to local store
            addSunnahIbadah(ibadahData, creator);

        } catch (error) {
            // Still add to local store as fallback
            addSunnahIbadah(ibadahData, creator);
            addToast('Gagal menyimpan ke database. Data hanya tersimpan lokal.', 'error');
        }
    };

    const handleCreateAnnouncement = (data: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>) => {
        const newAnnouncement: Announcement = {
            ...data,
            id: Date.now().toString(),
            timestamp: Date.now(),
            authorId: loggedInEmployee?.id || '',
            authorName: loggedInEmployee?.name || 'System'
        };
        addAnnouncement(newAnnouncement);
    };

    const markAnnouncementAsRead = () => {
        if (loggedInEmployee) {
            // Update employee's last announcement read timestamp
            const updatedEmployee = {
                ...loggedInEmployee,
                lastAnnouncementReadTimestamp: Date.now()
            };

            // Update both local state and Supabase
            setAllUsersData(prev => ({
                ...prev,
                [loggedInEmployee.id]: {
                    ...prev[loggedInEmployee.id],
                    employee: updatedEmployee
                }
            }));
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
                    <p className="text-white mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    if (!loggedInEmployee) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white text-xl">Silakan login terlebih dahulu</p>
                </div>
            </div>
        );
    }

    // 🔥 NEW: Global employee data loading (triggered by AdminDashboard)
    const loadEmployeesOnDemand = async () => {
        if (employeesLoaded) return;

        try {
            const { loadAllEmployees } = useAppDataStore.getState();
            await loadAllEmployees();
            setEmployeesLoaded(true);
        } catch (error) {
            addToast('Gagal memuat seluruh data karyawan. Silakan muat ulang halaman.', 'error');
        }
    };

    return (
        <>
            <AdminDashboard
                allUsersData={allUsersData}
                loggedInEmployee={loggedInEmployee}
                onToggleStatus={handleToggleStatus}
                onSetRole={handleSetRole}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onBulkUpdateUsers={handleBulkUpdateUsers}
                activities={activities}
                onAddActivity={handleAddActivity}
                onUpdateActivity={updateActivity}
                onDeleteActivity={deleteActivity}
                onAdminUpdateAttendance={handleAdminUpdateAttendance}
                onUpdateProfile={handleUpdateProfile}
                sunnahIbadahList={sunnahIbadahList}
                onAddSunnahIbadah={handleAddSunnahIbadah}
                onUpdateSunnahIbadah={updateSunnahIbadah}
                onDeleteSunnahIbadah={deleteSunnahIbadah}
                dailyActivitiesConfig={dailyActivitiesConfig}
                onUpdateDailyActivitiesConfig={updateDailyActivitiesConfig}
                jobStructure={jobStructure}
                onUpdateJobStructure={updateJobStructure}
                auditLog={auditLog}
                onLogAudit={logAudit}
                announcements={announcements}
                onCreateAnnouncement={handleCreateAnnouncement}
                onDeleteAnnouncement={deleteAnnouncement}
                onMarkAsRead={markAnnouncementAsRead}
                hospitals={hospitals}
                onAddHospital={handleAddHospital}
                onUpdateHospital={handleUpdateHospital}
                onDeleteHospital={handleDeleteHospital}
                onToggleHospitalStatus={handleToggleHospitalStatus}
                mutabaahLockingMode={mutabaahLockingMode}
                onUpdateMutabaahLockingMode={handleUpdateMutabaahLockingMode}
                // ✅ NEW: Pagination props
                pagination={{
                    currentPage: page,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    onNext: handleNextPage,
                    onPrev: handlePrevPage,
                    onSearch: handleSearch,
                    onRoleFilter: handleRoleFilter,
                    onIsActiveFilter: handleIsActiveFilter,
                    onRefresh: handleRefresh,
                    searchTerm: searchTerm,
                    roleFilter: roleFilter,
                    isActiveFilter: isActiveFilter
                }}
                // 🔥 NEW: On-demand employee loading
                onLoadEmployees={loadEmployeesOnDemand}
                isLoadingEmployees={isLoadingEmployees}
            />
            <ConfirmationModal
                isOpen={mutabaahConfirmModal.isOpen}
                onClose={handleCloseMutabaahModal}
                onConfirm={handleConfirmMutabaahChange}
                title="Ubah Mode Penguncian Mutaba'ah?"
                message={
                    <div className="space-y-2">
                        <p>Mode: <span className="font-bold text-yellow-300">
                            {mutabaahConfirmModal.mode === 'weekly'
                                ? '📌 Perpekan'
                                : '📌 Perbulanan'}
                        </span></p>
                        <p className="text-red-300 text-sm">
                            ⚠️ Berlaku untuk SEMUA user
                        </p>
                    </div>
                }
                confirmText="Ya, Ubah"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </>
    );
}
