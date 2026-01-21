import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Announcement, type Employee, type Hospital } from '../types';
import { MegaphoneIcon, PlusCircleIcon, TrashIcon, UserGroupIcon, GlobeAltIcon, ChevronDownIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { isAnyAdmin, isSuperAdmin } from '@/lib/rolePermissions';
import { useUIStore } from '@/store/store';

interface AnnouncementsProps {
    announcements: Announcement[];
    loggedInEmployee: Employee | null;
    allUsers: Employee[];
    hospitals?: Hospital[];
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => void;
    onDelete: (announcementId: string) => void;
    onMarkAsRead: () => void;
}

const AnnouncementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => void;
    loggedInEmployee: Employee | null;
    hospitals: Hospital[];
}> = ({ isOpen, onClose, onCreate, loggedInEmployee, hospitals }) => {
    const { addToast } = useUIStore();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [scope, setScope] = useState<'alliansi' | 'mentor'>('alliansi');
    const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);

    if (!isOpen || !loggedInEmployee) return null;

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            addToast("Judul dan isi pengumuman tidak boleh kosong.", 'error');
            return;
        }

        // For 'alliansi' scope, check if hospitals are selected
        const selectedHospitals = hospitals.filter(h => selectedHospitalIds.includes(h.id));
        if (scope === 'alliansi' && selectedHospitalIds.length > 0) {
            onCreate({
                title,
                content,
                scope,
                targetHospitalIds: selectedHospitalIds,
                targetHospitalNames: selectedHospitals.map(h => h.name || h.brand || '')
            });
        } else {
            onCreate({ title, content, scope });
        }

        onClose();
        setTitle('');
        setContent('');
        setScope('alliansi');
        setSelectedHospitalIds([]);
    };

    const isAdmin = isAnyAdmin(loggedInEmployee);

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-5xl border border-white/20 max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0 mb-4">
                    <h3 className="text-lg font-bold text-white">Buat Pengumuman Baru</h3>
                </div>

                {/* Two-column layout for desktop */}
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left column: Title and Content */}
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Judul Pengumuman"
                                className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                            />
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Isi pengumuman..."
                                rows={12}
                                className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white resize-none"
                            />
                        </div>

                        {/* Right column: Target Pengumuman */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-2">Target Pengumuman</label>
                                <div className="flex items-center gap-4">
                                    {isAdmin && (
                                        <button
                                            onClick={() => { setScope('alliansi'); setSelectedHospitalIds([]); }}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-white ${scope === 'alliansi' ? 'bg-teal-500/20 border-teal-400' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}
                                        >
                                            <GlobeAltIcon className="w-5 h-5" /> Aliansi
                                        </button>
                                    )}
                                    {loggedInEmployee.canBeMentor && (
                                        <button
                                            onClick={() => { setScope('mentor'); setSelectedHospitalIds([]); }}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-white ${scope === 'mentor' ? 'bg-teal-500/20 border-teal-400' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}
                                        >
                                            <UserGroupIcon className="w-5 h-5" /> Untuk Mentee
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hospital/BRAND selector - only show for Admin when Aliansi is selected */}
                            {isAdmin && scope === 'alliansi' && (
                                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-blue-100">
                                            Pilih RS/BRAND (Opsional)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHospitalIds(selectedHospitalIds.length === hospitals.length ? [] : hospitals.map(h => h.id))}
                                            className="text-xs text-teal-400 hover:text-teal-300 underline"
                                        >
                                            {selectedHospitalIds.length === hospitals.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                        </button>
                                    </div>

                                    <div className="bg-black/20 border border-white/10 rounded-lg p-3 max-h-72 overflow-y-auto">
                                        {hospitals.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">Belum ada data RS</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {hospitals.map(hospital => (
                                                    <label key={hospital.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedHospitalIds.includes(hospital.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedHospitalIds([...selectedHospitalIds, hospital.id]);
                                                                } else {
                                                                    setSelectedHospitalIds(selectedHospitalIds.filter(id => id !== hospital.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-400 text-teal-500 focus:ring-teal-400 focus:ring-offset-gray-800"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-sm text-white font-medium">{hospital.brand}</div>
                                                            <div className="text-xs text-gray-400">{hospital.name}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-400 mt-3">
                                        {selectedHospitalIds.length === 0
                                            ? 'Semua user di Aliansi dapat melihat pengumuman ini'
                                            : `Hanya user dari ${selectedHospitalIds.length} RS terpilih yang dapat melihat pengumuman ini`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">
                        Terbitkan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const Announcements: React.FC<AnnouncementsProps> = ({ announcements, loggedInEmployee, allUsers: _allUsers, onCreate, onDelete, onMarkAsRead, hospitals = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
    const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Jumlah item per halaman

    const canCreate = loggedInEmployee && (isAnyAdmin(loggedInEmployee) || loggedInEmployee.canBeMentor);

    const filteredAnnouncements = useMemo(() => {
        if (!loggedInEmployee) return announcements.sort((a, b) => b.timestamp - a.timestamp);

        return announcements
            .filter(a => {
                // 'alliansi' scope without targetHospitalIds - everyone can see
                if (a.scope === 'alliansi' && (!a.targetHospitalIds || a.targetHospitalIds.length === 0)) return true;

                // 'alliansi' scope with targetHospitalIds - only users from those hospitals can see
                if (a.scope === 'alliansi' && a.targetHospitalIds && a.targetHospitalIds.length > 0) {
                    // Admins can see all targeted announcements
                    if (isAnyAdmin(loggedInEmployee)) return true;
                    // Users can see if they belong to one of the target hospitals
                    return loggedInEmployee.hospitalId && a.targetHospitalIds.includes(loggedInEmployee.hospitalId);
                }

                // 'mentor' scope - mentors and their mentees can see
                if (a.scope === 'mentor') {
                    if (isAnyAdmin(loggedInEmployee)) return true;
                    if (loggedInEmployee.canBeMentor) return true;
                    if (loggedInEmployee.mentorId && loggedInEmployee.mentorId === a.authorId) return true;
                }

                return false;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [announcements, loggedInEmployee]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [announcements, loggedInEmployee]);

    useEffect(() => {
        if (!loggedInEmployee) return;
        const lastRead = loggedInEmployee.lastAnnouncementReadTimestamp || 0;
        const firstUnread = filteredAnnouncements.find(a => a.timestamp > lastRead);
        if (firstUnread) {
            setOpenAnnouncementId(firstUnread.id);
            onMarkAsRead();
        }
    }, [filteredAnnouncements, loggedInEmployee, onMarkAsRead]);

    const handleDelete = () => {
        if (confirmDelete) {
            onDelete(confirmDelete.id);
            setConfirmDelete(null);
        }
    };

    const toggleAnnouncement = (id: string) => {
        setOpenAnnouncementId(prevId => (prevId === id ? null : id));
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <MegaphoneIcon className="w-8 h-8 text-teal-300"/>
                        Pengumuman
                    </h2>
                    <p className="text-blue-200 mt-1">Informasi penting dari manajemen dan para mentor.</p>
                </div>
                {canCreate && (
                    <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                        <PlusCircleIcon className="w-6 h-6" />
                        Buat Pengumuman Baru
                    </button>
                )}
            </div>

            {filteredAnnouncements.length > 0 ? (
                <div className="space-y-2">
                    {paginatedAnnouncements.map(ann => {
                        const isOpen = openAnnouncementId === ann.id;
                        return (
                             <div key={ann.id} className="bg-black/20 rounded-lg border border-white/10 animate-view-change overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => toggleAnnouncement(ann.id)}
                                    className="w-full flex justify-between items-center p-4 text-left gap-4"
                                    aria-expanded={isOpen}
                                >
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-lg text-white">{ann.title}</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Oleh <strong>{ann.authorName}</strong> • {new Date(ann.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${ann.scope === 'alliansi' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                            {ann.scope === 'alliansi' ? <GlobeAltIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
                                            {ann.scope === 'alliansi' ? (
                                                ann.targetHospitalIds && ann.targetHospitalIds.length > 0
                                                    ? `${ann.targetHospitalNames?.[0] || 'RS'}${ann.targetHospitalIds.length > 1 ? ` +${ann.targetHospitalIds.length - 1}` : ''}`
                                                    : 'Aliansi'
                                            ) : 'Mentor'}
                                        </span>
                                        <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
                                    <div className="px-4 pb-4 pt-2 border-t border-white/10">
                                        <p className="text-white whitespace-pre-wrap">{ann.content}</p>
                                        {loggedInEmployee && (isSuperAdmin(loggedInEmployee) || loggedInEmployee.id === ann.authorId) && (
                                            <div className="mt-4 text-right">
                                                <button onClick={() => setConfirmDelete(ann)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white rounded-md">
                                                    <TrashIcon className="w-4 h-4"/>
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                 <div className="text-center py-16 bg-black/20 rounded-lg">
                    <p className="text-lg text-blue-200">Saat ini tidak ada pengumuman.</p>
                </div>
            )}

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
            
            {canCreate && (
                <AnnouncementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={onCreate}
                    loggedInEmployee={loggedInEmployee}
                    hospitals={hospitals}
                />
            )}
            
            <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Pengumuman"
                message={<>Apakah Anda yakin ingin menghapus pengumuman &quot;<strong>{confirmDelete?.title}</strong>"?</>}
                confirmText="Ya, Hapus"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </div>
    );
};

export default Announcements;