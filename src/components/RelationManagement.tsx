import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Employee, type Hospital } from '../types';
import EmployeeSearchableInput from './EmployeeSearchableInput';
import { SearchIcon } from './Icons';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '@/store/store';

interface RelationManagementProps {
    allUsers: Employee[];
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>>, silent?: boolean) => Promise<boolean>;
    hospitals?: Hospital[];
    loggedInEmployee: Employee;
}

// A simple reusable toggle switch component
const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => Promise<boolean>;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => {
    const { addToast } = useUIStore();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleClick = async () => {
        if (disabled || isUpdating) return;

        setIsUpdating(true);
        try {
            const result = await onChange(!checked);
            if (!result) {
                throw new Error('Update failed');
            }
        } catch (error) {
            addToast('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={handleClick}
            disabled={disabled || isUpdating}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 ${disabled || isUpdating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            <span className={`${checked ? 'bg-teal-500' : 'bg-gray-600'} absolute w-full h-full rounded-full`} />
            <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`} />
        </button>
    );
};

import SimplePagination from './SimplePagination';

const RelationManagement: React.FC<RelationManagementProps> = ({ allUsers = [], onUpdateProfile, hospitals = [], loggedInEmployee }) => {
    const { addToast } = useUIStore();
    const { createNotification } = useNotificationStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [hospitalFilter, setHospitalFilter] = useState('all');
    const [editAssignmentModal, setEditAssignmentModal] = useState<Employee | null>(null);

    // 🔥 FIX: Use ref to prevent infinite loop
    const lastDirutIdRef = useRef<string | undefined>(undefined);

    // Defensive check: ensure allUsers is an array
    const hospitalFilteredUsers = useMemo(() => {
        const users = Array.isArray(allUsers) ? allUsers : [];

        // Regular admin should only see users from their assigned hospitals
        const isSuper = loggedInEmployee.role === 'super-admin';
        const managedIds = loggedInEmployee.managedHospitalIds || [];

        const scopedUsers = isSuper ? users : users.filter(u => u.hospitalId && managedIds.includes(u.hospitalId));

        if (hospitalFilter === 'all') {
            return scopedUsers;
        }

        return scopedUsers.filter(u => u.hospitalId === hospitalFilter);
    }, [allUsers, hospitalFilter, loggedInEmployee]);

    const safeAllUsers = hospitalFilteredUsers;

    // Optimized map for ultra-fast name lookup by NIP
    const userMap = useMemo(() => {
        const map = new Map<string, string>();
        safeAllUsers.forEach(u => {
            if (u.id) map.set(String(u.id).trim(), u.name);
        });
        return map;
    }, [safeAllUsers]);

    const potentialMentors = useMemo(() => safeAllUsers.filter(u => u.canBeMentor === true), [safeAllUsers]);
    const potentialSupervisors = useMemo(() => safeAllUsers.filter(u => u.canBeSupervisor === true), [safeAllUsers]);
    const potentialManagers = useMemo(() => safeAllUsers.filter(u => u.canBeManager === true), [safeAllUsers]);
    const potentialKaUnits = useMemo(() => safeAllUsers.filter(u => u.canBeKaUnit === true), [safeAllUsers]);
    const designatedDirut = useMemo(() => safeAllUsers.find(u => u.canBeDirut === true), [safeAllUsers]);

    // Effect to auto-assign DIRUT to all employees when the designated DIRUT changes
    useEffect(() => {
        const currentDirut = designatedDirut;
        if (currentDirut && currentDirut.id !== lastDirutIdRef.current) {
            lastDirutIdRef.current = currentDirut.id;
            // No automated batch update here to avoid performance issues in frontend
            // Batch process should be handled by backend or manual action
        }
    }, [designatedDirut]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return safeAllUsers;
        const lowerTerm = searchTerm.toLowerCase();
        return safeAllUsers.filter(u =>
            u.name.toLowerCase().includes(lowerTerm) ||
            String(u.id).toLowerCase().includes(lowerTerm)
        );
    }, [safeAllUsers, searchTerm]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredUsers]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Pagination logic
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleRelationChange = async (
        userToUpdate: Employee,
        field: 'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId', // dirutId is now automated
        newId: string | undefined
    ) => {
        // Defensive check
        if (!userToUpdate || !userToUpdate.id) {
            return;
        }

        // Continue with new assignment or keeping existing
        if (newId !== undefined) {
            // 🔥 PERBAIKAN: Selalu buat notifikasi ketika ada relation assignment
            // (tidak peduli nilai baru sama atau beda dengan yang lama)
            try {
                const fieldNameMap = {
                    mentorId: 'Mentor',
                    supervisorId: 'Supervisor',
                    managerId: 'Manajer',
                    kaUnitId: 'Kepala Unit',
                };

                const oldRelationId = userToUpdate[field];
                const oldRelationName = oldRelationId ? userMap.get(oldRelationId) : null;
                const newRelationName = userMap.get(newId!) || 'N/A';

                const result = await onUpdateProfile(userToUpdate.id, { [field]: newId });
                if (result) {
                    // Determine assignment type
                    let assignmentType: 'assignment' | 'change' = 'assignment';
                    if (oldRelationId) {
                        assignmentType = 'change';
                    }

                    // Create notification - SELALU buat untuk setiap assignment/re-assignment

                    const notificationData = {
                        userId: userToUpdate.id,
                        type: 'account_role_changed' as const,
                        title: assignmentType === 'assignment'
                            ? `Penugasan ${fieldNameMap[field]}`
                            : `Perubahan ${fieldNameMap[field]}`,
                        message: assignmentType === 'assignment'
                            ? `Anda telah ditugaskan ${fieldNameMap[field]} baru: ${newRelationName}`
                            : `${fieldNameMap[field]} Anda telah diubah dari ${oldRelationName} menjadi ${newRelationName}`,
                        linkTo: {
                            view: 'assignment_letter' as const,
                            params: {
                                roleName: fieldNameMap[field] as any,
                                assignmentType: assignmentType,
                                assigneeName: newRelationName, // 🔥 FIX: Kirim nama, bukan ID
                                previousAssigneeName: oldRelationName || undefined, // 🔥 FIX: Kirim nama, bukan ID
                            }
                        }
                    };
                    await createNotification(notificationData);
                } else {
                    throw new Error('Update failed');
                }
            } catch (error) {
                addToast('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            }
        } else {
            // Handle removal (newId === undefined)
            if (userToUpdate[field]) {
                try {
                    const fieldNameMap = {
                        mentorId: 'Mentor',
                        supervisorId: 'Supervisor',
                        managerId: 'Manajer',
                        kaUnitId: 'Kepala Unit',
                    };

                    const oldRelationId = userToUpdate[field];
                    const oldRelationName = userMap.get(oldRelationId) || 'N/A';

                    const result = await onUpdateProfile(userToUpdate.id, { [field]: null });
                    if (result) {
                        // Create notification for removal
                        const notificationData = {
                            userId: userToUpdate.id,
                            type: 'account_role_changed' as const,
                            title: `Pemberhentian ${fieldNameMap[field]}`,
                            message: `Penugasan Anda di bawah ${fieldNameMap[field]} (${oldRelationName}) telah berakhir.`,
                            linkTo: {
                                view: 'assignment_letter' as const,
                                params: {
                                    roleName: fieldNameMap[field] as any,
                                    assignmentType: 'removal' as const,
                                    previousAssigneeName: oldRelationName,
                                }
                            }
                        };
                        await createNotification(notificationData);
                    } else {
                        throw new Error('Update failed');
                    }
                } catch (error) {
                    addToast('Gagal menghapus penugasan: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
                }
            }
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Kelola Relasi & Jabatan Fungsional</h3>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 max-w-2xl">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Cari nama atau NIP karyawan..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none text-sm"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {hospitals.length > 0 && (
                    <div className="w-full sm:w-64">
                        <select
                            value={hospitalFilter}
                            onChange={e => setHospitalFilter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none text-sm"
                        >
                            {(loggedInEmployee.role === 'super-admin') && (
                                <option value="all" className="bg-gray-800">Seluruh Unit RSIJ Group</option>
                            )}
                            {hospitals
                                .filter(h => loggedInEmployee.role === 'super-admin' || (loggedInEmployee.managedHospitalIds && loggedInEmployee.managedHospitalIds.includes(h.id)))
                                .map((h: Hospital) => (
                                    <option key={h.id} value={h.id} className="bg-gray-800">{h.brand}</option>
                                ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Mobile scroll indicator */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 animate-pulse">
                <span>← Geser untuk melihat kolom →</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/20 -mx-2 sm:mx-0">
                <table className="min-w-[1300px] w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200 align-middle">
                        <tr>
                            <th rowSpan={2} className="px-3 py-2 sm:px-4 align-middle border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[200px]">Nama Karyawan</th>
                            <th rowSpan={2} className="px-3 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[100px]">RS ID</th>
                            <th colSpan={5} className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap">Kapabilitas Peran</th>
                            <th colSpan={5} className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap">Penugasan Atasan</th>
                            <th rowSpan={2} className="px-3 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Aksi</th>
                        </tr>
                        <tr>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Dirut</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Mentor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Supervisor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Ka. Unit</th>
                            <th className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[100px]">Manajer</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Dirut</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Mentor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Supervisor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Ka. Unit</th>
                            <th className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[160px]">Manajer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-3 py-3 sm:px-4 whitespace-nowrap border-r border-gray-700 min-w-[180px]">
                                    <p className="font-semibold text-sm truncate" title={user.name}>{user.name}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">{user.id}</p>
                                </td>
                                <td className="px-2 py-3 text-center border-r border-gray-700 min-w-[100px]">
                                    <span className="font-mono text-xs uppercase text-blue-300">
                                        {user.hospitalId || '-'}
                                    </span>
                                </td>
                                <td className="px-2 py-3 text-center min-w-[80px]">
                                    <div className="flex justify-center">
                                        <ToggleSwitch
                                            checked={!!user.canBeDirut}
                                            onChange={async (checked) => {
                                                const result = await onUpdateProfile(user.id, { canBeDirut: checked });
                                                if (!result) {
                                                    throw new Error('Update failed');
                                                }
                                                return result;
                                            }}
                                            disabled={designatedDirut && designatedDirut.id !== user.id}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center min-w-[80px]">
                                    <div className="flex justify-center">
                                        <ToggleSwitch
                                            checked={!!user.canBeMentor}
                                            onChange={async (checked) => {
                                                const result = await onUpdateProfile(user.id, { canBeMentor: checked });
                                                if (!result) {
                                                    throw new Error('Update failed');
                                                }

                                                // 🔥 Create notification for role capability change
                                                if (checked && !user.canBeMentor) {
                                                    // Designation - user baru bisa jadi Mentor
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Penugasan Sebagai Mentor',
                                                        message: 'Selamat! Anda telah ditugaskan sebagai Mentor. Lihat surat penugasan Anda.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Mentor',
                                                                assignmentType: 'designation',
                                                            }
                                                        }
                                                    });
                                                } else if (!checked && user.canBeMentor) {
                                                    // Revocation - user tidak bisa lagi jadi Mentor
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Pencabutan Penugasan Mentor',
                                                        message: 'Penugasan Anda sebagai Mentor telah berakhir. Lihat surat pemberitahuan.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Mentor',
                                                                assignmentType: 'revocation',
                                                            }
                                                        }
                                                    });
                                                }

                                                return result;
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center min-w-[80px]">
                                    <div className="flex justify-center">
                                        <ToggleSwitch
                                            checked={!!user.canBeSupervisor}
                                            onChange={async (checked) => {
                                                const result = await onUpdateProfile(user.id, { canBeSupervisor: checked });
                                                if (!result) {
                                                    throw new Error('Update failed');
                                                }

                                                // 🔥 Create notification for role capability change
                                                if (checked && !user.canBeSupervisor) {
                                                    // Designation - user baru bisa jadi Supervisor
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Penugasan Sebagai Supervisor',
                                                        message: 'Selamat! Anda telah ditugaskan sebagai Supervisor. Lihat surat penugasan Anda.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Supervisor',
                                                                assignmentType: 'designation',
                                                            }
                                                        }
                                                    });
                                                } else if (!checked && user.canBeSupervisor) {
                                                    // Revocation - user tidak bisa lagi jadi Supervisor
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Pencabutan Penugasan Supervisor',
                                                        message: 'Penugasan Anda sebagai Supervisor telah berakhir. Lihat surat pemberitahuan.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Supervisor',
                                                                assignmentType: 'revocation',
                                                            }
                                                        }
                                                    });
                                                }

                                                return result;
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center min-w-[80px]">
                                    <div className="flex justify-center">
                                        <ToggleSwitch
                                            checked={!!user.canBeKaUnit}
                                            onChange={async (checked) => {
                                                const result = await onUpdateProfile(user.id, { canBeKaUnit: checked });
                                                if (!result) {
                                                    throw new Error('Update failed');
                                                }

                                                // 🔥 Create notification for role capability change
                                                if (checked && !user.canBeKaUnit) {
                                                    // Designation - user baru bisa jadi Ka.Unit
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Penugasan Sebagai Kepala Unit',
                                                        message: 'Selamat! Anda telah ditugaskan sebagai Kepala Unit. Lihat surat penugasan Anda.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Kepala Unit',
                                                                assignmentType: 'designation',
                                                            }
                                                        }
                                                    });
                                                } else if (!checked && user.canBeKaUnit) {
                                                    // Revocation - user tidak bisa lagi jadi Ka.Unit
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Pencabutan Penugasan Kepala Unit',
                                                        message: 'Penugasan Anda sebagai Kepala Unit telah berakhir. Lihat surat pemberitahuan.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Kepala Unit',
                                                                assignmentType: 'revocation',
                                                            }
                                                        }
                                                    });
                                                }

                                                return result;
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center border-r border-gray-700 min-w-[80px]">
                                    <div className="flex justify-center">
                                        <ToggleSwitch
                                            checked={!!user.canBeManager}
                                            onChange={async (checked) => {
                                                const result = await onUpdateProfile(user.id, { canBeManager: checked });
                                                if (!result) {
                                                    throw new Error('Update failed');
                                                }

                                                // 🔥 Create notification for role capability change
                                                if (checked && !user.canBeManager) {
                                                    // Designation - user baru bisa jadi Manajer
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Penugasan Sebagai Manajer',
                                                        message: 'Selamat! Anda telah ditugaskan sebagai Manajer. Lihat surat penugasan Anda.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Manajer' as any,
                                                                assignmentType: 'designation',
                                                            }
                                                        }
                                                    });
                                                } else if (!checked && user.canBeManager) {
                                                    // Revocation - user tidak bisa lagi jadi Manajer
                                                    await createNotification({
                                                        userId: user.id,
                                                        type: 'account_role_changed',
                                                        title: 'Pencabutan Penugasan Manajer',
                                                        message: 'Penugasan Anda sebagai Manajer telah berakhir. Lihat surat pemberitahuan.',
                                                        linkTo: {
                                                            view: 'assignment_letter',
                                                            params: {
                                                                roleName: 'Manajer' as any,
                                                                assignmentType: 'revocation',
                                                            }
                                                        }
                                                    });
                                                }

                                                return result;
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.dirutId ? (userMap.get(String(user.dirutId).trim()) || `NIP: ${user.dirutId}`) : 'Otomatis'}>
                                        {user.dirutId ? (userMap.get(String(user.dirutId).trim()) || <span className="text-gray-400 text-xs italic">{user.dirutId}</span>) : <span className="text-gray-400 italic">Otomatis</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.mentorId ? (userMap.get(String(user.mentorId).trim()) || `NIP: ${user.mentorId}`) : 'Belum ditugaskan'}>
                                        {user.mentorId ? (userMap.get(String(user.mentorId).trim()) || <span className="text-gray-400 text-xs italic">{user.mentorId}</span>) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.supervisorId ? (userMap.get(String(user.supervisorId).trim()) || `NIP: ${user.supervisorId}`) : 'Belum ditugaskan'}>
                                        {user.supervisorId ? (userMap.get(String(user.supervisorId).trim()) || <span className="text-gray-400 text-xs italic">{user.supervisorId}</span>) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.kaUnitId ? (userMap.get(String(user.kaUnitId).trim()) || `NIP: ${user.kaUnitId}`) : 'Belum ditugaskan'}>
                                        {user.kaUnitId ? (userMap.get(String(user.kaUnitId).trim()) || <span className="text-gray-400 text-xs italic">{user.kaUnitId}</span>) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.managerId ? (userMap.get(String(user.managerId).trim()) || `NIP: ${user.managerId}`) : 'Belum ditugaskan'}>
                                        {user.managerId ? (userMap.get(String(user.managerId).trim()) || <span className="text-gray-400 text-xs italic">{user.managerId}</span>) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-center min-w-[100px]">
                                    <button
                                        onClick={() => setEditAssignmentModal(user)}
                                        className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                                        title="Edit Penugasan"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={11} className="text-center p-8 text-blue-200">
                                    Tidak ada karyawan yang cocok dengan pencarian Anda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={sortedUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Modal edit penugasan */}
            {editAssignmentModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20 animate-pop-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Edit Penugasan</h3>
                            <button
                                onClick={() => setEditAssignmentModal(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4 pb-4 border-b border-gray-700">
                            <p className="text-sm text-gray-400">Karyawan</p>
                            <p className="text-base font-semibold text-white">{editAssignmentModal.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{editAssignmentModal.id}</p>
                        </div>

                        <div className="space-y-4">
                            {/* Mentor */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Mentor</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialMentors.filter(m => m.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.mentorId ?? undefined}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'mentorId', id)}
                                    placeholder="Pilih Mentor"
                                />
                            </div>

                            {/* Supervisor */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Supervisor</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialSupervisors.filter(s => s.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.supervisorId ?? undefined}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'supervisorId', id)}
                                    placeholder="Pilih Supervisor"
                                />
                            </div>

                            {/* Ka. Unit */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Kepala Unit</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialKaUnits.filter(u => u.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.kaUnitId ?? undefined}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'kaUnitId', id)}
                                    placeholder="Pilih Ka. Unit"
                                />
                            </div>

                            {/* Manajer */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Manajer</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialManagers.filter(m => m.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.managerId ?? undefined}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'managerId', id)}
                                    placeholder="Pilih Manajer"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setEditAssignmentModal(null)}
                                className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelationManagement;