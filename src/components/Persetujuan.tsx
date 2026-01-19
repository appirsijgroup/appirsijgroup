import React, { useMemo, useState, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type WeeklyReportSubmission, type DailyActivity } from '../types';
import { ArrowLeftIcon, CheckIcon, XIcon, CheckSquareIcon, SquareIcon } from './Icons';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import ConfirmationModal from './ConfirmationModal';

// Copied RejectionModal from MentorDashboard
const RejectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (notes: string) => void;
    title: string;
    prompt: string;
}> = ({ isOpen, onClose, onSubmit, title, prompt }) => {
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(notes);
        onClose();
        setNotes('');
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-blue-200 mb-4">{prompt}</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                    placeholder="Tuliskan catatan Anda di sini..."
                ></textarea>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} disabled={!notes} className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Kirim Penolakan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Copied MenteeReportDetailView from MentorDashboard
const MenteeReportDetailView: React.FC<{
    mentee: Employee;
    monthKey: string;
    onBack: () => void;
}> = ({ mentee, monthKey, onBack }) => {
    
    const currentMonth = useMemo(() => new Date(monthKey + '-02'), [monthKey]);
    const progress = useMemo(() => mentee.monthlyActivities?.[monthKey] || {}, [mentee, monthKey]);
    const daysInMonth = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(), [currentMonth]);
    
    const groupedActivities = useMemo(() => {
        return DAILY_ACTIVITIES.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, typeof DAILY_ACTIVITIES>);
    }, []);

    const activityProgressCounts = useMemo(() => {
        return DAILY_ACTIVITIES.reduce((acc, activity) => {
            acc[activity.id] = Object.values(progress).reduce((dayCount, dailyProgress) => dayCount + (dailyProgress[activity.id] ? 1 : 0), 0);
            return acc;
        }, {} as Record<string, number>);
    }, [progress]);

    return (
        <div className="animate-view-change">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-all shadow-lg">
                    <ArrowLeftIcon className="w-5 h-5"/>
                    <span>Kembali</span>
                </button>
                <div className="border-l-4 border-teal-400 pl-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Detail Laporan Aktivitas</h3>
                    <p className="text-base sm:text-lg text-teal-200">{mentee.name} - {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-white/20">
                 <table className="min-w-full text-sm text-left text-white border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sticky left-0 z-20 bg-gray-900 whitespace-nowrap">Aktivitas</th>
                            <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sticky left-[250px] z-20 bg-gray-900 whitespace-nowrap">Progres</th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                <th key={day} scope="col" className="px-2 py-3 font-bold text-center w-12 min-w-[48px] bg-gray-800 whitespace-nowrap">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedActivities).map(([category, activities]) => (
                            <Fragment key={category}>
                                <tr className="bg-gray-700">
                                    <td colSpan={daysInMonth + 2} className="px-3 py-2 font-bold text-teal-200 sticky left-0 z-10 bg-gray-700 whitespace-nowrap">
                                        {category}
                                    </td>
                                </tr>
                                {activities.map(activity => (
                                    <tr key={activity.id} className="border-b border-gray-700 hover:bg-white/5">
                                        <td className="px-3 py-3 font-medium text-left sticky left-0 bg-gray-800 z-10 whitespace-nowrap">{activity.title}</td>
                                        <td className="px-3 py-3 font-semibold text-center sticky left-[250px] bg-gray-800 z-10 whitespace-nowrap">
                                            {activityProgressCounts[activity.id] || 0} / {activity.monthlyTarget}
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')).map(day => {
                                            const isChecked = progress[day]?.[activity.id] || false;
                                            return (
                                                <td key={day} className="text-center border-l border-gray-700">
                                                    <div className="w-full h-full flex items-center justify-center py-3">
                                                        {isChecked ? (
                                                            <CheckSquareIcon className="w-6 h-6 text-teal-400" />
                                                        ) : (
                                                            <SquareIcon className="w-6 h-6 text-gray-600" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

// Approval tab button component
interface ApprovalTabButtonProps {
    role: 'supervisor' | 'kaunit';
    label: string;
    activeTab: 'supervisor' | 'kaunit';
    onTabChange: (role: 'supervisor' | 'kaunit') => void;
    weeklyReportSubmissions: WeeklyReportSubmission[];
    loggedInEmployee: Employee;
}

const ApprovalTabButton: React.FC<ApprovalTabButtonProps> = ({ role, label, activeTab, onTabChange, weeklyReportSubmissions, loggedInEmployee }) => {
    const count = weeklyReportSubmissions.filter(s => s.status === `pending_${role}` && (role === 'supervisor' ? s.supervisorId === loggedInEmployee.id : s.kaUnitId === loggedInEmployee.id)).length;
    return (
        <button
            onClick={() => onTabChange(role)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${activeTab === role ? 'bg-teal-500 text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20'}`}
        >
            {label}
            {count > 0 && <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">{count}</span>}
        </button>
    );
};

// Status filter button component
interface StatusFilterButtonProps {
    filter: 'all' | 'pending' | 'approved' | 'rejected';
    label: string;
    activeFilter: 'all' | 'pending' | 'approved' | 'rejected';
    onFilterChange: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
}

const StatusFilterButton: React.FC<StatusFilterButtonProps> = ({ filter, label, activeFilter, onFilterChange }) => (
    <button onClick={() => onFilterChange(filter)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-200 ${activeFilter === filter ? 'bg-teal-500 text-white' : 'bg-gray-700/50 text-blue-200 hover:bg-gray-700'}`}>
        {label}
    </button>
);

// Main Component
interface PersetujuanProps {
  loggedInEmployee: Employee;
  weeklyReportSubmissions: WeeklyReportSubmission[];
  onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'supervisor' | 'kaunit') => void;
  allUsersData: Record<string, { employee: Employee; attendance: any; history: any; }>;
}

const Persetujuan: React.FC<PersetujuanProps> = ({ loggedInEmployee, weeklyReportSubmissions, onReviewReport, allUsersData }) => {
    type ApprovalRole = 'supervisor' | 'kaunit';
    const [activeApprovalTab, setActiveApprovalTab] = useState<ApprovalRole>('supervisor');
    const [selectedSubmission, setSelectedSubmission] = useState<WeeklyReportSubmission | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<string | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<WeeklyReportSubmission | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');

    const { isSupervisor, isKaUnit } = useMemo(() => ({
        isSupervisor: loggedInEmployee.canBeSupervisor,
        isKaUnit: loggedInEmployee.canBeKaUnit,
    }), [loggedInEmployee]);

    useEffect(() => {
        if (isSupervisor) {
            setActiveApprovalTab('supervisor');
        } else if (isKaUnit) {
            setActiveApprovalTab('kaunit');
        }
    }, [isSupervisor, isKaUnit]);

    const submissionsForRole = useMemo(() => {
        const id = loggedInEmployee.id;
        if (activeApprovalTab === 'supervisor') {
            return weeklyReportSubmissions.filter(s => s.supervisorId === id);
        } else if (activeApprovalTab === 'kaunit') {
            return weeklyReportSubmissions.filter(s => s.kaUnitId === id);
        }
        return [];
    }, [weeklyReportSubmissions, loggedInEmployee.id, activeApprovalTab]);

    const availableYears = useMemo(() => {
        const years = new Set(submissionsForRole.map(s => s.monthKey.substring(0, 4)));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [submissionsForRole]);

    const filteredSubmissions = useMemo(() => {
        return submissionsForRole.filter(s => {
            const statusMatch = statusFilter === 'all' ||
                (statusFilter === 'pending' && s.status === `pending_${activeApprovalTab}`) ||
                (statusFilter === 'approved' && (activeApprovalTab === 'supervisor' ? ['pending_kaunit', 'approved'].includes(s.status) : s.status === 'approved')) ||
                (statusFilter === 'rejected' && s.status.startsWith('rejected_'));
            
            if (!statusMatch) return false;

            const [year, month] = s.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);
            
            return yearMatch && monthMatch;
        });
    }, [submissionsForRole, statusFilter, filterYear, filterMonth, activeApprovalTab]);

    const handleApprove = (submissionId: string) => { setApprovalTarget(submissionId); };
    
    const handleConfirmApproval = () => {
        if (!approvalTarget) return;
        onReviewReport(approvalTarget, 'approved', 'Laporan telah disetujui.', activeApprovalTab);
        setSelectedSubmission(null);
        setApprovalTarget(null);
    };

    const handleInitiateReject = (submission: WeeklyReportSubmission) => { setRejectionTarget(submission); };
    
    const handleRejectSubmit = (notes: string) => {
        if (rejectionTarget) {
            onReviewReport(rejectionTarget.id, 'rejected', notes, activeApprovalTab);
            setSelectedSubmission(null);
            setRejectionTarget(null);
        }
    };

    const menteeDataForDetail = selectedSubmission ? allUsersData[selectedSubmission.menteeId]?.employee : null;

    return (
         <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 min-h-[60vh]">
            {selectedSubmission && menteeDataForDetail ? (
                <div>
                    <MenteeReportDetailView mentee={menteeDataForDetail} monthKey={selectedSubmission.monthKey} onBack={() => setSelectedSubmission(null)} />
                    <div className="mt-8 flex justify-end gap-4 p-4 bg-black/20 rounded-lg">
                        <button
                            onClick={() => handleInitiateReject(selectedSubmission)}
                            disabled={selectedSubmission.status !== `pending_${activeApprovalTab}`}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Tolak Laporan
                        </button>
                        <button
                            onClick={() => handleApprove(selectedSubmission.id)}
                            disabled={selectedSubmission.status !== `pending_${activeApprovalTab}`}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Setujui Laporan
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Riwayat Persetujuan Laporan</h3>
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-black/20 rounded-full self-start mb-4">
                        {isSupervisor && <ApprovalTabButton role="supervisor" label="Persetujuan Supervisor" activeTab={activeApprovalTab} onTabChange={setActiveApprovalTab} weeklyReportSubmissions={weeklyReportSubmissions} loggedInEmployee={loggedInEmployee} />}
                        {isKaUnit && <ApprovalTabButton role="kaunit" label="Persetujuan Ka. Unit" activeTab={activeApprovalTab} onTabChange={setActiveApprovalTab} weeklyReportSubmissions={weeklyReportSubmissions} loggedInEmployee={loggedInEmployee} />}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-black/20 rounded-lg border border-white/10">
                        <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                            <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-full min-w-max">
                                <StatusFilterButton filter="all" label="Semua" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                                <StatusFilterButton filter="pending" label="Menunggu" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                                <StatusFilterButton filter="approved" label="Disetujui" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                                <StatusFilterButton filter="rejected" label="Ditolak" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            </div>
                        </div>
                         <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                                <option value="all" className="text-black bg-white">Semua Tahun</option>
                                {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                            </select>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                                <option value="all" className="text-black bg-white">Semua Bulan</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month} className="text-black bg-white">{new Date(0, month - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredSubmissions.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-white/20">
                            <table className="min-w-full text-sm text-left text-white">
                                <thead className="bg-white/10 text-xs uppercase text-blue-200">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Periode Laporan</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Tanggal Pengajuan</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.map(sub => (
                                        <tr key={sub.id} className="border-b border-gray-700 hover:bg-white/5">
                                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{sub.menteeName}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{`Pekan ${sub.weekIndex + 1}, ${new Date(sub.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(sub.submittedAt).toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => setSelectedSubmission(sub)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                                                    Lihat & Tinjau
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-black/20 rounded-lg">
                            <p className="text-lg text-blue-200">Tidak ada pengajuan laporan yang cocok dengan filter.</p>
                        </div>
                    )}
                </div>
            )}

            <ConfirmationModal
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                onConfirm={handleConfirmApproval}
                title="Konfirmasi Persetujuan"
                message="Apakah Anda yakin ingin menyetujui laporan ini?"
                confirmText="Ya, Setujui"
                confirmColorClass="bg-green-600 hover:bg-green-500"
            />
            
            <RejectionModal
                isOpen={!!rejectionTarget}
                onClose={() => setRejectionTarget(null)}
                onSubmit={handleRejectSubmit}
                title="Tolak Laporan Aktivitas"
                prompt="Berikan alasan penolakan laporan ini."
            />
        </div>
    );
};
export default Persetujuan;
