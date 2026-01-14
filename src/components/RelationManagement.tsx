import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Employee } from '../types';
import EmployeeSearchableInput from './EmployeeSearchableInput';
import { SearchIcon } from './Icons';
import { useNotificationStore } from '../store/notificationStore';

interface RelationManagementProps {
    allUsers: Employee[];
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>>) => Promise<boolean>;
}

// A simple reusable toggle switch component
const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => Promise<boolean>;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => {
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
            console.error('Error updating toggle:', error);
            alert('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'));
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


const RelationManagement: React.FC<RelationManagementProps> = ({ allUsers = [], onUpdateProfile }) => {
    const { createNotification } = useNotificationStore();
    const [searchTerm, setSearchTerm] = useState('');

    // 🔥 FIX: Use ref to prevent infinite loop
    const lastDirutIdRef = useRef<string | undefined>(undefined);

    // Defensive check: ensure allUsers is an array
    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];

    const userMap = useMemo(() => new Map(safeAllUsers.map(u => [u.id, u.name])), [safeAllUsers]);
    const potentialMentors = useMemo(() => safeAllUsers.filter(u => u.canBeMentor === true), [safeAllUsers]);
    const potentialSupervisors = useMemo(() => safeAllUsers.filter(u => u.canBeSupervisor === true), [safeAllUsers]);
    const potentialKaUnits = useMemo(() => safeAllUsers.filter(u => u.canBeKaUnit === true), [safeAllUsers]);
    const designatedDirut = useMemo(() => safeAllUsers.find(u => u.canBeDirut === true), [safeAllUsers]);

    // Effect to auto-assign DIRUT to all employees when the designated DIRUT changes
    useEffect(() => {
        if (safeAllUsers.length === 0) return;

        const dirutId = designatedDirut ? designatedDirut.id : undefined;

        // 🔥 FIX: Skip if DIRUT hasn't actually changed (prevent infinite loop)
        if (dirutId === lastDirutIdRef.current) return;

        // Find all users who need an update (their dirutId is different from the new one)
        // Also exclude the DIRUT himself from being updated
        const usersToUpdate = safeAllUsers.filter(u => u.dirutId !== dirutId && (!dirutId || u.id !== dirutId));

        if (usersToUpdate.length > 0) {
            // Update the ref BEFORE making async calls to prevent race conditions
            lastDirutIdRef.current = dirutId;

            const updatePromises = usersToUpdate.map(user =>
                onUpdateProfile(user.id, { dirutId: dirutId })
            );
            Promise.all(updatePromises).catch(err => {
                console.error('Error auto-updating dirut:', err);
            });
        }
    }, [designatedDirut?.id, safeAllUsers, onUpdateProfile]);


    const filteredUsers = useMemo(() => {
        if (!searchTerm) return safeAllUsers;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return safeAllUsers.filter(user =>
            user.name.toLowerCase().includes(lowerSearchTerm) ||
            user.id.toLowerCase().includes(lowerSearchTerm)
        );
    }, [safeAllUsers, searchTerm]);

    // Sort users by name for consistent display
    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredUsers]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman

    // State for edit assignment modal
    const [editAssignmentModal, setEditAssignmentModal] = useState<Employee | null>(null);

    // Pagination logic
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleRelationChange = async (
        userToUpdate: Employee,
        field: 'mentorId' | 'supervisorId' | 'kaUnitId', // dirutId is now automated
        newId: string | undefined
    ) => {
        // Defensive check
        if (!userToUpdate || !userToUpdate.id) {
            console.error('Invalid user in handleRelationChange:', userToUpdate);
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
                    console.log('🔔 Creating assignment notification for user:', userToUpdate.id, userToUpdate.name);
                    console.log('📊 Assignment type:', assignmentType);
                    console.log('👤 Previous:', oldRelationName, '→ New:', newRelationName);

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
                                roleName: fieldNameMap[field] as 'Mentor' | 'Supervisor' | 'Kepala Unit',
                                assignmentType: assignmentType,
                                assigneeName: newRelationName, // 🔥 FIX: Kirim nama, bukan ID
                                previousAssigneeName: oldRelationName || undefined, // 🔥 FIX: Kirim nama, bukan ID
                            }
                        }
                    };
                    console.log('📝 Notification data:', notificationData);
                    await createNotification(notificationData);
                    console.log('✅ Assignment notification created successfully');
                } else {
                    throw new Error('Update failed');
                }
            } catch (error) {
                console.error('Error updating relation:', error);
                alert('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        } else {
            // Handle removal (newId === undefined)
            if (userToUpdate[field]) {
                try {
                    const fieldNameMap = {
                        mentorId: 'Mentor',
                        supervisorId: 'Supervisor',
                        kaUnitId: 'Kepala Unit',
                    };

                    const oldRelationId = userToUpdate[field];
                    const oldRelationName = userMap.get(oldRelationId) || 'N/A';

                    const result = await onUpdateProfile(userToUpdate.id, { [field]: undefined });
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
                                    roleName: fieldNameMap[field] as 'Mentor' | 'Supervisor' | 'Kepala Unit',
                                    assignmentType: 'removal' as const,
                                    previousAssigneeName: oldRelationName,
                                }
                            }
                        };
                        await createNotification(notificationData);
                        console.log('✅ Removal notification created successfully');
                    } else {
                        throw new Error('Update failed');
                    }
                } catch (error) {
                    console.error('Error removing relation:', error);
                    alert('Gagal menghapus penugasan: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
            }
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Kelola Relasi & Jabatan Fungsional</h3>

            <div className="mb-4 relative max-w-md">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NIP karyawan..."
                    className="w-full bg-white/10 border border-white/20 rounded-md py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* Mobile scroll indicator */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 animate-pulse">
                <span>← Geser untuk melihat kolom →</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20 -mx-2 sm:mx-0">
                <table className="min-w-[1300px] w-full text-sm text-left text-white">
                     <thead className="bg-white/10 text-xs uppercase text-blue-200 align-middle">
                        <tr>
                            <th rowSpan={2} className="px-3 py-2 sm:px-4 align-middle border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[200px]">Nama Karyawan</th>
                            <th colSpan={4} className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap">Kapabilitas Peran</th>
                            <th colSpan={4} className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap">Penugasan Atasan</th>
                            <th rowSpan={2} className="px-3 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Aksi</th>
                        </tr>
                        <tr>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Dirut</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Mentor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[100px]">Supervisor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[100px]">Ka. Unit</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Dirut</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Mentor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-gray-700 whitespace-nowrap min-w-[160px]">Supervisor</th>
                            <th className="px-2 py-2 text-center border-b-2 border-r border-gray-700 whitespace-nowrap min-w-[160px]">Ka. Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-3 py-3 sm:px-4 whitespace-nowrap border-r border-gray-700 min-w-[180px]">
                                    <p className="font-semibold text-sm truncate" title={user.name}>{user.name}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">{user.id}</p>
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
                                <td className="px-2 py-3 text-center border-r border-gray-700 min-w-[80px]">
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
                                <td className="px-2 py-3 min-w-[160px]">
                                     <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.dirutId ? userMap.get(user.dirutId) : 'Otomatis'}>
                                        {user.dirutId ? userMap.get(user.dirutId) : <span className="text-gray-400 italic">Otomatis</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.mentorId ? userMap.get(user.mentorId) : 'Belum ditugaskan'}>
                                        {user.mentorId ? userMap.get(user.mentorId) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.supervisorId ? userMap.get(user.supervisorId) : 'Belum ditugaskan'}>
                                        {user.supervisorId ? userMap.get(user.supervisorId) : <span className="text-gray-400 italic">-</span>}
                                    </div>
                                </td>
                                <td className="px-2 py-3 min-w-[160px]">
                                    <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white text-sm truncate" title={user.kaUnitId ? userMap.get(user.kaUnitId) : 'Belum ditugaskan'}>
                                        {user.kaUnitId ? userMap.get(user.kaUnitId) : <span className="text-gray-400 italic">-</span>}
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
                                <td colSpan={9} className="text-center p-8 text-blue-200">
                                    Tidak ada karyawan yang cocok dengan pencarian Anda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                                <span className="text-gray-400 px-2">...</span>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                                        currentPage === totalPages
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}

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
                                    value={editAssignmentModal.mentorId}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'mentorId', id)}
                                    placeholder="Pilih Mentor"
                                />
                            </div>

                            {/* Supervisor */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Supervisor</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialSupervisors.filter(s => s.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.supervisorId}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'supervisorId', id)}
                                    placeholder="Pilih Supervisor"
                                />
                            </div>

                            {/* Ka. Unit */}
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-2">Kepala Unit</label>
                                <EmployeeSearchableInput
                                    allUsers={potentialKaUnits.filter(u => u.id !== editAssignmentModal.id)}
                                    value={editAssignmentModal.kaUnitId}
                                    onChange={id => handleRelationChange(editAssignmentModal, 'kaUnitId', id)}
                                    placeholder="Pilih Ka. Unit"
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