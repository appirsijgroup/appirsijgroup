import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Announcement, type Employee, type Hospital } from '../types';
import { Megaphone, PlusCircle, Trash2, Pencil, Users, Globe, ChevronDown, FileDown } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import SimplePagination from './SimplePagination';
import { isAnyAdmin, isSuperAdmin } from '@/lib/rolePermissions';
import { useUIStore } from '@/store/store';

interface AnnouncementsProps {
    announcements: Announcement[];
    loggedInEmployee: Employee | null;
    allUsers: Employee[];
    hospitals?: Hospital[];
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp'>, imageFile?: File, documentFile?: File) => void;
    onUpdate: (announcementId: string, data: Omit<Announcement, 'id' | 'authorId' | 'timestamp'>, imageFile?: File, documentFile?: File) => void;
    onDelete: (announcementId: string) => void;
    onMarkAsRead: () => void;
}

const AnnouncementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: Omit<Announcement, 'id' | 'authorId' | 'timestamp'>, imageFile?: File, documentFile?: File) => void;
    onUpdate?: (announcementId: string, data: Omit<Announcement, 'id' | 'authorId' | 'timestamp'>, imageFile?: File, documentFile?: File) => void;
    editingAnnouncement?: Announcement | null;
    loggedInEmployee: Employee | null;
    allUsers: Employee[];
    hospitals: Hospital[];
}> = ({ isOpen, onClose, onCreate, onUpdate, editingAnnouncement, loggedInEmployee, hospitals, allUsers }) => {
    const { addToast } = useUIStore();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [scope, setScope] = useState<'alliansi' | 'mentor'>('alliansi');
    const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    // Get Mentees
    const myMentees = useMemo(() => {
        if (!loggedInEmployee) return [];
        return allUsers.filter(u => u.mentorId === loggedInEmployee.id);
    }, [allUsers, loggedInEmployee]);

    // Effect for file preview
    useEffect(() => {
        if (!file || !file.type.startsWith('image/')) {
            setFilePreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setFilePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    // Effect to pre-fill form when editing
    useEffect(() => {
        if (editingAnnouncement) {
            setTitle(editingAnnouncement.title);
            setContent(editingAnnouncement.content);
            setScope(editingAnnouncement.scope);
            setSelectedHospitalIds(editingAnnouncement.targetHospitalIds || []);
            // Note: existing images/documents will be shown via editingAnnouncement.imageUrl/documentUrl
            // User can upload new files to replace them
        } else {
            // Reset form when creating new
            setTitle('');
            setContent('');
            // ⚡ UPDATED: Default to 'mentor' if the user is a mentor, as requested
            setScope(loggedInEmployee?.canBeMentor ? 'mentor' : 'alliansi');
            setSelectedHospitalIds([]);
            setFile(null);
            setFilePreview(null);
        }
    }, [editingAnnouncement, isOpen]);

    if (!isOpen || !loggedInEmployee) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
        }
    };

    const removeFile = () => {
        setFile(null);
        setFilePreview(null);
    };

    const handleSubmit = () => {
        if (!title.trim() || !content.trim()) {
            addToast("Judul dan isi pengumuman tidak boleh kosong.", 'error');
            return;
        }

        const selectedHospitals = hospitals.filter(h => selectedHospitalIds.includes(h.id));
        const announcementData: any = {
            title,
            content,
            scope,
            documentName: file && !file.type.startsWith('image/') ? file.name : (editingAnnouncement?.documentName || undefined),
            authorName: editingAnnouncement?.authorName || loggedInEmployee.name // Preserve original author name when editing
        };

        if (scope === 'alliansi' && selectedHospitalIds.length > 0) {
            announcementData.targetHospitalIds = selectedHospitalIds;
            announcementData.targetHospitalNames = selectedHospitals.map(h => h.name || h.brand || '');
        }

        const imageFile = (file && file.type.startsWith('image/')) ? file : undefined;
        const documentFile = (file && !file.type.startsWith('image/')) ? file : undefined;

        if (editingAnnouncement && onUpdate) {
            onUpdate(editingAnnouncement.id, announcementData, imageFile, documentFile);
        } else {
            onCreate(announcementData, imageFile, documentFile);
        }

        onClose();
        setTitle('');
        setContent('');
        // ⚡ UPDATED: Default to 'mentor' if the user is a mentor
        setScope(loggedInEmployee?.canBeMentor ? 'mentor' : 'alliansi');
        setSelectedHospitalIds([]);
        setFile(null);
        setFilePreview(null);
    };

    const isAdmin = isAnyAdmin(loggedInEmployee);

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-in fade-in duration-300">
            <div className="bg-gray-900/90 border border-white/10 rounded-3xl shadow-2xl p-0 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-linear-to-r from-teal-600/20 to-blue-600/20 px-8 py-6 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <PlusCircle className="w-6 h-6 text-teal-400" />
                            {editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                        </h3>
                        <p className="text-sm text-blue-200/60 mt-1">Sampaikan informasi penting ke seluruh tim atau mentee.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="grow overflow-y-auto custom-scrollbar">
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Input Fields */}
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-teal-300 mb-2 block uppercase tracking-wider">Informasi Utama</label>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Judul Pengumuman"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 focus:outline-none text-white text-lg font-medium placeholder:text-white/20 transition-all"
                                    />
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="Tulis isi pengumuman di sini..."
                                        rows={8}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 focus:outline-none text-white placeholder:text-white/20 resize-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Unified File Upload */}
                            <div>
                                <label className="text-sm font-semibold text-teal-300 mb-2 block uppercase tracking-wider">Media & Lampiran</label>
                                {!file ? (
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('announcement-file-input')?.click()}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-500/30 rounded-xl flex items-center justify-center gap-4 transition-all group"
                                    >
                                        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors">Upload Media / Dokumen</p>
                                            <p className="text-[10px] text-white/40">Maks. 5MB (PNG, JPG, PDF)</p>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="relative group bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 animate-in zoom-in-95 duration-200">
                                        <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center">
                                            {filePreview ? (
                                                <img src={filePreview} className="w-full h-full object-contain bg-black/20" alt="Preview" />
                                            ) : (
                                                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            )}
                                        </div>
                                        <div className="grow min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-white/40 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]}</p>
                                        </div>
                                        <button
                                            onClick={removeFile}
                                            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                            title="Hapus file"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                <input
                                    id="announcement-file-input"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Right Column: Targeting */}
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-teal-300 mb-3 block uppercase tracking-wider">Target Audiens</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {isAdmin && (
                                        <button
                                            onClick={() => { setScope('alliansi'); setSelectedHospitalIds([]); }}
                                            className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${scope === 'alliansi' ? 'bg-teal-500/10 border-teal-500 text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'}`}
                                        >
                                            <Globe className="w-6 h-6" />
                                            <span className="text-xs font-bold uppercase tracking-tight">Aliansi</span>
                                        </button>
                                    )}
                                    {loggedInEmployee.canBeMentor && (
                                        <button
                                            onClick={() => { setScope('mentor'); setSelectedHospitalIds([]); }}
                                            className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${scope === 'mentor' ? 'bg-teal-500/10 border-teal-500 text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.1)]' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'}`}
                                        >
                                            <Users className="w-6 h-6" />
                                            <span className="text-xs font-bold uppercase tracking-tight">Mentee Saya</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Mentee List (Targeting Context) */}
                            {scope === 'mentor' && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-bold text-white">Daftar Mentee</label>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Otomatis Terpilih ({myMentees.length})</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {myMentees.length === 0 ? (
                                            <div className="text-center py-8 opacity-20 flex flex-col items-center">
                                                <Users className="w-12 h-12 mb-2" />
                                                <p className="text-xs font-bold">Belum ada mentee</p>
                                            </div>
                                        ) : (
                                            myMentees.map(mentee => (
                                                <div key={mentee.id} className="flex items-center gap-3 p-3 rounded-xl border bg-teal-500/10 border-teal-500/30">
                                                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs uppercase border border-teal-500/30">
                                                        {mentee.name.substring(0, 2)}
                                                    </div>
                                                    <div className="grow min-w-0">
                                                        <div className="text-sm text-white font-bold leading-none">{mentee.name}</div>
                                                        <div className="text-[10px] text-white/40 truncate mt-1">{mentee.unit || 'No Unit'} • {mentee.hospitalId || 'No RS'}</div>
                                                    </div>
                                                    <div className="text-teal-400">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <div className="p-3 rounded-lg bg-teal-500/5 text-[11px] text-teal-200/60 leading-relaxed font-medium">
                                            📢 Pengumuman ini akan dikirimkan secara otomatis kepada seluruh mentee yang terdaftar di bawah bimbingan Anda.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RS/BRAND selector context */}
                            {isAdmin && scope === 'alliansi' && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-bold text-white">Batasi Berdasarkan RS</label>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Opsional • Multi-select</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedHospitalIds(selectedHospitalIds.length === hospitals.length ? [] : hospitals.map(h => h.id))}
                                            className="text-[10px] uppercase tracking-wider font-bold text-teal-400 hover:text-teal-300"
                                        >
                                            {selectedHospitalIds.length === hospitals.length ? 'Batal' : 'Pilih Semua'}
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {hospitals.length === 0 ? (
                                            <div className="text-center py-8 opacity-20"><Globe className="w-12 h-12 mx-auto mb-2" /> No Data</div>
                                        ) : (
                                            hospitals.map(hospital => (
                                                <label key={hospital.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedHospitalIds.includes(hospital.id) ? 'bg-teal-500/10 border-teal-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHospitalIds.includes(hospital.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedHospitalIds([...selectedHospitalIds, hospital.id]);
                                                            else setSelectedHospitalIds(selectedHospitalIds.filter(id => id !== hospital.id));
                                                        }}
                                                        className="w-4 h-4 rounded-md border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400 focus:ring-offset-gray-900"
                                                    />
                                                    <div className="grow min-w-0">
                                                        <div className="text-sm text-white font-bold leading-none">{hospital.brand}</div>
                                                        <div className="text-[10px] text-white/40 truncate mt-1">{hospital.name}</div>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <div className="p-3 rounded-lg bg-teal-500/5 text-[11px] text-teal-200/60 leading-relaxed font-medium">
                                            {selectedHospitalIds.length === 0
                                                ? '📢 Pengumuman ini akan terlihat oleh SELURUH pengguna di aliansi.'
                                                : `📢 Hanya terlihat oleh pengguna dari ${selectedHospitalIds.length} RS yang dipilih.`}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-900 px-8 py-6 border-t border-white/10 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all">Batal</button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-2.5 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                    >
                        {editingAnnouncement ? 'Simpan Perubahan' : 'Terapkan & Terbitkan'}
                    </button>
                </div>
            </div>
        </div >,
        document.body
    );
};
const Announcements: React.FC<AnnouncementsProps> = ({ announcements, loggedInEmployee, allUsers, onCreate, onUpdate, onDelete, onMarkAsRead, hospitals = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
    const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const canCreate = loggedInEmployee && (isAnyAdmin(loggedInEmployee) || loggedInEmployee.canBeMentor);

    const filteredAnnouncements = useMemo(() => {
        if (!loggedInEmployee) return announcements.sort((a, b) => b.timestamp - a.timestamp);

        return announcements
            .filter(a => {

                // Normalize target IDs (handle camelCase and snake_case)
                const targetIds = a.targetHospitalIds || (a as any).target_hospital_ids || [];

                if (a.scope === 'alliansi') {
                    // Global announcement (no specific targets) -> Show to everyone
                    if (targetIds.length === 0) return true;

                    // Targeted announcement -> Check permissions
                    if (targetIds.length > 0) {
                        // Admins see everything
                        if (isAnyAdmin(loggedInEmployee)) return true;

                        // 🔥 FIX: robust check for hospitalId (handle potential missing camelCase)
                        const userHospitalId = loggedInEmployee.hospitalId || (loggedInEmployee as any).hospital_id;

                        // If user has no hospital ID, they can't see hospital-specific announcements
                        if (!userHospitalId) return false;

                        // Force string comparison to avoid type mismatches
                        // Case-insensitive too just in case
                        return targetIds.some((id: any) => String(id).toLowerCase() === String(userHospitalId).toLowerCase());
                    }
                }
                if (a.scope === 'mentor') {
                    if (isAnyAdmin(loggedInEmployee)) return true;
                    if (loggedInEmployee.canBeMentor) return true;
                    if (loggedInEmployee.mentorId && loggedInEmployee.mentorId === a.authorId) return true;
                }
                return false;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [announcements, loggedInEmployee]);

    const lastRead = loggedInEmployee?.lastAnnouncementReadTimestamp || 0;
    const unreadCount = useMemo(() => {
        if (!loggedInEmployee) return 0;
        return filteredAnnouncements.filter(a => a.timestamp > lastRead).length;
    }, [filteredAnnouncements, loggedInEmployee, lastRead]);

    const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [announcements, loggedInEmployee]);

    useEffect(() => {
        if (!loggedInEmployee) return;
        const firstUnread = filteredAnnouncements.find(a => a.timestamp > lastRead);
        if (firstUnread) {
            onMarkAsRead();
        }
    }, [filteredAnnouncements, loggedInEmployee, onMarkAsRead, lastRead]);

    const handleDelete = () => {
        if (confirmDelete) {
            onDelete(confirmDelete.id);
            setConfirmDelete(null);
        }
    };

    const toggleAnnouncement = (id: string) => {
        // 🔥 FIX: Mark as read when user explicitly expands an unread announcement
        // This ensures the badge clears if the automatic check missed it or user just wants to clear it by interacting
        const ann = announcements.find(a => a.id === id);
        if (ann && ann.timestamp > lastRead) {
            onMarkAsRead();
        }

        setOpenAnnouncementId(prevId => (prevId === id ? null : id));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-500/20 rounded-2xl shrink-0">
                        <Megaphone className="w-8 h-8 text-teal-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight flex items-center gap-3">
                            Pengumuman <span className="text-teal-400">Terbaru</span>
                            {unreadCount > 0 && (
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </h2>
                        <p className="text-blue-200/60 mt-1 text-sm font-medium hidden sm:block">Berita terbaru dan informasi penting untuk seluruh civitas.</p>
                    </div>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="group w-full sm:w-auto px-6 py-4 bg-linear-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                    >
                        <PlusCircle className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        Buat Baru
                    </button>
                )}
            </div>

            {filteredAnnouncements.length > 0 ? (
                <div className="grid gap-4">
                    {paginatedAnnouncements.map((ann, idx) => {
                        const isOpen = openAnnouncementId === ann.id;
                        const isUnread = ann.timestamp > lastRead;

                        return (
                            <div
                                key={ann.id}
                                style={{ animationDelay: `${idx * 100}ms` }}
                                className={`group relative bg-gray-900/40 hover:bg-gray-800/60 border rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards ${isOpen ? 'border-teal-500/40 ring-1 ring-teal-500/20 shadow-2xl shadow-teal-500/5' : 'border-white/5 hover:border-white/10'}`}
                            >
                                {isUnread && (
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-teal-400 to-blue-500 shadow-[2px_0_10px_rgba(20,184,166,0.3)] z-10" />
                                )}

                                <button
                                    onClick={() => toggleAnnouncement(ann.id)}
                                    className="w-full flex justify-between items-center p-6 text-left gap-6"
                                    aria-expanded={isOpen}
                                >
                                    <div className="grow min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            {isUnread && (
                                                <span className="px-2 py-0.5 bg-teal-500 text-[10px] font-black uppercase tracking-tighter text-white rounded-md animate-pulse">Baru</span>
                                            )}
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1.5 ${ann.scope === 'alliansi' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {ann.scope === 'alliansi' ? <Globe className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                                {ann.scope === 'alliansi' ? (
                                                    ann.targetHospitalIds && ann.targetHospitalIds.length > 0
                                                        ? `${ann.targetHospitalNames?.[0] || 'RS'}${ann.targetHospitalIds.length > 1 ? ` +${ann.targetHospitalIds.length - 1}` : ''}`
                                                        : 'Aliansi'
                                                ) : 'Mentee Saya'}
                                            </span>
                                        </div>
                                        <h3 className={`font-bold text-xl transition-colors ${isOpen ? 'text-teal-400' : 'text-white'}`}>{ann.title}</h3>
                                        <p className="text-xs text-white/30 mt-2 font-medium">
                                            Oleh <span className="text-white/60">{ann.authorName}</span> • {new Date(ann.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className={`p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-teal-500/20 text-teal-400 rotate-180' : 'bg-white/5 text-white/20 group-hover:text-white/40 group-hover:bg-white/10'}`}>
                                            <ChevronDown className="w-6 h-6" />
                                        </div>
                                    </div>
                                </button>

                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-6 pb-8 pt-2 space-y-6">
                                        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent w-full" />

                                        {ann.imageUrl && (
                                            <div className="relative group/img">
                                                <img
                                                    src={ann.imageUrl}
                                                    alt={ann.title}
                                                    className="w-full h-auto max-h-[800px] object-contain rounded-3xl border border-white/10 shadow-lg bg-black/20"
                                                />
                                                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity rounded-3xl" />
                                            </div>
                                        )}

                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-white/80 whitespace-pre-wrap leading-relaxed text-base italic-font-fix">{ann.content}</p>
                                        </div>

                                        {ann.documentUrl && (
                                            <div className="bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 rounded-2xl p-5 flex items-center justify-between transition-all group/doc">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-teal-500/20 rounded-xl text-teal-400 group-hover/doc:scale-110 transition-transform">
                                                        <FileDown className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">{ann.documentName || 'Lampiran Dokumen'}</div>
                                                        <div className="text-[10px] text-teal-400/60 uppercase font-bold tracking-widest mt-0.5">Dokumen Pendukung • PDF / Image</div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={ann.documentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-teal-500/20"
                                                >
                                                    Unduh
                                                </a>
                                            </div>
                                        )}

                                        {loggedInEmployee && (isSuperAdmin(loggedInEmployee) || loggedInEmployee.id === ann.authorId) && (
                                            <div className="pt-4 flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingAnnouncement(ann); setIsModalOpen(true); }}
                                                    className="p-2 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white rounded-xl transition-all border border-teal-500/30 hover:border-teal-400 shadow-lg hover:shadow-teal-500/20 active:scale-95 group"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(ann); }}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 group"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                <div className="text-center py-24 bg-white/5 border border-white/5 rounded-[40px] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                    <div className="p-6 bg-white/5 rounded-full mb-4">
                        <Megaphone className="w-16 h-16 text-white/10" />
                    </div>
                    <p className="text-xl font-bold text-white/40">Belum ada pengumuman</p>
                    <p className="text-sm text-white/30 max-w-xs">Informasi terbaru dari manajemen akan muncul di sini.</p>
                </div>
            )}

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={filteredAnnouncements.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {canCreate && (
                <AnnouncementModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingAnnouncement(null); }}
                    onCreate={onCreate}
                    onUpdate={onUpdate}
                    editingAnnouncement={editingAnnouncement}
                    loggedInEmployee={loggedInEmployee}
                    hospitals={hospitals}
                    allUsers={allUsers}
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