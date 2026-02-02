import React, { useMemo, useState, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type MonthlyReportSubmission, type DailyActivity } from '../types';
import { ArrowLeftIcon, CheckIcon, XIcon, CheckSquareIcon, SquareIcon, CheckCircleIcon } from './Icons';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import ConfirmationModal from './ConfirmationModal';
import SimplePagination from './SimplePagination';

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
    dailyActivitiesConfig: any[];
}> = ({ mentee, monthKey, onBack, dailyActivitiesConfig }) => {

    const currentMonth = useMemo(() => new Date(monthKey + '-02'), [monthKey]);
    const progress = useMemo(() => mentee.monthlyActivities?.[monthKey] || {}, [mentee, monthKey]);
    const daysInMonth = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(), [currentMonth]);

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, DailyActivity[]>);
    }, [dailyActivitiesConfig]);

    const activityProgressCounts = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            acc[activity.id] = Object.values(progress).reduce((dayCount: number, dailyProgress: any) => dayCount + (dailyProgress[activity.id] ? 1 : 0), 0);
            return acc;
        }, {} as Record<string, number>);
    }, [progress, dailyActivitiesConfig]);

    return (
        <div className="animate-view-change">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-all shadow-lg">
                    <ArrowLeftIcon className="w-5 h-5" />
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
                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sticky left-0 z-20 bg-gray-800 whitespace-nowrap">Aktivitas</th>
                            <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sticky left-[250px] z-20 bg-gray-800 whitespace-nowrap">Progres</th>
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
                                {(activities as DailyActivity[]).map(activity => (
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


// Status filter button component
interface StatusFilterButtonProps {
    filter: 'all' | 'pending' | 'approved' | 'rejected';
    label: string;
    activeFilter: 'all' | 'pending' | 'approved' | 'rejected';
    onFilterChange: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
}

const StatusFilterButton: React.FC<StatusFilterButtonProps> = ({ filter, label, activeFilter, onFilterChange }) => (
    <button onClick={() => onFilterChange(filter)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black rounded-full transition-all duration-200 ${activeFilter === filter ? 'bg-teal-500 text-gray-900 shadow-lg shadow-teal-500/20' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}>
        {label}
    </button>
);

// Main Component
interface PersetujuanProps {
    loggedInEmployee: Employee;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'supervisor' | 'manager' | 'kaunit' | 'mentor') => void;
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any; }>;
    // 🔥 NEW: Manual requests support
    pendingTadarusRequests?: any[]; // Using any[] for flexibility, but TadarusRequest[] is better
    pendingMissedPrayerRequests?: any[];
    onReviewTadarusRequest?: (requestId: string, status: 'approved' | 'rejected') => void;
    onReviewMissedPrayerRequest?: (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => void;
    loadDetailedEmployeeData?: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    dailyActivitiesConfig: any[];
}

const Persetujuan: React.FC<PersetujuanProps> = ({
    loggedInEmployee,
    monthlyReportSubmissions,
    onReviewReport,
    allUsersData,
    pendingTadarusRequests = [],
    pendingMissedPrayerRequests = [],
    onReviewTadarusRequest,
    onReviewMissedPrayerRequest,
    loadDetailedEmployeeData,
    dailyActivitiesConfig
}) => {

    const searchParams = useSearchParams();
    const reportId = searchParams?.get('reportId');

    const [selectedSubmission, setSelectedSubmission] = useState<MonthlyReportSubmission | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<{ type: 'report' | 'tadarus' | 'prayer', id: string } | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<{ type: 'report', submission: MonthlyReportSubmission } | { type: 'tadarus', id: string } | { type: 'prayer', id: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');

    // Handle initial reportId selection
    useEffect(() => {
        if (reportId && monthlyReportSubmissions.length > 0 && !selectedSubmission) {
            const found = monthlyReportSubmissions.find(s => s.id === reportId);
            if (found) {
                console.log(`🎯 [Persetujuan] Auto-selecting report from URL: ${reportId}`);
                setSelectedSubmission(found);
                // Also update status filter if needed to show the report
                if (found.status.startsWith('rejected')) setStatusFilter('rejected');
                else if (found.status === 'approved') setStatusFilter('approved');
                else setStatusFilter('pending');
            }
        }
    }, [reportId, monthlyReportSubmissions, selectedSubmission]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // 🔥 FIX: Load detailed data when a report is selected (target only the relevant month)
    useEffect(() => {
        if (selectedSubmission && loadDetailedEmployeeData) {
            const [y, m] = selectedSubmission.monthKey.split('-').map(Number);
            console.log(`🔄 [Persetujuan] Loading detailed data for mentee: ${selectedSubmission.menteeId} (Month: ${m}/${y})`);
            loadDetailedEmployeeData(selectedSubmission.menteeId, m, y);
        }
    }, [selectedSubmission, loadDetailedEmployeeData]);

    const { isSupervisor, isManager, isKaUnit } = useMemo(() => ({
        isSupervisor: loggedInEmployee.canBeSupervisor,
        isManager: loggedInEmployee.canBeManager,
        isKaUnit: loggedInEmployee.canBeKaUnit,
    }), [loggedInEmployee]);



    const submissionsForRole = useMemo(() => {
        const id = loggedInEmployee.id;
        const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';

        return monthlyReportSubmissions.filter(s => {
            // 1. Snapshot match (Fast & Independent)
            if (s.mentorId === id || s.supervisorId === id || s.managerId === id || s.kaUnitId === id) return true;

            // 2. My own report (Hide from approval view, unless I'm an admin checking everything)
            if (s.menteeId === id && !isAdmin) return false;

            // 3. Current Mentoring match (Depends on allUsersData)
            const mentee = allUsersData[s.menteeId]?.employee;
            if (mentee) {
                if (loggedInEmployee.canBeMentor && mentee.mentorId === id) return true;
                if (loggedInEmployee.canBeSupervisor && mentee.supervisorId === id) return true;
                if (loggedInEmployee.canBeManager && mentee.managerId === id) return true;
                if (loggedInEmployee.canBeKaUnit && mentee.kaUnitId === id) return true;
                if (loggedInEmployee.canBeDirut && mentee.dirutId === id) return true;
            } else {
                // 🔥 FALLBACK: If allUsersData is still loading but the report is in the store, 
                // it was already validated by the store's fetch logic. Trust it.
                return true;
            }

            // 4. Admin Catch-all
            if (isAdmin) return true;

            return false;
        });
    }, [monthlyReportSubmissions, loggedInEmployee, allUsersData]);

    const availableYears = useMemo(() => {
        const years = new Set([...submissionsForRole.map(s => s.monthKey.substring(0, 4)),
        ...pendingTadarusRequests.map(r => r.date.substring(0, 4)),
        ...pendingMissedPrayerRequests.map(r => r.date.substring(0, 4))]);
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [submissionsForRole, pendingTadarusRequests, pendingMissedPrayerRequests]);

    const getReviewerRole = (submission: MonthlyReportSubmission): 'supervisor' | 'manager' | 'kaunit' | 'mentor' => {
        const mentee = allUsersData[submission.menteeId]?.employee;
        const myId = loggedInEmployee.id;
        if (loggedInEmployee.canBeManager && (submission.managerId === myId || mentee?.managerId === myId)) return 'manager';
        if (loggedInEmployee.canBeKaUnit && (submission.kaUnitId === myId || mentee?.kaUnitId === myId)) return 'kaunit';
        if (loggedInEmployee.canBeSupervisor && (submission.supervisorId === myId || mentee?.supervisorId === myId)) return 'supervisor';
        if (loggedInEmployee.canBeMentor && (submission.mentorId === myId || mentee?.mentorId === myId)) return 'mentor';
        return 'supervisor';
    };

    const handleConfirmApproval = () => {
        if (!approvalTarget) return;
        if (approvalTarget.type === 'report') {
            const submission = monthlyReportSubmissions.find(s => s.id === approvalTarget.id);
            if (submission) {
                const reviewerRole = getReviewerRole(submission);
                onReviewReport(approvalTarget.id, 'approved', 'Laporan telah disetujui.', reviewerRole);
            }
        } else if (approvalTarget.type === 'tadarus') {
            onReviewTadarusRequest?.(approvalTarget.id, 'approved');
        } else if (approvalTarget.type === 'prayer') {
            onReviewMissedPrayerRequest?.(approvalTarget.id, 'approved', 'Disetujui via panel persetujuan');
        }
        setSelectedSubmission(null);
        setApprovalTarget(null);
    };

    const handleRejectSubmit = (notes: string) => {
        if (!rejectionTarget) return;
        if (rejectionTarget.type === 'report') {
            const reviewerRole = getReviewerRole(rejectionTarget.submission);
            onReviewReport(rejectionTarget.submission.id, 'rejected', notes, reviewerRole);
        } else if (rejectionTarget.type === 'tadarus') {
            onReviewTadarusRequest?.(rejectionTarget.id, 'rejected');
        } else if (rejectionTarget.type === 'prayer') {
            onReviewMissedPrayerRequest?.(rejectionTarget.id, 'rejected', notes);
        }
        setSelectedSubmission(null);
        setRejectionTarget(null);
    };

    // Unified history items (Reports + Manual Requests)
    const unifiedHistory = useMemo(() => {
        const myId = loggedInEmployee.id;

        // 1. Map Monthly Reports
        const reports = submissionsForRole.map(s => {
            const mentee = allUsersData[s.menteeId]?.employee;
            return {
                id: s.id,
                type: 'report' as const,
                menteeId: s.menteeId,
                menteeNip: mentee?.id || 'N/A',
                menteeName: s.menteeName,
                periode: `${new Date(s.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
                submittedAt: s.submittedAt ? new Date(s.submittedAt).getTime() : 0,
                monthKey: s.monthKey,
                status: s.status,
                notes: s.mentorNotes || s.supervisorNotes || s.kaUnitNotes || '-',
                canReview: (
                    (s.status === 'pending_mentor' && (s.mentorId === myId || mentee?.mentorId === myId) && !!loggedInEmployee.canBeMentor) ||
                    (s.status === 'pending_supervisor' && (s.supervisorId === myId || mentee?.supervisorId === myId) && !!loggedInEmployee.canBeSupervisor) ||
                    (s.status === 'pending_manager' && (s.managerId === myId || mentee?.managerId === myId) && !!loggedInEmployee.canBeManager) ||
                    (s.status === 'pending_kaunit' && (s.kaUnitId === myId || mentee?.kaUnitId === myId) && !!loggedInEmployee.canBeKaUnit)
                ),
                originalData: s
            };
        });

        // 2. Map Tadarus Requests
        const tadarus = (pendingTadarusRequests || [])
            .filter((r: any) => {
                const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';
                if (isAdmin) return true;

                const mentee = allUsersData[r.menteeId]?.employee;
                const isCurrentMentor = mentee && mentee.mentorId === myId;
                const isOriginalMentor = r.mentorId === myId;

                if (r.status === 'pending') {
                    return isCurrentMentor;
                }
                return isOriginalMentor || isCurrentMentor;
            })
            .map((r: any) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                return {
                    id: r.id,
                    type: 'tadarus' as const,
                    menteeId: r.menteeId,
                    menteeNip: mentee?.id || 'N/A',
                    menteeName: r.menteeName,
                    periode: `Tadarus/BBQ - ${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`,
                    submittedAt: r.requestedAt ? new Date(r.requestedAt).getTime() : new Date(r.date).getTime(),
                    monthKey: r.date.substring(0, 7),
                    status: r.status,
                    notes: r.notes || '-',
                    canReview: r.status === 'pending' && (allUsersData[r.menteeId]?.employee?.mentorId === myId || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin'),
                    originalData: r
                };
            });

        // 3. Map Missed Prayer Requests
        const missedPrayers = (pendingMissedPrayerRequests || [])
            .filter((r: any) => {
                const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';
                if (isAdmin) return true;

                const mentee = allUsersData[r.menteeId]?.employee;
                const isCurrentMentor = mentee && mentee.mentorId === myId;
                const isOriginalMentor = r.mentorId === myId;

                if (r.status === 'pending') {
                    return isCurrentMentor;
                }
                return isOriginalMentor || isCurrentMentor;
            })
            .map((r: any) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                return {
                    id: r.id,
                    type: 'prayer' as const,
                    menteeId: r.menteeId,
                    menteeNip: mentee?.id || 'N/A',
                    menteeName: r.menteeName,
                    periode: `Presensi Terlewat: ${r.prayerName} - ${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`,
                    submittedAt: r.requestedAt ? new Date(r.requestedAt).getTime() : new Date(r.date).getTime(),
                    monthKey: r.date.substring(0, 7),
                    status: r.status,
                    notes: r.reason || r.mentorNotes || '-',
                    canReview: r.status === 'pending' && (allUsersData[r.menteeId]?.employee?.mentorId === myId || loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin'),
                    originalData: r
                };
            });

        return [...reports, ...tadarus, ...missedPrayers].sort((a, b) => b.submittedAt - a.submittedAt);
    }, [submissionsForRole, pendingTadarusRequests, pendingMissedPrayerRequests, loggedInEmployee, allUsersData]);

    const filteredHistoryItems = useMemo(() => {
        return unifiedHistory.filter(item => {
            let statusMatch = false;
            const myId = loggedInEmployee.id;

            if (statusFilter === 'all') {
                statusMatch = true;
            } else if (statusFilter === 'pending') {
                statusMatch = item.canReview;
            } else if (statusFilter === 'approved') {
                if (item.type === 'report') {
                    const s = item.originalData as MonthlyReportSubmission;
                    const mentee = allUsersData[s.menteeId]?.employee;
                    statusMatch = s.status === 'approved' ||
                        ((s.mentorId === myId || mentee?.mentorId === myId) && ['pending_supervisor', 'pending_manager', 'pending_kaunit'].includes(s.status)) ||
                        ((s.supervisorId === myId || mentee?.supervisorId === myId) && ['pending_manager', 'pending_kaunit'].includes(s.status)) ||
                        ((s.kaUnitId === myId || mentee?.kaUnitId === myId) && ['pending_manager'].includes(s.status));
                } else {
                    statusMatch = item.status === 'approved';
                }
            } else if (statusFilter === 'rejected') {
                statusMatch = item.status.startsWith('rejected');
            }

            if (!statusMatch) return false;

            const [year, month] = item.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);

            return yearMatch && monthMatch;
        });
    }, [unifiedHistory, statusFilter, filterYear, filterMonth, loggedInEmployee, allUsersData]);

    const totalPages = Math.ceil(filteredHistoryItems.length / itemsPerPage);
    const paginatedHistoryItems = filteredHistoryItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, filterYear, filterMonth]);

    const menteeDataForDetail = selectedSubmission ? allUsersData[selectedSubmission.menteeId]?.employee : null;

    return (
        <div className="w-full animate-fade-in">
            {selectedSubmission && !menteeDataForDetail ? (
                <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-16 h-16 border-4 border-teal-400/20 border-t-teal-400 rounded-full animate-spin mb-4"></div>
                    <p className="text-blue-200 font-medium">Menyipakkan data laporan...</p>
                </div>
            ) : selectedSubmission && menteeDataForDetail ? (
                <div className="bg-gray-800 shadow-2xl rounded-2xl border border-white/10 p-4 sm:p-8">
                    <MenteeReportDetailView mentee={menteeDataForDetail} monthKey={selectedSubmission.monthKey} onBack={() => setSelectedSubmission(null)} dailyActivitiesConfig={dailyActivitiesConfig} />
                    {/* Review Actions - Only show if current user can review this particular status */}
                    {(() => {
                        const s = selectedSubmission;
                        const mentee = allUsersData[s.menteeId]?.employee;
                        const myId = loggedInEmployee.id;
                        const canReview = (
                            (s.status === 'pending_mentor' && (s.mentorId === myId || mentee?.mentorId === myId) && !!loggedInEmployee.canBeMentor) ||
                            (s.status === 'pending_supervisor' && (s.supervisorId === myId || mentee?.supervisorId === myId) && !!loggedInEmployee.canBeSupervisor) ||
                            (s.status === 'pending_manager' && (s.managerId === myId || mentee?.managerId === myId) && !!loggedInEmployee.canBeManager) ||
                            (s.status === 'pending_kaunit' && (s.kaUnitId === myId || mentee?.kaUnitId === myId) && !!loggedInEmployee.canBeKaUnit)
                        );

                        if (canReview) {
                            return (
                                <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 p-4 bg-black/40 rounded-xl border border-white/5 animate-fade-in">
                                    <button
                                        onClick={() => setRejectionTarget({ type: 'report', submission: selectedSubmission })}
                                        className="px-6 py-3 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <XIcon className="w-5 h-5" />
                                        Tolak Laporan
                                    </button>
                                    <button
                                        onClick={() => setApprovalTarget({ type: 'report', id: selectedSubmission.id })}
                                        className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                        Setujui Laporan
                                    </button>
                                </div>
                            );
                        } else {
                            // Show current status instead of buttons if already reviewed
                            return (
                                <div className="mt-8 flex justify-center p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex flex-col items-center">
                                        <span className="text-gray-400 text-xs uppercase font-black mb-2 opacity-60">Status Laporan Saat Ini</span>
                                        <span className={`px-4 py-2 rounded-full font-black text-sm uppercase tracking-wider shadow-lg
                                            ${s.status === 'approved' ? 'bg-green-600 text-white' :
                                                s.status.startsWith('rejected') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                            {s.status.replace(/_/g, ' ')}
                                        </span>
                                        <p className="mt-2 text-xs text-blue-200 opacity-70 italic text-center">
                                            Laporan ini sedang dalam tahap {s.status.split('_').pop()} atau sudah selesai diproses.
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                            Riwayat <span className="text-teal-400">Persetujuan</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusFilterButton filter="all" label="Semua" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="pending" label="Menunggu" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="approved" label="Disetujui" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="rejected" label="Ditolak" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:flex items-center gap-2">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full lg:w-40 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer">
                            <option value="all" className="text-black bg-white">Semua Tahun</option>
                            {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                        </select>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full lg:w-48 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer">
                            <option value="all" className="text-black bg-white">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month} className="text-black bg-white">{new Date(0, month - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none sm:rounded-xl border-y sm:border border-white/10 bg-black/20 min-h-[200px]">
                        <table className="min-w-full text-sm text-left text-white border-separate border-spacing-0">
                            <thead className="bg-gray-800/90 text-xs sm:text-sm uppercase text-teal-300 tracking-wider">
                                <tr>
                                    <th className="px-3 py-5 font-black border-b-2 border-teal-500/30 text-center whitespace-nowrap">No</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">NIP</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">NAMA</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">TIPE</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Periode Pengajuan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Tanggal Pengajuan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Catatan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 text-center whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedHistoryItems.length > 0 ? (
                                    paginatedHistoryItems.map((item, index) => (
                                        <tr key={`${item.type}-${item.id}`} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-3 py-4 text-center text-gray-500 font-mono text-xs whitespace-nowrap">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-sm text-white border-b border-white/5 whitespace-nowrap">
                                                {item.menteeNip}
                                            </td>
                                            <td className="px-4 py-4 font-semibold whitespace-nowrap text-white">
                                                {item.menteeName}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap border-b border-white/5">
                                                <span className={`text-xs uppercase font-black px-2 py-1 rounded w-fit tracking-tight
                                                        ${item.type === 'report' ? 'bg-blue-600 text-blue-50' :
                                                        item.type === 'tadarus' ? 'bg-indigo-600 text-indigo-50' :
                                                            'bg-purple-600 text-purple-50'}`}>
                                                    {item.type === 'report' ? 'Laporan' : item.type === 'tadarus' ? 'Tadarus/BBQ' : 'Presensi Terlewat'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-white font-bold text-xs border-b border-white/5 whitespace-nowrap">
                                                {item.periode}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-white font-medium text-xs border-b border-white/5">
                                                {item.submittedAt ? new Date(item.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-gray-100 text-xs leading-relaxed min-w-[200px] whitespace-nowrap border-b border-white/5">
                                                {item.notes}
                                            </td>
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                {item.type === 'report' ? (
                                                    <button onClick={() => setSelectedSubmission(item.originalData as MonthlyReportSubmission)} className="px-4 py-1.5 rounded-full font-bold text-xs bg-teal-500/10 hover:bg-teal-400 text-teal-400 hover:text-white border border-teal-500/30 transition-all active:scale-95 shadow-lg">
                                                        Tinjau
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.status === 'pending' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => setRejectionTarget({ type: item.type as any, id: item.id })}
                                                                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 rounded text-[10px] font-bold transition-all"
                                                                >
                                                                    Tolak
                                                                </button>
                                                                <button
                                                                    onClick={() => setApprovalTarget({ type: item.type as any, id: item.id })}
                                                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold shadow-md transition-all active:scale-95"
                                                                >
                                                                    Setujui
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className={`px-2 py-1.5 rounded text-xs font-black uppercase tracking-tight ${item.status === 'approved' ? 'bg-green-600 text-white border border-white/20' : 'bg-red-600 text-white border border-white/20'}`}>
                                                                {item.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-20">
                                            <div className="flex flex-col items-center opacity-40">
                                                <CheckCircle2 className="w-12 h-12 text-gray-400 mb-3" />
                                                <p className="text-lg text-gray-400 font-medium">Tidak ada data ditemukan.</p>
                                                <p className="text-sm text-gray-500 mt-1">Gunakan filter di atas untuk melihat data lainnya.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <SimplePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={filteredHistoryItems.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />

                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-300 uppercase tracking-widest font-black">
                            Total {filteredHistoryItems.length} data riwayat persetujuan
                        </p>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                onConfirm={handleConfirmApproval}
                title="Konfirmasi Persetujuan"
                message="Apakah Anda yakin ingin menyetujui pengajuan ini?"
                confirmText="Ya, Setujui"
                confirmColorClass="bg-green-600 hover:bg-green-500"
            />

            <RejectionModal
                isOpen={!!rejectionTarget}
                onClose={() => setRejectionTarget(null)}
                onSubmit={handleRejectSubmit}
                title="Tolak Pengajuan"
                prompt="Berikan alasan penolakan pengajuan ini."
            />
        </div >
    );
};
export default Persetujuan;
