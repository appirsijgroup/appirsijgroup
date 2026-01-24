import React, { useState, useMemo } from 'react';
import { type Employee, type WeeklyReportSubmission, type TadarusRequest, type TadarusSession, type MissedPrayerRequest } from '../types';
import { FileText, CalendarDays, Check, X, Clock, ChevronDown, PlusCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { PRAYERS } from '../data/prayers';
import { useUIStore } from '@/store/store';
import { UnifiedManualRequestModal } from './UnifiedManualRequestModal';

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



const SubTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    icon: any;
}> = ({ active, onClick, label, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all duration-300 ease-in-out text-sm whitespace-nowrap shrink-0
          ${active
                ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]'
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
            icon: <Clock className="w-5 h-5 text-yellow-300" />,
            borderColor: "border-yellow-500/30",
            bgColor: "bg-yellow-900/20",
            textColor: "text-yellow-300",
        },
        'Disetujui': {
            icon: <Check className="w-5 h-5 text-green-300" />,
            borderColor: "border-green-500/30",
            bgColor: "bg-green-900/20",
            textColor: "text-green-300",
        },
        'Ditolak': {
            icon: <X className="w-5 h-5 text-red-300" />,
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
    onNavigateToReport = () => { },
    tadarusRequests = [],
    onTadarusRequest = () => { },
    tadarusSessions = [],
    onMenteeAttendSession = () => { },
    missedPrayerRequests = [],
    onCreateMissedPrayerRequest = () => { }
}) => {

    const [activeSubTab, setActiveSubTab] = useState<'reports' | 'sessions'>('reports');

    const sortedSubmissions = [...submissions].sort((a, b) => b.submittedAt - a.submittedAt);

    // Combine manual requests for a unified list
    const combinedManualRequests = useMemo(() => {
        const tadarus = tadarusRequests.map(r => ({ ...r, type: 'tadarus' as const, label: 'Sesi / Tadarus' }));
        const missed = missedPrayerRequests.map(r => ({ ...r, type: 'prayer' as const, label: r.prayerName || 'Sholat Wajib' }));
        return [...tadarus, ...missed].sort((a, b) => b.requestedAt - a.requestedAt);
    }, [tadarusRequests, missedPrayerRequests]);

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
        let icon = <Clock className="w-4 h-4" />;

        if (status === 'approved') {
            statusText = 'Disetujui';
            colorClass = "bg-green-500/20 text-green-300";
            icon = <Check className="w-4 h-4" />;
        } else if (status.startsWith('rejected')) {
            statusText = 'Ditolak';
            colorClass = "bg-red-500/20 text-red-300";
            icon = <X className="w-4 h-4" />;
        } else if (status === 'pending_supervisor') {
            statusText = 'Menunggu Supervisor';
        } else if (status === 'pending_kaunit') {
            statusText = 'Menunggu Ka. Unit';
        }

        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${colorClass}`}>{icon} {statusText}</span>;
    };



    return (
        <div className="space-y-6">
            <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-3">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-white/10 min-w-max px-1">
                    <SubTabButton label="Laporan Bulanan" icon={FileText} active={activeSubTab === 'reports'} onClick={() => setActiveSubTab('reports')} />
                    <SubTabButton label="Jadwal & Sesi" icon={CalendarDays} active={activeSubTab === 'sessions'} onClick={() => setActiveSubTab('sessions')} />
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
                                                    <ChevronDown className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
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
                            <div className="bg-teal-900/50 border border-teal-500/50 p-4 rounded-xl space-y-3 shadow-lg animate-pop-in">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <span className="w-2 h-8 bg-teal-400 rounded-full"></span>
                                    Sesi Terbuka Hari Ini
                                </h3>
                                {openBbqSessions.map(session => (
                                    <div key={session.id} className="bg-black/40 backdrop-blur-md p-4 rounded-xl flex justify-between items-center border border-white/10">
                                        <div>
                                            <p className="font-bold text-white text-lg">{session.title}</p>
                                            <p className="text-sm text-teal-300 font-medium">Berlangsung Hari ini</p>
                                        </div>
                                        <button onClick={() => onMenteeAttendSession(session.id)} className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wide">
                                            <Check className="w-5 h-5" strokeWidth={3} />
                                            Konfirmasi
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">Riwayat Pengajuan</h3>
                                    <p className="text-blue-200/60 font-medium text-sm">Status kehadiran manual yang Anda ajukan</p>
                                </div>
                            </div>

                            {combinedManualRequests.length > 0 ? (
                                <div className="overflow-x-auto -mx-6">
                                    <table className="min-w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 uppercase text-[10px] font-black tracking-[0.2em] text-blue-200/40">
                                                <th className="px-6 py-4">Tipe / Item</th>
                                                <th className="px-6 py-4">Tanggal Agenda</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Catatan Mentor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {combinedManualRequests.map((req: any) => (
                                                <tr key={`${req.type}-${req.id}`} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${req.type === 'tadarus' ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                                {req.type === 'tadarus' ? <FileText size={16} /> : <Clock size={16} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white leading-none mb-1">{req.label}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Ref: #{req.id.substring(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-blue-100 font-bold text-sm tracking-tight">
                                                            {new Date(req.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[10px] text-white/30 font-medium italic">Diajukan {new Date(req.requestedAt).toLocaleDateString('id-ID')}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {getStatusChip(req.status)}
                                                    </td>
                                                    <td className="px-6 py-5 text-sm">
                                                        <div className="max-w-[200px]">
                                                            {req.mentorNotes ? (
                                                                <p className="text-yellow-200/70 italic leading-tight">"{req.mentorNotes}"</p>
                                                            ) : (
                                                                <span className="text-white/10 italic">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-black/10 rounded-2xl border border-dashed border-white/10">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <FileText className="text-white/20" />
                                    </div>
                                    <p className="text-blue-100/40 font-bold tracking-tight">Tidak ada riwayat pengajuan</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default MenteeGuidanceView;