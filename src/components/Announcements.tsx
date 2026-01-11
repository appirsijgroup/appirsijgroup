import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Announcement, type Employee } from '../types';
import { MegaphoneIcon, PlusCircleIcon, TrashIcon, UserGroupIcon, GlobeAltIcon, ChevronDownIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface AnnouncementsProps {
    announcements: Announcement[];
    loggedInEmployee: Employee | null;
    allUsers: Employee[];
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => void;
    onDelete: (announcementId: string) => void;
    onMarkAsRead: () => void;
}

const AnnouncementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => void;
    loggedInEmployee: Employee | null;
}> = ({ isOpen, onClose, onCreate, loggedInEmployee }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [scope, setScope] = useState<'global' | 'mentor'>('global');

    if (!isOpen || !loggedInEmployee) return null;

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            alert("Judul dan isi pengumuman tidak boleh kosong.");
            return;
        }
        onCreate({ title, content, scope });
        onClose();
        setTitle('');
        setContent('');
        setScope('global');
    };

    const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20 h-[90vh] flex flex-col">
                <div className="flex-shrink-0 mb-4">
                    <h3 className="text-lg font-bold text-white">Buat Pengumuman Baru</h3>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul Pengumuman" className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Isi pengumuman..." rows={6} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-2">Target Pengumuman</label>
                        <div className="flex items-center gap-4">
                            {isAdmin && (
                                <button onClick={() => setScope('global')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-white ${scope === 'global' ? 'bg-teal-500/20 border-teal-400' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}>
                                    <GlobeAltIcon className="w-5 h-5" /> Global
                                </button>
                            )}
                            {loggedInEmployee.canBeMentor && (
                                <button onClick={() => setScope('mentor')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-white ${scope === 'mentor' ? 'bg-teal-500/20 border-teal-400' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}>
                                    <UserGroupIcon className="w-5 h-5" /> Untuk Mentee
                                </button>
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


const Announcements: React.FC<AnnouncementsProps> = ({ announcements, loggedInEmployee, allUsers: _allUsers, onCreate, onDelete, onMarkAsRead }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
    const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Jumlah item per halaman

    const canCreate = loggedInEmployee && (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeMentor);

    const filteredAnnouncements = useMemo(() => {
        if (!loggedInEmployee) return announcements.sort((a, b) => b.timestamp - a.timestamp);

        return announcements
            .filter(a => {
                if (a.scope === 'global') return true;
                if (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') return true;
                if (loggedInEmployee.canBeMentor) return true;
                if (loggedInEmployee.mentorId && loggedInEmployee.mentorId === a.authorId) return true;
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
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${ann.scope === 'global' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                            {ann.scope === 'global' ? <GlobeAltIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
                                            {ann.scope === 'global' ? 'Global' : 'Mentor'}
                                        </span>
                                        <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
                                    <div className="px-4 pb-4 pt-2 border-t border-white/10">
                                        <p className="text-white whitespace-pre-wrap">{ann.content}</p>
                                        {loggedInEmployee && (loggedInEmployee.role === 'super-admin' || loggedInEmployee.id === ann.authorId) && (
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
                <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAnnouncements.length)} dari {filteredAnnouncements.length} pengumuman
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {/* Display only 2 page numbers at a time */}
                            {Array.from({ length: Math.min(2, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 2) {
                                    // Show all pages if total pages <= 2
                                    pageNum = i + 1;
                                } else if (currentPage <= 2) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 1) {
                                    // Near the end
                                    pageNum = totalPages - 1 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 1 + i;
                                }

                                // Ensure page numbers don't exceed total pages
                                if (pageNum > totalPages) {
                                    pageNum = totalPages - (1 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Show ellipsis and last page if needed */}
                            {totalPages > 2 && currentPage < totalPages - 1 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
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
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
            
            {canCreate && (
                <AnnouncementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={onCreate}
                    loggedInEmployee={loggedInEmployee}
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