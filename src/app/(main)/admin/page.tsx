'use client';
// @ts-nocheck

// 🔥 OPTIMIZATION: Removed 'force-dynamic' to enable smooth client-side navigation
// Data is already fetched client-side via useEffect, so server-side rendering is not needed
// This provides SPA-like experience with no full page refreshes

import React, { useEffect, useState, Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { useSunnahIbadahStore } from '@/store/sunnahIbadahStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useJobStructureStore } from '@/store/jobStructureStore';
import { useAuditLogStore } from '@/store/auditLogStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useHospitalStore } from '@/store/hospitalStore';
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
import { Activity, SunnahIbadah, Announcement, type RawEmployee, type Hospital, type Employee, type Attendance, type AttendanceStatus, type FunctionalRole, type MutabaahLockingMode, type Role } from '@/types';
import { getAllEmployees, updateEmployee as updateEmployeeSupabase, deleteEmployee as deleteEmployeeSupabase, createEmployee as createEmployeeSupabase, convertToCamelCase } from '@/services/employeeService';
import { getPaginatedEmployees } from '@/services/employeeServicePaginated';
import { getAllHospitals, createHospital as createHospitalSupabase, updateHospital as updateHospitalSupabase, deleteHospital as deleteHospitalSupabase, toggleHospitalStatus as toggleHospitalStatusSupabase } from '@/services/hospitalService';
import { validateRoleChange, getAssignableRoles, getRoleDisplay } from '@/lib/rolePermissions';
// import { supabase } from '@/lib/supabase'; // Unused import

export default function AdminPage() {
    const { allUsersData, loggedInEmployee, setAllUsersData } = useAppDataStore();
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

    // ✅ NEW: Pagination state
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

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

    // Load employees and hospitals from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.time('⚡ Load Admin Data');

                // 🔥 Load sunnah ibadah from Supabase FIRST
                try {
                    const { getAllSunnahIbadah } = await import('@/services/sunnahIbadahService');
                    const sunnahIbadahFromDb = await getAllSunnahIbadah();
                    if (process.env.NODE_ENV === "development") console.log(`✅ Loaded ${sunnahIbadahFromDb.length} sunnah ibadah from Supabase`);

                    // 🔥 REPLACE store data with data from Supabase (not merge!)
                    const { setSunnahIbadahList } = useSunnahIbadahStore.getState();
                    setSunnahIbadahList(sunnahIbadahFromDb);
                    if (process.env.NODE_ENV === "development") console.log('✅ Replaced sunnah ibadah list with data from Supabase');
                } catch (error) {
                    if (process.env.NODE_ENV === "development") console.error('⚠️ Error loading sunnah ibadah from Supabase:', error);
                }

                // ✅ NEW: Load employees with PAGINATION (15 per page)
                if (process.env.NODE_ENV === "development") console.log(`🔍 Loading employees: page ${page}, search="${searchTerm}", role="${roleFilter}"`);

                let paginatedResult;
                try {
                    paginatedResult = await getPaginatedEmployees({
                        page,
                        limit: 15, // 15 employees per page
                        search: searchTerm,
                        role: roleFilter,
                        isActive: isActiveFilter
                    });
                    if (process.env.NODE_ENV === "development") console.log(`✅ Loaded ${paginatedResult.employees.length} of ${paginatedResult.pagination.total} employees`);
                } catch (apiError: any) {
                    console.error('❌ API Error details:', {
                        message: apiError.message,
                        stack: apiError.stack,
                        cause: apiError.cause
                    });
                    throw new Error(`API Error: ${apiError.message}`);
                }

                // Convert employees to allUsersData format
                const newData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }> = {};

                for (const emp of paginatedResult.employees) {
                    // Convert snake_case to camelCase using utility function
                    const camelCaseEmp = convertToCamelCase(emp);

                    newData[emp.id] = {
                        employee: camelCaseEmp,
                        attendance: {}, // Will be loaded separately below
                        history: {}
                    };
                }

                setAllUsersData(() => newData);

                // Update pagination state
                setTotalCount(paginatedResult.pagination.total);
                setTotalPages(paginatedResult.pagination.totalPages);
                if (process.env.NODE_ENV === "development") console.log(`✅ Page ${paginatedResult.pagination.page}/${paginatedResult.pagination.totalPages}`);

                // Load attendance records for current page employees
                const { getEmployeeAttendance, getAllAttendanceRecords } = await import('@/services/attendanceService');

                // 🔥 FIX: Load ALL attendance in ONE call instead of per employee
                try {
                    const allRecords = await getAllAttendanceRecords();
                    if (process.env.NODE_ENV === "development") console.log(`✅ Loaded ${Object.keys(allRecords).length} total attendance records in ONE call`);

                    // Update attendance for current page employees
                    setAllUsersData((prev) => {
                        const updated = { ...prev };

                        Object.entries(allRecords).forEach(([employeeId, records]: [string, any]) => {
                            // Only update if employee exists in current page
                            if (updated[employeeId]) {
                                updated[employeeId].attendance = {};
                                Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                                    if (record && record.status) {
                                        updated[employeeId].attendance[entityId] = {
                                            status: record.status,
                                            reason: record.reason || null,
                                            timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                            submitted: true,
                                            isLateEntry: record.is_late_entry || false
                                        };
                                    }
                                });
                            }
                        });

                        return updated;
                    });
                } catch (error) {
                    if (process.env.NODE_ENV === "development") console.error('⚠️ Error loading bulk attendance:', error);
                }

                // Load hospitals
                const hospitalsData = await getAllHospitals();
                setHospitals(hospitalsData);
                if (process.env.NODE_ENV === "development") console.log(`✅ Loaded ${hospitalsData.length} hospitals`);

                // 🔥 FIX: Load announcements
                try {
                    await loadAnnouncements();
                    if (process.env.NODE_ENV === "development") console.log('✅ Loaded announcements from Supabase');
                } catch (error) {
                    if (process.env.NODE_ENV === "development") console.error('⚠️ Error loading announcements from Supabase:', error);
                }

                console.timeEnd('⚡ Load Admin Data');
            } catch (err: unknown) {
                if (process.env.NODE_ENV === "development") console.error('Error loading employees:', err);
                setError(err instanceof Error ? err.message : 'Failed to load employees from database');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [page, searchTerm, roleFilter, isActiveFilter, setAllUsersData, loadAnnouncements]); // ✅ Added pagination dependencies

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
            if (process.env.NODE_ENV === "development") console.error('Error toggling status:', err);
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
            if (process.env.NODE_ENV === "development") console.error('Error setting role:', err);
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

            if (process.env.NODE_ENV === "development") console.log('📤 Creating employee with data:', {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                role: employee.role,
                gender: employee.gender,
                unit: employee.unit,
                bagian: employee.bagian,
                professionCategory: employee.professionCategory,
                profession: employee.profession,
                hospitalId: employee.hospitalId
            });

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
                    if (process.env.NODE_ENV === "development") console.error(`⚠️ Error loading attendance for ${emp.id}:`, error);
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
            if (process.env.NODE_ENV === "development") console.error('❌ Error adding user - Full error object:', err);
            if (process.env.NODE_ENV === "development") console.error('❌ Error type:', typeof err);
            if (process.env.NODE_ENV === "development") console.error('❌ Error keys:', err ? Object.keys(err) : 'N/A');

            // Try to extract more error details
            let errorMessage = 'Unknown error';
            if (err instanceof Error) {
                errorMessage = err.message;
                if (process.env.NODE_ENV === "development") console.error('❌ Error message:', err.message);
                if (process.env.NODE_ENV === "development") console.error('❌ Error stack:', err.stack);
            } else if (typeof err === 'object' && err !== null) {
                errorMessage = JSON.stringify(err);
                if (process.env.NODE_ENV === "development") console.error('❌ Stringified error:', errorMessage);
            } else {
                errorMessage = String(err);
                if (process.env.NODE_ENV === "development") console.error('❌ String error:', errorMessage);
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
            if (process.env.NODE_ENV === "development") console.error('Error updating user:', err);
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
            if (process.env.NODE_ENV === "development") console.error('Error deleting user:', err);
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
                            if (process.env.NODE_ENV === "development") console.error(`⚠️ Error loading attendance for ${emp.id}:`, error);
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
            // Import the attendance service functions
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

            // Reload attendance data for this user from Supabase
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
            if (process.env.NODE_ENV === "development") console.error('Error updating attendance:', error);
            addToast('Gagal mengupdate kehadiran: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            return false;
        }
    };

    const handleUpdateProfile = async (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>> | { functionalRoles: FunctionalRole[] }) => {
        try {
            if (process.env.NODE_ENV === "development") console.log("🔄 Updating profile for user");
            if (process.env.NODE_ENV === "development") console.log("📦 UPDATES OBJECT:", JSON.stringify(updates, null, 2));
            if (process.env.NODE_ENV === "development") console.log("📋 UPDATES KEYS:", Object.keys(updates));

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

            if (process.env.NODE_ENV === "development") console.log('🔍 Checking relation fields for notification...');
            for (const { camel, snake } of relationFields) {
                // Check both camelCase and snake_case
                const newValue = (updates as any)[camel] ?? (updates as any)[snake];
                const oldValue = (oldUserData?.employee as any)[camel];

                if (process.env.NODE_ENV === "development") console.log(`  📌 Field ${camel}/${snake}:`, {
                    newValue,
                    oldValue,
                    camelValue: (updates as any)[camel],
                    snakeValue: (updates as any)[snake],
                    hasNewValue: newValue !== undefined
                });

                // 🔥 PERBAIKAN: Buat notifikasi jika field ada di updates (BAHKAUN nilai sama atau beda)
                if (newValue !== undefined) {
                    if (process.env.NODE_ENV === "development") console.log('🔔 Creating assignment notification for user:', userId, 'from Admin Dashboard');
                    if (process.env.NODE_ENV === "development") console.log('📊 Field:', camel, 'Old:', oldValue, 'New:', newValue);

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

                    if (process.env.NODE_ENV === "development") console.log('📝 Notification data:', notificationData);
                    await createNotification(notificationData);
                    if (process.env.NODE_ENV === "development") console.log('✅ Assignment notification created successfully');
                }
            }

            if (process.env.NODE_ENV === "development") console.log("✅ Profile updated successfully");
            return true;
        } catch (error) {
            if (process.env.NODE_ENV === "development") console.error('Error updating profile:', error);
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
                if (process.env.NODE_ENV === "development") console.log('✅ Logo uploaded:', logoUrl);
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
            if (process.env.NODE_ENV === "development") console.error('Error adding hospital:', err);
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
                if (process.env.NODE_ENV === "development") console.log('✅ Logo uploaded:', logoUrl);
                finalData = { ...finalData, logo: logoUrl };
            }

            // Update in Supabase
            await updateHospitalSupabase(id, finalData);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);

            return { success: true };
        } catch (err: unknown) {
            if (process.env.NODE_ENV === "development") console.error('Error updating hospital:', err);
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
            if (process.env.NODE_ENV === "development") console.error('Error deleting hospital:', err);
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
            if (process.env.NODE_ENV === "development") console.error('Error toggling hospital status:', err);
            addToast('Gagal mengupdate status RS: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleAddActivity = async (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
        const creator = {
            id: loggedInEmployee?.id || '',
            name: loggedInEmployee?.name || 'System'
        };

        try {
            // 🔥 Sync to Supabase
            const { createActivity } = await import('@/services/scheduledActivityService');

            // Prepare activity with creator info
            const activityWithCreator = {
                ...activityData,
                createdBy: creator.id,
                createdAt: new Date().toISOString()
            };

            const createdActivity = await createActivity(activityWithCreator as any);

            // Add to local store (convert from service type to store type)
            addActivity(createdActivity as any);

            if (process.env.NODE_ENV === "development") console.log('✅ Activity created in Supabase:', createdActivity);
            addToast('Kegiatan berhasil dibuat!', 'success');
        } catch (error) {
            if (process.env.NODE_ENV === "development") console.error('❌ Failed to create activity in Supabase:', error);
            // Still add to local store as fallback
            const newActivity: Activity = {
                ...activityData,
                id: Date.now().toString(),
                createdBy: creator.id,
                createdByName: creator.name
            };
            addActivity(newActivity);
            addToast('Gagal menyimpan ke database. Data hanya tersimpan lokal.', 'error');
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

            if (process.env.NODE_ENV === "development") console.log('✅ Sunnah ibadah created in Supabase:', createdIbadah);
        } catch (error) {
            if (process.env.NODE_ENV === "development") console.error('❌ Failed to create sunnah ibadah in Supabase:', error);
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
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
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
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white text-xl">Silakan login terlebih dahulu</p>
                </div>
            </div>
        );
    }

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
