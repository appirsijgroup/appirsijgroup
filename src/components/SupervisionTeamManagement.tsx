import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { UserPlus, Users, Briefcase } from 'lucide-react';
import { createPortal } from 'react-dom';
import { manageSupervisionTeam } from '@/services/supervisionService';

interface SupervisionTeamManagementProps {
    supervisedEmployees: Employee[]; // Karyawan yang sudah diawasi
    allUsers: Employee[]; // Semua karyawan
    supervisorId: string;
    supervisorRole: 'supervisor' | 'kaunit' | 'manager'; // Role supervisor
    addToast?: (message: string, type: 'success' | 'error') => void;
    onRefresh?: () => void; // Callback untuk refresh data setelah perubahan
}

const SupervisionTeamManagement: React.FC<SupervisionTeamManagementProps> = ({
    supervisedEmployees,
    allUsers,
    supervisorId,
    supervisorRole,
    addToast,
    onRefresh
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState('all');
    const [professionFilter, setProfessionFilter] = useState('all');
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(supervisedEmployees.length / itemsPerPage);
    const paginatedEmployees = supervisedEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Get field name based on role
    const getFieldName = () => {
        if (supervisorRole === 'supervisor') return 'supervisorId';
        if (supervisorRole === 'kaunit') return 'kaUnitId';
        if (supervisorRole === 'manager') return 'managerId';
        return '';
    };

    const fieldName = getFieldName();

    // Filter users yang belum diawasi
    const unassignedUsers = useMemo(() => {
        return allUsers
            .filter(u => {
                // Exclude self
                if (u.id === supervisorId) return false;
                // Exclude those already supervised by this supervisor
                if ((u as any)[fieldName] === supervisorId) return false;

                // Restriction removed to allow flexibility (e.g. Manager managing a Supervisor)
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, supervisorId, fieldName]);

    const uniqueUnits = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.unit).filter(Boolean))).sort()], [allUsers]);
    const uniqueProfessions = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.profession).filter(Boolean))).sort()], [allUsers]);

    const filteredUnassigned = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return unassignedUsers.filter(u => {
            const searchMatch = !search || u.name.toLowerCase().includes(lowerSearch) || u.id.includes(lowerSearch);
            const unitMatch = unitFilter === 'all' || u.unit === unitFilter;
            const professionMatch = professionFilter === 'all' || u.profession === professionFilter;
            return searchMatch && unitMatch && professionMatch;
        });
    }, [unassignedUsers, search, unitFilter, professionFilter]);

    const handleAddTeamMembers = async () => {
        if (selectedToAdd.size === 0) {
            addToast?.('Pilih minimal 1 karyawan', 'error');
            return;
        }

        setIsProcessing(true);
        const selectedIds = Array.from(selectedToAdd);

        const result = await manageSupervisionTeam(supervisorId, selectedIds, 'add', supervisorRole);

        setIsProcessing(false);

        if (result.success) {
            addToast?.(`${selectedIds.length} karyawan berhasil ditambahkan ke tim Anda!`, 'success');
            setIsAddModalOpen(false);
            setSelectedToAdd(new Set());
            onRefresh?.(); // Refresh data
        } else {
            addToast?.(result.error || 'Gagal menambahkan karyawan', 'error');
        }
    };

    const handleRemoveTeamMember = async (employeeId: string, employeeName: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus ${employeeName} dari tim Anda?`)) {
            return;
        }

        const result = await manageSupervisionTeam(supervisorId, [employeeId], 'remove', supervisorRole);

        if (result.success) {
            addToast?.(`${employeeName} berhasil dihapus dari tim`, 'success');
            onRefresh?.();
        } else {
            addToast?.(result.error || 'Gagal menghapus karyawan', 'error');
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedToAdd(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getRoleLabel = () => {
        if (supervisorRole === 'supervisor') return 'Supervisor';
        if (supervisorRole === 'kaunit') return 'Ka. Unit';
        if (supervisorRole === 'manager') return 'Manajer';
        return '';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-indigo-400" />
                        Tim yang Diawasi ({getRoleLabel()})
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Kelola karyawan yang berada di bawah pengawasan Anda</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg"
                >
                    <UserPlus className="w-5 h-5" />
                    Tambah Anggota Tim
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20 bg-slate-900/40">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-slate-800/60 text-xs uppercase text-slate-300">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                            <th className="px-4 py-3 whitespace-nowrap">NIP</th>
                            <th className="px-4 py-3 whitespace-nowrap">Unit Kerja</th>
                            <th className="px-4 py-3 whitespace-nowrap">Profesi</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedEmployees.map(emp => (
                            <tr key={emp.id} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{emp.name}</td>
                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{emp.id}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{emp.unit || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{emp.profession || '-'}</td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <button
                                        onClick={() => handleRemoveTeamMember(emp.id, emp.name)}
                                        className="px-3 py-1.5 rounded-md font-semibold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors"
                                    >
                                        Hapus
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {supervisedEmployees.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-slate-400">
                                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>Anda belum memiliki anggota tim yang diawasi.</p>
                                    <p className="text-xs mt-1">Klik tombol "Tambah Anggota Tim" untuk memulai.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>
                    <span className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white border border-slate-700">
                        Hal {currentPage} dari {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}

            <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 italic">
                    Total {supervisedEmployees.length} karyawan dalam pengawasan Anda
                </p>
            </div>

            {/* Add Team Members Modal */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-white/20 flex flex-col h-[90vh]">
                        <h3 className="text-lg font-bold text-white mb-4">Tambah Anggota Tim Baru</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <input
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama atau NIP..."
                                className="sm:col-span-1 w-full bg-slate-900/60 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-white"
                            />
                            <select
                                value={unitFilter}
                                onChange={e => setUnitFilter(e.target.value)}
                                className="sm:col-span-1 w-full bg-slate-900/60 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-white"
                            >
                                {uniqueUnits.map(u => <option key={u} value={u} className="bg-white text-black">{u === 'all' ? 'Semua Unit' : u}</option>)}
                            </select>
                            <select
                                value={professionFilter}
                                onChange={e => setProfessionFilter(e.target.value)}
                                className="sm:col-span-1 w-full bg-slate-900/60 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-white"
                            >
                                {uniqueProfessions.map(p => <option key={p} value={p} className="bg-white text-black">{p === 'all' ? 'Semua Profesi' : p}</option>)}
                            </select>
                        </div>
                        <div className="grow overflow-y-auto border border-slate-600 rounded-lg p-2 bg-slate-900/40">
                            {filteredUnassigned.map(user => (
                                <label key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedToAdd.has(user.id)}
                                        onChange={() => toggleSelection(user.id)}
                                        className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="text-white font-medium">{user.name}</span>
                                        <span className="text-xs text-slate-400 ml-2">({user.id} • {user.profession}, {user.unit})</span>
                                    </div>
                                </label>
                            ))}
                            {filteredUnassigned.length === 0 && <p className="text-center text-slate-400 p-4">Tidak ada karyawan yang tersedia.</p>}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <p className="text-sm text-slate-300">Terpilih: <span className="font-bold text-indigo-400">{selectedToAdd.size}</span> orang</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsAddModalOpen(false); setSelectedToAdd(new Set()); }}
                                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 font-semibold"
                                    disabled={isProcessing}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddTeamMembers}
                                    disabled={selectedToAdd.size === 0 || isProcessing}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        `Tambahkan (${selectedToAdd.size})`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SupervisionTeamManagement;
