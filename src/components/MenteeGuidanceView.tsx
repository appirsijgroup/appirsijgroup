import React, { useState, useMemo } from 'react';
import { type Employee, type WeeklyReportSubmission, type TadarusRequest, type TadarusSession, type MissedPrayerRequest } from '../types';
import { DocumentTextIcon, CalendarDaysIcon, CheckIcon, XIcon, ClockIcon, ChevronDownIcon } from './Icons';
import { createPortal } from 'react-dom';
import { PRAYERS } from '../data/prayers';
import { useUIStore } from '@/store/store';

interface MenteeGuidanceViewProps {
    employee: Employee;
    submissions?: WeeklyReportSubmission[];
    onNavigateToReport?: (monthKey: string) => void;
    tadarusRequests?: TadarusRequest[];
    onTadarusRequest?: (data: Omit<TadarusRequest, 'id' | 'menteeName' | 'requestedAt' | 'status'>) => void;
    tadarusSessions?: TadarusSession[];
    onMenteeAttendSession?: (sessionId: string) => void;
    missedPrayerRequests?: MissedPrayerRequest[];
    onCreateMissedPrayerRequest?: (data: Omit<MissedPrayerRequest, 'id' | 'menteeName' | 'requestedAt' | 'status'>) => void;
}

const RequestTadarusModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (date: string, notes: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
    const { addToast } = useUIStore();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!date) {
            addToast("Tanggal harus diisi.", 'error');
            return;
        }
        onSubmit(date, notes);
        onClose();
        setNotes('');
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20 animate-pop-in">
                <h3 className="text-lg font-bold text-white mb-4">Ajukan Kehadiran Tadarus</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Tanggal Tadarus</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" style={{ colorScheme: 'dark' }}/>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Catatan (Opsional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" placeholder="Contoh: Tadarus pagi bersama kelompok A"></textarea>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg font-semibold bg-teal-500 hover:bg-teal-400">
                        Kirim Pengajuan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const MissedPrayerRequestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { date: string, prayerId: string, prayerName: string, reason: string }) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
    const { addToast } = useUIStore();
    const today = new Date();
    today.setDate(today.getDate() - 1); // Only allow requests for yesterday or before
    const maxDate = today.toISOString().split('T')[0];

    const [date, setDate] = useState('');
    const [prayerId, setPrayerId] = useState('');
    const [reason, setReason] = useState('');

    const wajibPrayers = useMemo(() => PRAYERS.filter(p => p.type === 'wajib' && p.id !== 'jumat'), []);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!date || !prayerId || !reason) {
            addToast("Semua kolom wajib diisi.", 'error');
            return;
        }
        const prayerName = wajibPrayers.find(p => p.id === prayerId)?.name || 'Sholat Wajib';
        onSubmit({ date, prayerId, prayerName, reason });
        onClose();
        setDate('');
        setPrayerId('');
        setReason('');
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20 animate-pop-in">
                <h3 className="text-lg font-bold text-white mb-4">Ajukan Presensi Terlewat</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Tanggal</label>
                        <input type="date" value={date} max={maxDate} onChange={e => setDate(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" style={{ colorScheme: 'dark' }}/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Pilih Sholat Wajib</label>
                        <select value={prayerId} onChange={e => setPrayerId(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                            <option value="" className="bg-white text-black">-- Pilih Sholat --</option>
                            {wajibPrayers.map(p => <option key={p.id} value={p.id} className="bg-white text-black">{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Alasan</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" placeholder="Contoh: Lupa melakukan presensi setelah sholat"></textarea>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg font-semibold bg-teal-500 hover:bg-teal-400">
                        Kirim Pengajuan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const SubTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.FC<{className: string}>
}> = ({ active, onClick, label, icon: Icon }) => (
     <button
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all duration-300 ease-in-out text-sm
          ${active
            ? 'bg-teal-500 text-white'
            : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

interface ApprovalStatusCardProps {
    role: string;
    status: 'Menunggu' | 'Disetujui' | 'Ditolak';
    reviewedAt?: number;
    notes?: string;
}

const ApprovalStatusCard: React.FC<ApprovalStatusCardProps> = ({ role, status, reviewedAt, notes }) => {
    const config = {
        'Menunggu': {
            icon: <ClockIcon className="w-5 h-5 text-yellow-300"/>,
            borderColor: "border-yellow-500/30",
            bgColor: "bg-yellow-900/20",
            textColor: "text-yellow-300",
        },
        'Disetujui': {
            icon: <CheckIcon className="w-5 h-5 text-green-300"/>,
            borderColor: "border-green-500/30",
            bgColor: "bg-green-900/20",
            textColor: "text-green-300",
        },
        'Ditolak': {
            icon: <XIcon className="w-5 h-5 text-red-300"/>,
            borderColor: "border-red-500/30",
            bgColor: "bg-red-900/20",
            textColor: "text-red-300",
        }
    };

    const currentConfig = config[status];

    return (
        <div className={`p-4 rounded-lg border ${currentConfig.borderColor} ${currentConfig.bgColor}`}>
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">{role}</h4>
                <div className={`flex items-center gap-2 text-sm font-bold ${currentConfig.textColor}`}>
                    {currentConfig.icon}
                    <span>{status}</span>
                </div>
            </div>
            {reviewedAt ? (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-400">Ditinjau pada: {new Date(reviewedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    {notes && (
                        <blockquote className="mt-2 p-3 bg-black/30 border-l-4 border-gray-500 text-gray-300 italic text-sm">
                            "{notes}"
                        </blockquote>
                    )}
                </div>
            ) : (
                 <p className="text-sm text-gray-400 mt-2 italic">Menunggu tinjauan...</p>
            )}
        </div>
    );
};

const MenteeGuidanceView: React.FC<MenteeGuidanceViewProps> = ({
    employee,
    submissions = [],
    onNavigateToReport = () => {},
    tadarusRequests = [],
    onTadarusRequest = () => {},
    tadarusSessions = [],
    onMenteeAttendSession = () => {},
    missedPrayerRequests = [],
    onCreateMissedPrayerRequest = () => {}
}) => {

    const [activeSubTab, setActiveSubTab] = useState<'reports' | 'missed-requests'>('reports');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isMissedPrayerModalOpen, setIsMissedPrayerModalOpen] = useState(false);

    const sortedSubmissions = [...submissions].sort((a, b) => b.submittedAt - a.submittedAt);
    const sortedTadarusRequests = [...tadarusRequests].sort((a,b) => b.requestedAt - a.requestedAt);
    const sortedMissedPrayerRequests = [...missedPrayerRequests].sort((a,b) => b.requestedAt - a.requestedAt);

    // Accordion and filter state for reports tab
    const [openAccordionId, setOpenAccordionId] = useState<string | null>(sortedSubmissions[0]?.id || null);
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');

    const availableYears = useMemo(() => {
        const years = new Set(sortedSubmissions.map(s => s.monthKey.substring(0, 4)));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [sortedSubmissions]);

    const filteredSubmissions = useMemo(() => {
        return sortedSubmissions.filter(s => {
            const [year, month] = s.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);
            return yearMatch && monthMatch;
        });
    }, [sortedSubmissions, filterYear, filterMonth]);

    const openBbqSessions = useMemo(() => {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return tadarusSessions.filter(s =>
            s.participantIds.includes(employee.id) &&
            s.category === 'BBQ' &&
            s.status === 'open' &&
            s.date === todayStr &&
            !s.presentMenteeIds.includes(employee.id)
        );
    }, [tadarusSessions, employee]);

    const getStatusChip = (status: WeeklyReportSubmission['status'] | TadarusRequest['status'] | MissedPrayerRequest['status']) => {
        let statusText = 'Menunggu';
        let colorClass = "bg-yellow-500/20 text-yellow-300";
        let icon = <ClockIcon className="w-4 h-4"/>;

        if (status === 'approved') {
            statusText = 'Disetujui';
            colorClass = "bg-green-500/20 text-green-300";
            icon = <CheckIcon className="w-4 h-4"/>;
        } else if (status.startsWith('rejected')) {
            statusText = 'Ditolak';
            colorClass = "bg-red-500/20 text-red-300";
            icon = <XIcon className="w-4 h-4"/>;
        } else if (status === 'pending_supervisor') {
            statusText = 'Menunggu Supervisor';
        } else if (status === 'pending_kaunit') {
            statusText = 'Menunggu Ka. Unit';
        }

        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${colorClass}`}>{icon} {statusText}</span>;
    };

    const handleTadarusSubmit = (date: string, notes: string) => {
        if(!employee.mentorId) return;
        onTadarusRequest({
            menteeId: employee.id,
            mentorId: employee.mentorId,
            date,
            notes,
        })
    };

    const handleMissedPrayerSubmit = (data: { date: string, prayerId: string, prayerName: string, reason: string }) => {
        if (!employee.mentorId) return;
        onCreateMissedPrayerRequest({
            menteeId: employee.id,
            mentorId: employee.mentorId,
            ...data,
        });
    };

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-3">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-white/10 min-w-max px-1">
                    <SubTabButton label="Laporan Bulanan" icon={DocumentTextIcon} active={activeSubTab === 'reports'} onClick={() => setActiveSubTab('reports')} />
                    <SubTabButton label="Pengajuan Presensi" icon={ClockIcon} active={activeSubTab === 'missed-requests'} onClick={() => setActiveSubTab('missed-requests')} />
                </div>
            </div>

            <div key={activeSubTab} className="animate-view-change -mx-2 sm:mx-0">
                {activeSubTab === 'reports' && (
                     <div className="space-y-6 px-2 sm:px-0">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full sm:w-auto bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                                <option value="all" className="text-black bg-white">Semua Tahun</option>
                                {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                            </select>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full sm:w-auto bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                                <option value="all" className="text-black bg-white">Semua Bulan</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month} className="text-black bg-white">{new Date(0, month - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        {filteredSubmissions.length > 0 ? (
                            <div className="space-y-4">
                                {filteredSubmissions.map(sub => {
                                    const isOpen = openAccordionId === sub.id;
                                    const isRejected = sub.status.startsWith('rejected');
                                    return (
                                        <div key={sub.id} className="bg-black/20 rounded-lg border border-white/10 overflow-hidden transition-all duration-300">
                                            <button
                                                onClick={() => setOpenAccordionId(isOpen ? null : sub.id)}
                                                className="w-full p-4 text-left flex justify-between items-center hover:bg-white/5"
                                                aria-expanded={isOpen}
                                            >
                                                <div>
                                                    <h3 className="font-semibold text-lg text-white">
                                                        Laporan Bulan {new Date(sub.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        Diajukan pada: {new Date(sub.submittedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusChip(sub.status)}
                                                    <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden">
                                                    <div className="p-4 border-t border-white/10">
                                                        {isRejected && (
                                                            <div className="mb-4 flex justify-end">
                                                                <button
                                                                    onClick={() => onNavigateToReport(sub.monthKey)}
                                                                    className="shrink-0 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-sm transition-colors"
                                                                >
                                                                    Lihat & Perbaiki Laporan
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <ApprovalStatusCard
                                                                role="Mentor"
                                                                status={sub.status === 'rejected_mentor' ? 'Ditolak' : sub.mentorReviewedAt ? 'Disetujui' : 'Menunggu'}
                                                                reviewedAt={sub.mentorReviewedAt}
                                                                notes={sub.mentorNotes}
                                                            />
                                                            <ApprovalStatusCard
                                                                role="Supervisor"
                                                                status={!sub.supervisorId ? 'Menunggu' : sub.status === 'rejected_supervisor' ? 'Ditolak' : sub.supervisorReviewedAt ? 'Disetujui' : 'Menunggu'}
                                                                reviewedAt={sub.supervisorReviewedAt}
                                                                notes={sub.supervisorNotes}
                                                            />
                                                            <ApprovalStatusCard
                                                                role="Ka. Unit"
                                                                status={!sub.kaUnitId ? 'Menunggu' : sub.status === 'rejected_kaunit' ? 'Ditolak' : sub.kaUnitReviewedAt ? 'Disetujui' : 'Menunggu'}
                                                                reviewedAt={sub.kaUnitReviewedAt}
                                                                notes={sub.kaUnitNotes}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-black/20 rounded-lg">
                                <p className="text-lg text-blue-200">Tidak ada riwayat laporan</p>
                            </div>
                        )}
                    </div>
                )}

                {activeSubTab === 'sessions' && (
                    <div className="space-y-8 px-2 sm:px-0">
                         {openBbqSessions.length > 0 && (
                            <div className="bg-teal-900/50 border border-teal-500/50 p-2 sm:p-4 rounded-lg space-y-3">
                                <h3 className="text-xl font-semibold text-white">Sesi Terbuka Hari Ini</h3>
                                {openBbqSessions.map(session => (
                                    <div key={session.id} className="bg-black/20 p-2 sm:p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{session.title}</p>
                                            <p className="text-sm text-blue-200">Hari ini, {new Date(session.date + 'T12:00:00Z').toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})}</p>
                                        </div>
                                        <button onClick={() => onMenteeAttendSession(session.id)} className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            Konfirmasi Hadir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-white">Riwayat Pengajuan Kehadiran</h3>
                                <button onClick={() => setIsRequestModalOpen(true)} className="px-3 sm:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                                    <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Ajukan Manual
                                </button>
                             </div>
                             {sortedTadarusRequests.length > 0 ? (
                                <div className="space-y-3">
                                     {sortedTadarusRequests.map(req => (
                                        <div key={req.id} className="bg-black/20 p-2 sm:p-4 rounded-lg border border-white/10 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-white">Pengajuan untuk {new Date(req.date + 'T12:00:00Z').toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year:'numeric'})}</p>
                                                <p className="text-xs text-gray-400">Diajukan pada {new Date(req.requestedAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}</p>
                                            </div>
                                            {getStatusChip(req.status)}
                                        </div>
                                     ))}
                                </div>
                             ) : (
                                <div className="text-center py-10 bg-black/20 rounded-lg">
                                    <p className="text-lg text-blue-200">Anda belum pernah mengajukan kehadiran manual.</p>
                                </div>
                             )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'missed-requests' && (
                     <div className="px-2 sm:px-0">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-white">Pengajuan Presensi Terlewat</h3>
                            <button onClick={() => setIsMissedPrayerModalOpen(true)} className="px-3 sm:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Buat Pengajuan
                            </button>
                         </div>
                        {sortedMissedPrayerRequests.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-white/20 -mx-2 sm:mx-0">
                                <table className="min-w-full text-sm text-left text-white">
                                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Sholat & Tanggal</th>
                                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Tgl Pengajuan</th>
                                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Alasan</th>
                                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Status</th>
                                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Catatan Mentor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedMissedPrayerRequests.map(req => (
                                            <tr key={req.id} className="border-b border-gray-700 hover:bg-white/5">
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                                    {req.prayerName}
                                                    <p className="text-xs text-gray-400 font-normal">
                                                        {new Date(req.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {new Date(req.requestedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 max-w-xs truncate italic" title={req.reason}>
                                                    "{req.reason}"
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusChip(req.status)}
                                                </td>
                                                <td className="px-4 py-3 text-yellow-200 italic">
                                                    {req.mentorNotes || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-black/20 rounded-lg">
                                <p className="text-lg text-blue-200">Tidak ada riwayat pengajuan presensi.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <RequestTadarusModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSubmit={handleTadarusSubmit}
            />
             <MissedPrayerRequestModal
                isOpen={isMissedPrayerModalOpen}
                onClose={() => setIsMissedPrayerModalOpen(false)}
                onSubmit={handleMissedPrayerSubmit}
            />
        </div>
    );
};

export default MenteeGuidanceView;