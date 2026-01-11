'use client';

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useUIStore, useActivityStore, useSunnahIbadahStore, useDailyActivitiesStore, useJobStructureStore, useAuditLogStore, useAnnouncementStore, useHospitalStore, useMutabaahStore } from '@/store/store';

// 🔥 FIX: Dynamic import untuk AdminDashboard - 200KB akan di-load LAZY!
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Admin Dashboard...</p>
            </div>
        </div>
    ),
    ssr: false // Disable SSR untuk component ini
});
import { Activity, SunnahIbadah, Announcement, type RawEmployee, type Hospital, type Employee, type Attendance, type AttendanceStatus, type FunctionalRole, type MutabaahLockingMode } from '@/types';
import { getAllEmployees, updateEmployee as updateEmployeeSupabase, deleteEmployee as deleteEmployeeSupabase, createEmployee as createEmployeeSupabase } from '@/services/employeeService';
import { getAllHospitals, createHospital as createHospitalSupabase, updateHospital as updateHospitalSupabase, deleteHospital as deleteHospitalSupabase, toggleHospitalStatus as toggleHospitalStatusSupabase } from '@/services/hospitalService';
// import { supabase } from '@/lib/supabase'; // Unused import

export default function AdminPage() {
    const { allUsersData, loggedInEmployee, setAllUsersData } = useAppDataStore();
    const { addToast } = useUIStore();
    const { activities, addActivity, updateActivity, deleteActivity } = useActivityStore();
    const { sunnahIbadahList, addSunnahIbadah, updateSunnahIbadah, deleteSunnahIbadah } = useSunnahIbadahStore();
    const { dailyActivitiesConfig, updateDailyActivitiesConfig } = useDailyActivitiesStore();
    const { jobStructure, updateJobStructure } = useJobStructureStore();
    const { auditLog, logAudit } = useAuditLogStore();
    const { announcements, addAnnouncement, deleteAnnouncement } = useAnnouncementStore();
    const { mutabaahLockingMode, setMutabaahLockingMode } = useMutabaahStore();
    // const { hospitals: localHospitals, addHospital, updateHospital, deleteHospital, toggleHospitalStatus } = useHospitalStore(); // Unused - using hospitals state instead

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);

    // Handler untuk update mutabaah locking mode dengan konfirmasi
    const handleUpdateMutabaahLockingMode = async (mode: MutabaahLockingMode) => {
        // Cek apakah user adalah super-admin
        if (loggedInEmployee?.role !== 'super-admin') {
            alert('❌ Hanya Super Admin yang dapat mengubah pengaturan global ini!');
            return;
        }

        // Konfirmasi perubahan
        const modeText = mode === 'weekly' ? 'Perpekan (Dikunci per pekan)' : 'Perbulanan (Bebas mengisi selama bulan berjalan)';
        const confirmed = confirm(
            `⚠️ KONFIRMASI PERUBAHAN PENGATURAN GLOBAL\n\n` +
            `Anda akan mengubah mode penguncian Lembar Mutaba'ah menjadi:\n\n` +
            `📌 ${modeText}\n\n` +
            `⚠️ Perubahan ini akan BERLAKU KE SELURUH USER di sistem!\n` +
            `Semua user akan terpengaruh oleh pengaturan baru ini.\n\n` +
            `Lanjutkan?`
        );

        if (!confirmed) {
            return; // User membatalkan
        }

        // Simpan ke Supabase (dengan isSuperAdmin=true)
        await setMutabaahLockingMode(mode, true);
        alert('✅ Pengaturan berhasil disimpan ke Supabase dan berlaku untuk seluruh user!');
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
                    console.log(`✅ Loaded ${sunnahIbadahFromDb.length} sunnah ibadah from Supabase`);

                    // 🔥 REPLACE store data with data from Supabase (not merge!)
                    const { setSunnahIbadahList } = useSunnahIbadahStore.getState();
                    setSunnahIbadahList(sunnahIbadahFromDb);
                    console.log('✅ Replaced sunnah ibadah list with data from Supabase');
                } catch (error) {
                    console.error('⚠️ Error loading sunnah ibadah from Supabase:', error);
                }

                // Load employees
                const employees = await getAllEmployees();
                console.log(`✅ Loaded ${employees.length} employees`);

                // Load attendance records from Supabase for all employees
                const { getEmployeeAttendance, getAllAttendanceRecords } = await import('@/services/attendanceService');

                // 🔥 FIX: Load ALL attendance in ONE call instead of per employee
                let allAttendanceData: Record<string, Attendance> = {};
                try {
                    const allRecords = await getAllAttendanceRecords();
                    console.log(`✅ Loaded ${Object.keys(allRecords).length} total attendance records in ONE call`);

                    // Convert to per-employee format
                    Object.entries(allRecords).forEach(([employeeId, records]: [string, any]) => {
                        allAttendanceData[employeeId] = {};
                        Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                            if (record && record.status) {
                                allAttendanceData[employeeId][entityId] = {
                                    status: record.status,
                                    reason: record.reason || null,
                                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                    submitted: true,
                                    isLateEntry: record.is_late_entry || false
                                };
                            }
                        });
                    });
                } catch (error) {
                    console.error('⚠️ Error loading bulk attendance:', error);
                }

                // Convert employees to allUsersData format
                const newData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }> = {};

                for (const emp of employees) {
                    newData[emp.id] = {
                        employee: emp,
                        attendance: allAttendanceData[emp.id] || {}, // Use pre-loaded data
                        history: {}
                    };
                }

                setAllUsersData(() => newData);
                console.log('✅ All employees data processed');

                // Load hospitals
                const hospitalsData = await getAllHospitals();
                setHospitals(hospitalsData);
                console.log(`✅ Loaded ${hospitalsData.length} hospitals`);

                console.timeEnd('⚡ Load Admin Data');
            } catch (err: unknown) {
                console.error('Error loading employees:', err);
                setError(err instanceof Error ? err.message : 'Failed to load employees from database');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [setAllUsersData]);

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
            console.error('Error toggling status:', err);
            alert('Gagal mengupdate status: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleSetRole = async (userId: string, newRole: 'super-admin' | 'admin' | 'user') => {
        try {
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
                        reason: `Changed role to ${newRole}`
                    });
                }
                return newData;
            });
        } catch (err: unknown) {
            console.error('Error setting role:', err);
            alert('Gagal mengupdate role: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleAddUser = async (id: string, newEmployeeData: RawEmployee) => {
        try {
            // Convert RawEmployee to Employee format
            const employee: Employee = {
                ...newEmployeeData,
                id,
                email: `${id}@rsijsp.co.id`,
                password: `hashed_${id}`,
                role: 'user',
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
                mustChangePassword: true
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
                    console.error(`⚠️ Error loading attendance for ${emp.id}:`, error);
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
            console.error('Error adding user:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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
            console.error('Error updating user:', err);
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
            console.error('Error deleting user:', err);
            alert('Gagal menghapus user: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
                            console.error(`⚠️ Error loading attendance for ${emp.id}:`, error);
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
            console.error('Error updating attendance:', error);
            alert('Gagal mengupdate kehadiran: ' + (error instanceof Error ? error.message : 'Unknown error'));
            return false;
        }
    };

    const handleUpdateProfile = async (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>> | { functionalRoles: FunctionalRole[] }) => {
        try {
            console.log("🔄 Updating profile for user");

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

            console.log("✅ Profile updated successfully");
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
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
                console.log('✅ Logo uploaded:', logoUrl);
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
            console.error('Error adding hospital:', err);
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
                console.log('✅ Logo uploaded:', logoUrl);
                finalData = { ...finalData, logo: logoUrl };
            }

            // Update in Supabase
            await updateHospitalSupabase(id, finalData);

            // Reload hospitals
            const hospitalsData = await getAllHospitals();
            setHospitals(hospitalsData);

            return { success: true };
        } catch (err: unknown) {
            console.error('Error updating hospital:', err);
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
            console.error('Error deleting hospital:', err);
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
            console.error('Error toggling hospital status:', err);
            alert('Gagal mengupdate status RS: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleAddActivity = (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => {
        const newActivity: Activity = {
            ...activityData,
            id: Date.now().toString(),
            createdBy: loggedInEmployee?.id || '',
            createdByName: loggedInEmployee?.name || 'System'
        };
        addActivity(newActivity);
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

            console.log('✅ Sunnah ibadah created in Supabase:', createdIbadah);
        } catch (error) {
            console.error('❌ Failed to create sunnah ibadah in Supabase:', error);
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
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Memuat data dari database...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
                    <p className="text-red-400 text-xl mb-4">Error memuat data</p>
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
        />
    );
}
