import React, { useState, useMemo, useEffect } from 'react';
import { type Employee } from '../types';
import EmployeeSearchableInput from './EmployeeSearchableInput';
import { SearchIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
    } | null>(null);

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

        // Find all users who need an update (their dirutId is different from the new one)
        // Also exclude the DIRUT himself from being updated
        const usersToUpdate = safeAllUsers.filter(u => u.dirutId !== dirutId && (!dirutId || u.id !== dirutId));

        if (usersToUpdate.length > 0) {
            const updatePromises = usersToUpdate.map(user =>
                onUpdateProfile(user.id, { dirutId: dirutId })
            );
            Promise.all(updatePromises).catch(err => {
                console.error('Error auto-updating dirut:', err);
            });
        }
    }, [designatedDirut, safeAllUsers, onUpdateProfile]);


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

        if (newId === undefined && userToUpdate[field]) {
            const fieldNameMap = {
                mentorId: 'Mentor',
                supervisorId: 'Supervisor',
                kaUnitId: 'Ka. Unit Kerja',
            };

            const oldRelationId = userToUpdate[field]!;
            const oldRelationName = userMap.get(oldRelationId) || 'N/A';

            setConfirmation({
                isOpen: true,
                title: `Konfirmasi Hapus ${fieldNameMap[field]}`,
                message: (
                    <>
                        Apakah Anda yakin ingin menghapus <strong>{oldRelationName}</strong> sebagai {fieldNameMap[field]} untuk <strong>{userToUpdate.name}</strong>?
                    </>
                ),
                onConfirm: async () => {
                    try {
                        const result = await onUpdateProfile(userToUpdate.id, { [field]: undefined });
                        if (result) {
                            setConfirmation(null);
                        } else {
                            throw new Error('Update failed');
                        }
                    } catch (error) {
                        console.error('Error updating relation:', error);
                        alert('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'));
                    }
                },
            });
        } else if (newId !== userToUpdate[field]) {
            try {
                const result = await onUpdateProfile(userToUpdate.id, { [field]: newId });
                if (!result) {
                    throw new Error('Update failed');
                }
            } catch (error) {
                console.error('Error updating relation:', error);
                alert('Gagal mengupdate profil: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-2">Kelola Relasi & Jabatan Fungsional</h3>
            <p className="text-blue-200 mb-4 text-sm">Atur siapa yang dapat bertindak sebagai Mentor, Supervisor, atau Ka. Unit, dan tetapkan hubungan bimbingan untuk setiap karyawan.</p>

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

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="w-full text-sm text-left text-white">
                     <thead className="bg-white/10 text-xs uppercase text-blue-200 align-middle">
                        <tr>
                            <th rowSpan={2} className="px-4 py-2 align-middle border-b-2 border-r border-gray-700">Nama Karyawan</th>
                            <th colSpan={4} className="px-4 py-2 text-center border-b-2 border-r border-gray-700">Kapabilitas Peran</th>
                            <th colSpan={4} className="px-4 py-2 text-center border-b-2">Penugasan Atasan</th>
                        </tr>
                        <tr>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Dirut</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Mentor</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Supervisor</th>
                            <th className="px-4 py-2 text-center border-b-2 border-r border-gray-700">Ka. Unit</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Dirut</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Mentor</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Supervisor</th>
                            <th className="px-4 py-2 text-center border-b-2 border-gray-700">Ka. Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap border-r border-gray-700">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-gray-400 font-mono">{user.id}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
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
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <ToggleSwitch
                                        checked={!!user.canBeMentor}
                                        onChange={async (checked) => {
                                            const result = await onUpdateProfile(user.id, { canBeMentor: checked });
                                            if (!result) {
                                                throw new Error('Update failed');
                                            }
                                            return result;
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <ToggleSwitch
                                        checked={!!user.canBeSupervisor}
                                        onChange={async (checked) => {
                                            const result = await onUpdateProfile(user.id, { canBeSupervisor: checked });
                                            if (!result) {
                                                throw new Error('Update failed');
                                            }
                                            return result;
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center border-r border-gray-700">
                                     <ToggleSwitch
                                        checked={!!user.canBeKaUnit}
                                        onChange={async (checked) => {
                                            const result = await onUpdateProfile(user.id, { canBeKaUnit: checked });
                                            if (!result) {
                                                throw new Error('Update failed');
                                            }
                                            return result;
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                     <div className="w-full bg-white/5 border border-white/20 rounded-lg py-2 px-3 text-white">
                                        {user.dirutId ? userMap.get(user.dirutId) : <span className="text-gray-400 italic">Otomatis Terisi</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <EmployeeSearchableInput
                                        allUsers={potentialMentors.filter(m => m.id !== user.id)}
                                        value={user.mentorId}
                                        onChange={id => handleRelationChange(user, 'mentorId', id)}
                                        placeholder="Pilih Mentor"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EmployeeSearchableInput
                                        allUsers={potentialSupervisors.filter(s => s.id !== user.id)}
                                        value={user.supervisorId}
                                        onChange={id => handleRelationChange(user, 'supervisorId', id)}
                                        placeholder="Pilih Supervisor"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EmployeeSearchableInput
                                        allUsers={potentialKaUnits.filter(u => u.id !== user.id)}
                                        value={user.kaUnitId}
                                        onChange={id => handleRelationChange(user, 'kaUnitId', id)}
                                        placeholder="Pilih Ka. Unit"
                                    />
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

            {confirmation && (
                 <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText="Ya, Hapus"
                    confirmColorClass="bg-red-600 hover:bg-red-500"
                 />
            )}
        </div>
    );
};

export default RelationManagement;