import React, { useMemo, useState, Fragment, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { type Employee, MonthlyReportSubmission, TadarusSession, TadarusRequest, MissedPrayerRequest, MenteeTarget, Attendance, type DailyActivity } from '../types';
import {
    ArrowLeft,
    CheckSquare,
    Square,
    CalendarDays,
    FileDown,
    FileSpreadsheet,
    BarChart3,
    Users,
    UserPlus,
    BookOpen,
    Tag,
    Trash2,
    RefreshCw,
    Pencil,
    Calendar,
    Bell,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { generateOfficialPdf, ReportSection, TableConfig } from './ReportGenerator';
import { useUIStore } from '@/store/store';
import UniversalPersetujuan from './Persetujuan';
import { isAnyAdmin } from '@/lib/rolePermissions';
import SimplePagination from './SimplePagination';
import { QuranCompetencyAssessment } from './QuranCompetencyAssessment';
import { QuranCompetencySummaryDashboard } from './QuranCompetencySummaryDashboard';
import { GraduationCap } from 'lucide-react';

export type MentorDashboardView = 'overview' | 'mentees' | 'progress' | 'missed-requests' | 'laporan-bacaan' | 'persetujuan' | 'target' | 'sessions' | 'quran-competency' | 'quran-assessment';

interface MentorDashboardProps {
    employee: Employee;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, any>; }>;
    onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit' | 'manager') => void;
    tadarusSessions: TadarusSession[];
    tadarusRequests: TadarusRequest[];
    onCreateTadarusSession: (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => void;
    onUpdateTadarusSession: (sessionId: string, updates: Partial<TadarusSession>) => void;
    onDeleteTadarusSession: (sessionId: string) => void;
    onReviewTadarusRequest: (requestId: string, status: 'approved' | 'rejected') => void;
    missedPrayerRequests: MissedPrayerRequest[];
    onReviewMissedPrayerRequest: (requestId: string, status: "approved" | "rejected", mentorNotes?: string) => void;
    onMentorAttendOwnSession: (sessionId: string) => void;

    onDeleteMenteeTarget: (targetId: string) => void;
    addToast?: (message: string, type: 'success' | 'error') => void;

    mentorSubView: MentorDashboardView;
    setMentorSubView: React.Dispatch<React.SetStateAction<MentorDashboardView>>;
    menteesOfMentor: Employee[];

    // Target management
    targetMenteeId: string;
    setTargetMenteeId: React.Dispatch<React.SetStateAction<string>>;
    targetTitle: string;
    setTargetTitle: React.Dispatch<React.SetStateAction<string>>;
    targetDescription: string;
    setTargetDescription: React.Dispatch<React.SetStateAction<string>>;
    handleCreateTarget: (e: React.FormEvent) => void;
    setConfirmDeleteTarget: React.Dispatch<React.SetStateAction<MenteeTarget | null>>;
    menteeTargets: MenteeTarget[];
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    dailyActivitiesConfig: DailyActivity[];
}

const PREMIUM_COLORS = ['#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981'];

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmColorClass?: string;
    isLoading?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Ya, Konfirmasi", confirmColorClass = "bg-red-600 hover:bg-red-500", isLoading = false }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <div className="text-blue-200 mb-4">{message}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Batal</button>
                    <button onClick={onConfirm} disabled={isLoading} className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${confirmColorClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {isLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

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

// --- Sub-component for Detailed Mentee Progress Table ---
const MenteeDetailProgressView: React.FC<{
    mentee: Employee;
    monthKey: string;
    onBack?: () => void;
    mentees?: Employee[];
    currentMonth?: Date;
    onMonthChange?: (newDate: Date) => void;
    allUsersData?: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, any>; }>;
    loadDetailedEmployeeData?: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    dailyActivitiesConfig: DailyActivity[];
    onUpdateMentee: (userId: string, updates: Partial<Employee>) => void;
    assessorId: string;
}> = ({ mentees, currentMonth, onMonthChange, mentee, monthKey, onBack, allUsersData, loadDetailedEmployeeData, dailyActivitiesConfig, onUpdateMentee, assessorId }) => {
    const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(mentee?.id || (mentees && mentees.length > 0 ? mentees[0].id : null));
    const [isQuranModalOpen, setIsQuranModalOpen] = useState(false);

    const activeDate = useMemo(() => currentMonth || new Date(monthKey + '-02'), [currentMonth, monthKey]);
    const activeMonthKey = useMemo(() => `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}`, [activeDate]);
    const daysInMonth = useMemo(() => new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate(), [activeDate]);

    // 🔥 FIX: Load detailed data for selected mentee when selection changes
    // 🔥 FIX: Load detailed data for selected mentee and specific month
    useEffect(() => {
        if (selectedMenteeId && loadDetailedEmployeeData) {
            const m = activeDate.getMonth() + 1;
            const y = activeDate.getFullYear();
            console.log(`🔄[MenteeDetailProgressView] Loading detailed data for mentee: ${selectedMenteeId} (Month: ${m}/${y})`);
            loadDetailedEmployeeData(selectedMenteeId, m, y).catch(err => {
                console.error(`⚠️[MenteeDetailProgressView] Failed to load data for ${selectedMenteeId}: `, err);
            });
        }
    }, [selectedMenteeId, activeMonthKey, loadDetailedEmployeeData]);

    const selectedMentee = useMemo(() => {
        if (!selectedMenteeId) return mentee;
        // 🔥 FIX: Prefer enriched data from allUsersData to ensure monthlyActivities are present
        const enrichedMentee = allUsersData?.[selectedMenteeId]?.employee;
        return enrichedMentee ?? mentees?.find(m => m.id === selectedMenteeId) ?? mentee;
    }, [selectedMenteeId, mentees, mentee, allUsersData]);

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, DailyActivity[]>);
    }, [dailyActivitiesConfig]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (!onMonthChange || !currentMonth) return;
        const newDate = new Date(currentMonth);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
        onMonthChange(newDate);
    };

    const isNextMonthFuture = () => {
        if (!currentMonth) return false;
        const nextMonth = new Date(currentMonth);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
    };

    const enrichedProgress = useMemo(() => {
        if (!selectedMentee) return {};
        const baseProgress = selectedMentee.monthlyActivities?.[activeMonthKey] || {};
        const enriched = { ...baseProgress };

        // 1. Sync Manual Reports and cache
        const monthlyReports = (selectedMentee as any)._monthlyReportsDataCache?.[activeMonthKey] || {};
        Object.entries(monthlyReports).forEach(([dayKey, dayData]: [string, any]) => {
            if (!enriched[dayKey]) enriched[dayKey] = {};
            Object.assign(enriched[dayKey], dayData);
        });

        // 2. Sync Reading History (Books + Quran)
        if (selectedMentee.readingHistory) {
            selectedMentee.readingHistory.forEach(h => {
                if (h.dateCompleted.startsWith(activeMonthKey)) {
                    const day = h.dateCompleted.substring(8, 10);
                    if (!enriched[day]) enriched[day] = {};
                    enriched[day]['baca_alquran_buku'] = true;
                }
            });
        }
        if (selectedMentee.quranReadingHistory) {
            selectedMentee.quranReadingHistory.forEach((h: any) => {
                const date = h.date || h.dateCompleted;
                if (date?.startsWith(activeMonthKey)) {
                    const day = date.substring(8, 10);
                    if (!enriched[day]) enriched[day] = {};
                    enriched[day]['baca_alquran_buku'] = true;
                }
            });
        }

        return enriched;
    }, [selectedMentee, activeMonthKey]);

    const activityProgressCounts = useMemo(() => {
        if (!selectedMentee) return {};

        // Special count for reading
        let totalReadingCount = 0;
        if (selectedMentee.readingHistory) {
            totalReadingCount += selectedMentee.readingHistory.filter(h => h.dateCompleted.startsWith(activeMonthKey)).length;
        }
        if (selectedMentee.quranReadingHistory) {
            selectedMentee.quranReadingHistory.forEach((h: any) => {
                const date = h.date || h.dateCompleted;
                if (date?.startsWith(activeMonthKey)) totalReadingCount++;
            });
        }

        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (activity.id === 'baca_alquran_buku') {
                acc[activity.id] = totalReadingCount;
            } else {
                acc[activity.id] = Object.values(enrichedProgress).reduce((dayCount, dailyProgress) => dayCount + ((dailyProgress as any)[activity.id] ? 1 : 0), 0);
            }
            return acc;
        }, {} as Record<string, number>);
    }, [enrichedProgress, selectedMentee, dailyActivitiesConfig, activeMonthKey]);

    const chartSummaryData = useMemo(() => {
        if (!selectedMentee) return [];
        return dailyActivitiesConfig.map(activity => {
            const capaian = activityProgressCounts[activity.id] || 0;
            const percentage = activity.monthlyTarget > 0 ? Math.min(100, Math.round((capaian / activity.monthlyTarget) * 100)) : 0;
            return {
                name: activity.title,
                percentage: percentage,
            };
        });
    }, [selectedMentee, activityProgressCounts, dailyActivitiesConfig]);

    return (
        <div className="animate-view-change bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-all shadow-lg">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Kembali</span>
                        </button>
                    )}
                    <div className={`${onBack ? 'border-l-4 border-teal-400 pl-4' : ''} `}>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">
                            {onBack ? 'Detail Laporan Aktivitas' : 'Detail Progres Anggota'}
                        </h3>
                        {selectedMentee && (
                            <p className="text-base sm:text-lg text-teal-200">
                                {selectedMentee.name} - {activeDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {mentees && mentees.length > 0 && (
                    <div className="w-full md:w-auto grow md:grow-0 flex items-center gap-4">
                        <div className="w-full md:w-56">
                            <select
                                value={selectedMenteeId || ''}
                                onChange={(e) => setSelectedMenteeId(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                            >
                                {mentees.map(m => <option key={m.id} value={m.id} className="text-black bg-white">{m.name}</option>)}
                            </select>
                        </div>
                        <div className="shrink-0 flex items-center justify-between bg-black/20 p-1 rounded-full w-auto">
                            <button onClick={() => navigateMonth('prev')} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">&larr;</button>
                            <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">&rarr;</button>
                        </div>
                        <button
                            onClick={() => setIsQuranModalOpen(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 rounded-full transition-all text-sm font-semibold"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Penilaian Al-Qur'an</span>
                            <span className="sm:hidden">Penilaian</span>
                        </button>
                    </div>
                )}
            </div>

            {isQuranModalOpen && selectedMentee && (
                <QuranCompetencyAssessment
                    mentee={selectedMentee}
                    assessorId={assessorId}
                    onClose={() => setIsQuranModalOpen(false)}
                    onUpdateMentee={onUpdateMentee}
                />
            )}

            {/* 🔥 Quran Competency Summary Bar */}
            {selectedMentee && selectedMentee.quranCompetency && (
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 mr-4">
                        <BookOpen className="w-5 h-5 text-teal-400" />
                        <span className="text-sm font-bold text-white uppercase tracking-tight">Kompetensi Al-Qur'an:</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { label: 'Baca', code: selectedMentee.quranCompetency.readingLevel, color: 'text-emerald-400' },
                            { label: 'Tajwid', code: selectedMentee.quranCompetency.tajwidLevel, color: 'text-blue-400' },
                            { label: 'Hafalan', code: selectedMentee.quranCompetency.memorizationLevel, color: 'text-purple-400' },
                            { label: 'Adab', code: selectedMentee.quranCompetency.understandingLevel, color: 'text-amber-400' }
                        ].map(stat => (
                            <div key={stat.label} className="bg-black/30 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                                <span className="text-[10px] text-white/50 font-bold uppercase">{stat.label}:</span>
                                <span className={`text-xs font-mono font-bold ${stat.color}`}>{stat.code}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedMentee ? (
                <>
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
                                            <td colSpan={daysInMonth + 2} className="px-3 py-2 font-bold text-teal-200 sticky left-0 z-10 bg-gray-700">
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
                                                    const isChecked = (enrichedProgress[day] as any)?.[activity.id] || false;
                                                    return (
                                                        <td key={day} className="text-center border-l border-gray-700">
                                                            <div className="w-full h-full flex items-center justify-center py-3">
                                                                {isChecked ? (
                                                                    <CheckSquare className="w-6 h-6 text-teal-400" />
                                                                ) : (
                                                                    <Square className="w-6 h-6 text-gray-600" />
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
                    <div className="mt-8 pt-8 border-t border-white/20">
                        <h4 className="text-xl font-semibold text-white mb-4 text-center">
                            Grafik Rangkuman Capaian Bulanan
                        </h4>

                        {/* Mobile scroll indicator */}
                        <div className="md:hidden text-center text-xs text-blue-200 mb-2 flex items-center justify-center gap-2">
                            <span>← Geser kiri/kanan untuk melihat grafik →</span>
                        </div>

                        {/* Scrollable container for mobile */}
                        {chartSummaryData && chartSummaryData.length > 0 ? (
                            <div className="overflow-x-auto pb-4 -mx-2 px-2 md:overflow-x-visible md:mx-0 md:px-0">
                                <div className="min-w-[700px] md:min-w-0 w-full" style={{ height: 500, minHeight: 500 }}>
                                    <ResponsiveContainer width="100%" height={500} minHeight={500}>
                                        <BarChart
                                            layout="vertical"
                                            data={chartSummaryData}
                                            margin={{ top: 5, right: 40, left: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} tickFormatter={(tick) => `${tick}% `} />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={150} tick={{ fontSize: 11 }} interval={0} />
                                            <Bar dataKey="percentage" name="Capaian" isAnimationActive={false} barSize={20}>
                                                <LabelList dataKey="percentage" position="right" fill="#e2e8f0" fontSize={11} formatter={(value: unknown) => {
                                                    const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) : 0;
                                                    return (typeof numValue === 'number' && numValue > 0) ? `${numValue}% ` : '';
                                                }} />
                                                {chartSummaryData.map((entry, index) => (
                                                    <Cell key={`cell - ${index} `} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-blue-200">
                                Tidak ada data untuk ditampilkan
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-10 bg-black/20 rounded-lg">
                    <p className="text-lg text-blue-200">Pilih anggota bimbingan</p>
                </div>
            )}
        </div>
    );
};

const TadarusSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => void;
    onUpdate: (id: string, updates: Partial<TadarusSession>) => void;
    existingSession: TadarusSession | null;
    mentees: Employee[];
    mentorId: string;
}> = ({ isOpen, onClose, onSave, onUpdate, existingSession, mentees, mentorId }) => {
    const { addToast } = useUIStore();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [category, setCategory] = useState<'UMUM' | 'BBQ'>('BBQ');
    const [isRecurring, setIsRecurring] = useState(false);
    const [notes, setNotes] = useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (existingSession) {
                setTitle(prev => {
                    if (prev !== existingSession.title) return existingSession.title;
                    return prev;
                });
                setDate(prev => {
                    if (prev !== existingSession.date) return existingSession.date;
                    return prev;
                });
                setStartTime(prev => {
                    if (prev !== (existingSession.startTime || '08:00')) return existingSession.startTime || '08:00';
                    return prev;
                });
                setEndTime(prev => {
                    if (prev !== (existingSession.endTime || '09:00')) return existingSession.endTime || '09:00';
                    return prev;
                });
                setCategory(prev => {
                    if (prev !== existingSession.category) return existingSession.category;
                    return prev;
                });
                setIsRecurring(prev => {
                    const newValue = !!existingSession.isRecurring;
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setNotes(prev => {
                    const newValue = existingSession.notes || '';
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setSelectedParticipantIds(prev => {
                    const newValue = new Set(existingSession.participantIds);
                    // Compare sets for equality
                    if (prev.size !== newValue.size || ![...prev].every(id => newValue.has(id))) {
                        return newValue;
                    }
                    return prev;
                });
            } else {
                setTitle(prev => {
                    const newValue = 'Sesi Bimbingan Baca Al-Qur\'an (BBQ)';
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setDate(prev => {
                    const newValue = new Date().toISOString().split('T')[0];
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setStartTime(prev => {
                    if (prev !== '08:00') return '08:00';
                    return prev;
                });
                setEndTime(prev => {
                    if (prev !== '09:00') return '09:00';
                    return prev;
                });
                setCategory(prev => {
                    if (prev !== 'BBQ') return 'BBQ';
                    return prev;
                });
                setIsRecurring(prev => {
                    if (prev !== false) return false;
                    return prev;
                });
                setNotes(prev => {
                    if (prev !== '') return '';
                    return prev;
                });
                setSelectedParticipantIds(prev => {
                    const newValue = new Set(mentees.map(m => m.id)); // Pre-select all mentees
                    // Compare sets for equality
                    if (prev.size !== newValue.size || ![...prev].every(id => newValue.has(id))) {
                        return newValue;
                    }
                    return prev;
                });
            }
        }
    }, [isOpen, existingSession, mentees]);

    const handleSubmit = () => {
        if (!title || !date) {
            addToast("Judul dan Tanggal wajib diisi.", 'error');
            return;
        }

        const payload: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'> = {
            title, date, startTime, endTime, category, notes, isRecurring,
            mentorId,
            participantIds: Array.from(selectedParticipantIds),
            status: 'open'
        };

        if (existingSession) {
            onUpdate(existingSession.id, payload);
        } else {
            onSave(payload);
        }
        onClose();
    };

    const handleParticipantToggle = (id: string) => {
        setSelectedParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredMentees = useMemo(() => {
        if (!participantSearch) return mentees;
        return mentees.filter(m => m.name.toLowerCase().includes(participantSearch.toLowerCase()));
    }, [mentees, participantSearch]);

    if (!isOpen) return null;

    const formElementClasses = "w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">{existingSession ? 'Edit Sesi Bimbingan' : 'Jadwalkan Sesi Bimbingan Baru'}</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul Sesi" className={formElementClasses} />
                    <div className="grid grid-cols-3 gap-4">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                    </div>
                    <select value={category} onChange={e => setCategory(e.target.value as 'UMUM' | 'BBQ')} className={formElementClasses}>
                        <option value="BBQ" className="bg-white text-black">Bimbingan Baca Qur'an (BBQ)</option>
                        <option value="UMUM" className="bg-white text-black">Tadarus Umum</option>
                    </select>
                    {!existingSession && (
                        <label className="flex items-center gap-2 text-white">
                            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                            Ulangi setiap minggu pada bulan ini
                        </label>
                    )}
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan (opsional)" rows={3} className={formElementClasses}></textarea>

                    <div>
                        <h4 className="font-semibold text-white mb-2">Pilih Peserta</h4>
                        <input type="search" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} placeholder="Cari anggota..." className={`${formElementClasses} mb - 2`} />
                        <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-black/20 rounded-md">
                            {filteredMentees.map(mentee => (
                                <label key={mentee.id} className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-md cursor-pointer">
                                    <input type="checkbox" checked={selectedParticipantIds.has(mentee.id)} onChange={() => handleParticipantToggle(mentee.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                    <span className="text-white text-base">{mentee.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const MenteeManagement: React.FC<{
    mentees: Employee[];
    allUsers: Employee[];
    mentorId: string;
    onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
    addToast?: (message: string, type: 'success' | 'error') => void;
}> = ({ mentees, allUsers, mentorId, onUpdateProfile, addToast }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState('all');
    const [professionFilter, setProfessionFilter] = useState('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: React.ReactNode; onConfirm: () => void; } | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(mentees.length / itemsPerPage);
    const paginatedMentees = mentees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const unassignedUsers = useMemo(() => {
        return allUsers
            .filter(u => !u.mentorId && u.id !== mentorId && !u.canBeMentor)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, mentorId]);

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

    const handleAddMentees = async () => {
        setIsProcessing(true);
        try {
            const selectedIds = Array.from(selectedToAdd);
            let successCount = 0;
            let failCount = 0;

            for (const id of selectedIds) {
                const result = await onUpdateProfile(id, { mentorId });
                // Assuming onUpdateProfile returns true on success, or undefined/void if not handled explicitly
                if (result !== false) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            // Close modal and reset selection
            setIsAddModalOpen(false);
            setSelectedToAdd(new Set());

            // Show success message
            if (successCount > 0 && failCount === 0) {
                addToast?.(`${successCount} anggota bimbingan berhasil ditambahkan!`, 'success');
            } else if (successCount > 0 && failCount > 0) {
                addToast?.(`${successCount} berhasil, ${failCount} gagal ditambahkan`, 'error');
            } else if (failCount > 0) {
                addToast?.(`Gagal menambahkan ${failCount} anggota bimbingan`, 'error');
            }
        } catch (error) {
            console.error("Error adding mentees:", error);
            addToast?.("Terjadi kesalahan saat menambahkan anggota.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const initiateRemoveMentee = (mentee: Employee) => {
        setConfirmation({
            isOpen: true,
            title: 'Konfirmasi Hapus Anggota',
            message: <>Apakah Anda yakin ingin menghapus <strong>{mentee.name}</strong> dari daftar bimbingan Anda?</>,
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    await onUpdateProfile(mentee.id, { mentorId: null });
                    setConfirmation(null);
                    addToast?.(`Berhasil menghapus ${mentee.name} `, 'success');
                } catch (error) {
                    console.error("Error removing mentee:", error);
                    addToast?.("Gagal menghapus anggota.", 'error');
                } finally {
                    setIsProcessing(false);
                }
            },
        });
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Kelola Anggota Bimbingan</h3>
                <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 text-sm">
                    <UserPlus className="w-5 h-5" />
                    Tambah Anggota
                </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Nama Anggota</th>
                            <th className="px-4 py-3 whitespace-nowrap">Unit Kerja</th>
                            <th className="px-4 py-3 whitespace-nowrap">Profesi</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedMentees.map(mentee => (
                            <tr key={mentee.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{mentee.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{mentee.unit}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{mentee.profession}</td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <button
                                        onClick={() => initiateRemoveMentee(mentee)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 group"
                                        title="Hapus Anggota"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {mentees.length === 0 && (
                            <tr><td colSpan={4} className="text-center p-8 text-blue-200">Anda belum memiliki anggota bimbingan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={mentees.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                label={`Total ${mentees.length} anggota bimbingan aktif`}
            />

            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400 italic">
                    Total {mentees.length} anggota bimbingan aktif
                </p>
            </div>

            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-white/20 flex flex-col h-[90vh]">
                        <h3 className="text-lg font-bold text-white mb-4">Tambah Anggota Bimbingan Baru</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NIP..." className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                            <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                                {uniqueUnits.map(u => <option key={u} value={u} className="bg-white text-black">{u === 'all' ? 'Semua Unit' : u}</option>)}
                            </select>
                            <select value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                                {uniqueProfessions.map(p => <option key={p} value={p} className="bg-white text-black">{p === 'all' ? 'Semua Profesi' : p}</option>)}
                            </select>
                        </div>
                        <div className="grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/20">
                            {filteredUnassigned.map(user => (
                                <label key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                    <input type="checkbox" checked={selectedToAdd.has(user.id)} onChange={() => toggleSelection(user.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                    <div>
                                        <span className="text-white font-medium">{user.name}</span>
                                        <span className="text-xs text-gray-400 ml-2">({user.profession}, {user.unit})</span>
                                    </div>
                                </label>
                            ))}
                            {filteredUnassigned.length === 0 && <p className="text-center text-gray-400 p-4">Tidak ada karyawan yang tersedia.</p>}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <p className="text-sm text-blue-200">Terpilih: {selectedToAdd.size} orang</p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAddModalOpen(false)} disabled={isProcessing} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold disabled:opacity-50">Batal</button>
                                <button onClick={handleAddMentees} disabled={selectedToAdd.size === 0 || isProcessing} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:bg-gray-500 flex items-center gap-2">
                                    {isProcessing && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                                    Tambahkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
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
                    isLoading={isProcessing}
                />
            )}
        </div>
    );
};

const ReadingReportView: React.FC<{ mentees: Employee[], mentorName: string }> = ({ mentees, mentorName }) => {
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const MONTHS = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return ['all', currentYear - 1, currentYear, currentYear + 1].map(String);
    }, []);

    const allReadings = useMemo(() => {
        const readings: { menteeName: string; date: string; type: 'Buku' | 'Al-Qur\'an'; detail: string; }[] = [];
        mentees.forEach(mentee => {
            // Filter by name first for efficiency
            if (searchTerm && !mentee.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

            (mentee.readingHistory || []).forEach(r => {
                const readingDate = new Date(r.dateCompleted);
                const month = (readingDate.getMonth() + 1).toString();
                const year = readingDate.getFullYear().toString();

                if ((filterMonth === 'all' || month === filterMonth) &&
                    (filterYear === 'all' || year === filterYear)) {
                    readings.push({
                        menteeName: mentee.name,
                        date: r.dateCompleted,
                        type: 'Buku',
                        detail: r.bookTitle,
                    });
                }
            });
            (mentee.quranReadingHistory || []).forEach(r => {
                const readingDate = new Date(r.date);
                const month = (readingDate.getMonth() + 1).toString();
                const year = readingDate.getFullYear().toString();

                if ((filterMonth === 'all' || month === filterMonth) &&
                    (filterYear === 'all' || year === filterYear)) {
                    readings.push({
                        menteeName: mentee.name,
                        date: r.date,
                        type: 'Al-Qur\'an',
                        detail: `QS.${r.surahName} [${r.surahNumber}: ${r.startAyah} - ${r.endAyah}]`,
                    });
                }
            });
        });
        return readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [mentees, filterMonth, filterYear, searchTerm]);

    // Pagination logic
    const ITEMS_PER_PAGE = 15;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(allReadings.length / ITEMS_PER_PAGE);

    const paginatedReadings = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return allReadings.slice(start, start + ITEMS_PER_PAGE);
    }, [allReadings, currentPage]);

    // Reset to first page when filtering or searching
    useEffect(() => {
        setCurrentPage(1);
    }, [filterMonth, filterYear, searchTerm]);

    const handleExport = (format: 'pdf' | 'xlsx') => {
        const monthLabel = filterMonth === 'all' ? 'Semua_Bulan' : MONTHS[parseInt(filterMonth) - 1];
        const yearLabel = filterYear === 'all' ? 'Semua_Tahun' : filterYear;
        const nameLabel = searchTerm ? `_Nama_${searchTerm.replace(/\s/g, '_')} ` : '';
        const fileName = `laporan_bacaan_bimbingan_${mentorName.replace(/\s/g, '_')}${nameLabel}_${monthLabel}_${yearLabel}_${new Date().toISOString().split('T')[0]} `;
        const tableHeader = ["Tanggal", "Nama Anggota", "Jenis Bacaan", "Detail"];
        const tableBody = allReadings.map(r => [
            new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID'),
            r.menteeName,
            r.type,
            r.detail,
        ]);

        if (format === 'xlsx') {
            const ws = XLSX.utils.aoa_to_sheet([tableHeader, ...tableBody]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan Bacaan");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
            const tableConfig: TableConfig = {
                head: [tableHeader],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] },
            };
            const reportSection: ReportSection = {
                title: "LAPORAN BACAAN ANGGOTA BIMBINGAN",
                subtitle: `Mentor: ${mentorName} | Periode: ${monthLabel} ${yearLabel}${searchTerm ? ` | Nama: ${searchTerm}` : ''} `,
                tables: [tableConfig],
            };
            generateOfficialPdf([reportSection], `${fileName}.pdf`, 'save', mentorName);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative grow md:grow-0">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/40" />
                        <input
                            type="text"
                            placeholder="Cari nama anggota..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-transparent text-white text-xs sm:text-sm p-1.5 focus:outline-none"
                        >
                            <option value="all" className="bg-slate-800 text-white">Semua Bulan</option>
                            {MONTHS.map((m, i) => (
                                <option key={i} value={(i + 1).toString()} className="bg-slate-800 text-white">{m}</option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-white/10"></div>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-transparent text-white text-xs sm:text-sm p-1.5 focus:outline-none"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="bg-slate-800 text-white">{y === 'all' ? 'Semua Tahun' : y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <button onClick={() => handleExport('pdf')} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all disabled:opacity-20 group border border-red-500/20 shadow-sm" title="Unduh PDF">
                        <FileDown className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button onClick={() => handleExport('xlsx')} className="p-2.5 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all disabled:opacity-20 group border border-green-500/20 shadow-sm" title="Unduh Excel">
                        <FileSpreadsheet className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/5 text-xs uppercase text-blue-200 border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap font-bold">Tanggal</th>
                            <th className="px-4 py-3 whitespace-nowrap font-bold">Nama Anggota</th>
                            <th className="px-4 py-3 whitespace-nowrap font-bold text-center">Jenis</th>
                            <th className="px-4 py-3 whitespace-nowrap font-bold">Detail Bacaan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedReadings.map((reading, index) => (
                            <tr key={index} className="hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-3 whitespace-nowrap text-blue-100/70">{new Date(reading.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap text-teal-300 group-hover:text-teal-200 transition-colors">{reading.menteeName}</td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <span className={`px - 2.5 py - 1 rounded - full text - [10px] font - black uppercase tracking - widest ${reading.type === 'Al-Qur\'an' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'} `}>
                                        {reading.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-white/80 group-hover:text-white transition-colors">{reading.detail}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {allReadings.length === 0 && (
                    <div className="text-center py-20 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
                            <BookOpen className="w-10 h-10 text-white/10" />
                        </div>
                        <h4 className="text-white font-bold mb-2">Tidak Ada Data</h4>
                        <p className="text-blue-200/40 text-sm max-w-xs mx-auto italic">
                            {searchTerm
                                ? `Tidak ditemukan laporan bacaan untuk "${searchTerm}" pada periode ini.`
                                : "Belum ada laporan bacaan dari anggota bimbingan untuk periode terpilih."}
                        </p>
                    </div>
                )}
            </div>

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={allReadings.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                label={`Total ${allReadings.length} data laporan bacaan`}
            />

            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Total {allReadings.length} data laporan bacaan
                </p>
            </div>
        </div>
    );
};

interface TargetManagementProps {
    mentees: Employee[];
    targetMenteeId: string;
    setTargetMenteeId: (id: string) => void;
    targetTitle: string;
    setTargetTitle: (title: string) => void;
    targetDescription: string;
    setTargetDescription: (desc: string) => void;
    handleCreateTarget: (e: React.FormEvent) => void;
    menteeTargets: MenteeTarget[];
    setConfirmDeleteTarget: (target: MenteeTarget | null) => void;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance>; }>;
}

const TargetManagement: React.FC<TargetManagementProps> = ({
    mentees,
    targetMenteeId,
    setTargetMenteeId,
    targetTitle,
    setTargetTitle,
    targetDescription,
    setTargetDescription,
    handleCreateTarget,
    menteeTargets,
    setConfirmDeleteTarget,
    allUsersData
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-black/20 p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Buat Target Baru</h3>
                <form onSubmit={handleCreateTarget} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Pilih Anggota Bimbingan</label>
                        <select
                            value={targetMenteeId}
                            onChange={(e) => setTargetMenteeId(e.target.value)}
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        >
                            <option value="" disabled className="bg-white text-black">-- Pilih Anggota --</option>
                            {mentees.map(mentee => (
                                <option key={mentee.id} value={mentee.id} className="bg-white text-black">{mentee.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Judul Target</label>
                        <input
                            type="text"
                            value={targetTitle}
                            onChange={(e) => setTargetTitle(e.target.value)}
                            placeholder="Contoh: Selesaikan Juz Amma"
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Deskripsi (Opsional)</label>
                        <textarea
                            value={targetDescription}
                            onChange={(e) => setTargetDescription(e.target.value)}
                            rows={3}
                            placeholder="Detail atau catatan tambahan..."
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        ></textarea>
                    </div>
                    <div className="text-right">
                        <button type="submit" className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg">
                            Tetapkan Target
                        </button>
                    </div>
                </form>
            </div>
            <div className="bg-black/20 p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Daftar Target Bulan Ini</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {menteeTargets.length > 0 ? (
                        menteeTargets.map(target => (
                            <div key={target.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white">{target.title}</p>
                                    <p className="text-xs text-gray-400">Untuk: {allUsersData[target.menteeId]?.employee.name || 'N/A'}</p>
                                    {target.status === 'completed' && <p className="text-xs text-green-400">Selesai pada: {new Date(target.completedAt!).toLocaleDateString('id-ID')}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px - 2 py - 1 rounded - full text - xs font - semibold ${target.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'} `}>
                                        {target.status === 'completed' ? 'Selesai' : 'Berjalan'}
                                    </span>
                                    <button
                                        onClick={() => setConfirmDeleteTarget(target)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 group"
                                        title="Hapus Target"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-blue-200">
                            Belum ada target yang dibuat bulan ini.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PersetujuanProps {
    pendingMentorReviews: MonthlyReportSubmission[];
    pendingTadarusRequests: TadarusRequest[];
    pendingMissedPrayerRequests: MissedPrayerRequest[];
    onReviewTadarusRequest: (requestId: string, status: "approved" | "rejected") => void;
    onApproveMissedRequest: (id: string) => void;
    onRejectMissedRequest: (id: string) => void;
    onViewReport: (submission: MonthlyReportSubmission) => void;
    filteredItems: any[]; // Unified items for the table
    statusFilter: 'all' | 'pending' | 'approved' | 'rejected';
    setStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>;
    filterYear: string;
    setFilterYear: React.Dispatch<React.SetStateAction<string>>;
    availableYears: string[];
    filterMonth: string;
    setFilterMonth: React.Dispatch<React.SetStateAction<string>>;
}

const StatusFilterButton: React.FC<{
    filter: 'all' | 'pending' | 'approved' | 'rejected',
    label: string,
    currentFilter: 'all' | 'pending' | 'approved' | 'rejected',
    setFilter: React.Dispatch<React.SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>
}> = ({ filter, label, currentFilter, setFilter }) => (
    <button onClick={() => setFilter(filter)} className={`px - 3 py - 1.5 sm: px - 4 sm: py - 2 text - xs sm: text - sm font - semibold rounded - full transition - colors duration - 200 ${currentFilter === filter ? 'bg-teal-500 text-white' : 'bg-gray-700/50 text-blue-200 hover:bg-gray-700'} `}>
        {label}
    </button>
);

const Persetujuan: React.FC<PersetujuanProps> = ({
    pendingMentorReviews,
    pendingTadarusRequests,
    pendingMissedPrayerRequests,
    onReviewTadarusRequest,
    onApproveMissedRequest,
    onRejectMissedRequest,
    onViewReport,
    filteredItems,
    statusFilter, setStatusFilter,
    filterYear, setFilterYear, availableYears,
    filterMonth, setFilterMonth
}) => {

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Riwayat Tinjauan Laporan</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-black/20 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-full self-start flex-wrap">
                        <StatusFilterButton filter="all" label="Semua" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="pending" label="Menunggu" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="approved" label="Disetujui" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="rejected" label="Ditolak" currentFilter={statusFilter} setFilter={setStatusFilter} />
                    </div>
                    <div className="grow grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="overflow-x-auto rounded-lg border border-white/20">
                    <table className="min-w-full text-sm text-left text-white">
                        <thead className="bg-white/10 text-xs uppercase text-blue-200">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                                <th className="px-4 py-3 whitespace-nowrap">Keterangan / Periode</th>
                                <th className="px-4 py-3 whitespace-nowrap">Tanggal Pengajuan</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={`${item.type} -${item.id} `} className="border-b border-gray-700 hover:bg-white/5">
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{item.menteeName}</span>
                                            <span className={`text - [10px] uppercase font - bold px - 1.5 py - 0.5 rounded w - fit mt - 1 
                                                ${item.type === 'report' ? 'bg-blue-500/20 text-blue-300' :
                                                    item.type === 'tadarus' ? 'bg-teal-500/20 text-teal-300' :
                                                        'bg-purple-500/20 text-purple-300'
                                                } `}>
                                                {item.type === 'report' ? 'Laporan' : item.type === 'tadarus' ? 'Tadarus/BBQ' : 'Presensi Terlewat'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">{item.periode}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString('id-ID') : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {item.type === 'report' ? (
                                            <button onClick={() => onViewReport(item.originalData)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                                                Lihat Detail
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                {item.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => item.type === 'tadarus' ? onReviewTadarusRequest(item.id, 'rejected') : onRejectMissedRequest(item.id)}
                                                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                                                        >
                                                            Tolak
                                                        </button>
                                                        <button
                                                            onClick={() => item.type === 'tadarus' ? onReviewTadarusRequest(item.id, 'approved') : onApproveMissedRequest(item.id)}
                                                            className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-bold"
                                                        >
                                                            Setujui
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`px - 2 py - 1 rounded text - [10px] font - bold ${item.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} `}>
                                                        {item.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-blue-200">Tidak ada pengajuan untuk filter ini.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

interface SesiBimbinganProps {
    upcomingSessions: TadarusSession[];
    employee: Employee;
    onMentorAttendOwnSession: (sessionId: string) => void;
    onDeleteSession: (session: TadarusSession) => void;
    onEditSession: (session: TadarusSession) => void;
    onNewSession: () => void;
}

const SesiBimbingan: React.FC<SesiBimbinganProps> = ({
    upcomingSessions,
    employee: _employee,
    onMentorAttendOwnSession,
    onDeleteSession,
    onEditSession,
    onNewSession
}) => {

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Sesi Bimbingan Terjadwal</h3>
                <button onClick={onNewSession} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                    <CalendarDays className="w-5 h-5" />
                    Jadwalkan Sesi Baru
                </button>
            </div>
            {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                    {upcomingSessions.map(session => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isToday = session.date === todayStr;
                        return (
                            <div key={session.id} className="bg-black/20 p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <p className="font-semibold text-white">{session.title}</p>
                                    <p className="text-sm text-blue-200">
                                        {new Date(session.date + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}
                                        <span className="text-gray-400 mx-2">|</span>
                                        {session.startTime} - {session.endTime}
                                    </p>
                                    <p className="text-xs text-purple-300 mt-1 font-semibold">{session.category}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                    {isToday && !session.mentorPresent && (
                                        <button onClick={() => onMentorAttendOwnSession(session.id)} className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-md">Hadir</button>
                                    )}
                                    {session.mentorPresent && <span className="px-3 py-1.5 text-xs font-semibold bg-green-500/30 text-green-300 rounded-md">Sudah Hadir</span>}
                                    <button
                                        onClick={() => onEditSession(session)}
                                        className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl transition-all border border-blue-500/30 hover:border-blue-400 shadow-lg hover:shadow-blue-500/20 active:scale-95 group"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteSession(session)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 group"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-black/20 rounded-lg">
                    <p className="text-lg text-blue-200">Belum ada sesi bimbingan</p>
                </div>
            )}
        </div>
    );
};

const SubTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    icon: any;
    count?: number;
}> = ({ active, onClick, label, icon: Icon, count }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all duration-300 ease-in-out text-sm relative whitespace-nowrap shrink-0 overflow-visible
          ${active
                ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
        {count !== undefined && count > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center gap-0.5 h-6 min-w-[24px] px-1.5 rounded-full bg-linear-to-br from-red-500 to-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/50 animate-pulse border-2 border-white/20">
                <Bell className="w-3 h-3" />
                <span>{count}</span>
            </span>
        )}
    </button>
);

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
    employee,
    allUsersData,
    onUpdateProfile,
    monthlyReportSubmissions,
    onReviewReport,
    tadarusSessions,
    tadarusRequests,
    onCreateTadarusSession,
    onUpdateTadarusSession,
    onDeleteTadarusSession,
    onReviewTadarusRequest,
    missedPrayerRequests,
    onReviewMissedPrayerRequest,
    onMentorAttendOwnSession,
    addToast,
    mentorSubView,
    setMentorSubView,
    menteesOfMentor,
    targetMenteeId,
    setTargetMenteeId,
    targetTitle,
    setTargetTitle,
    targetDescription,
    setTargetDescription,
    handleCreateTarget,
    setConfirmDeleteTarget,
    menteeTargets,
    loadDetailedEmployeeData,
    dailyActivitiesConfig,
}) => {

    // Unified state for confirmations
    const [approvalTarget, setApprovalTarget] = useState<{ type: 'missed-prayer', id: string } | { type: 'report', id: string } | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<{ type: 'missed-prayer', id: string } | { type: 'report', submission: MonthlyReportSubmission } | null>(null);
    const [pendingSessionDelete, setPendingSessionDelete] = useState<TadarusSession | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<MonthlyReportSubmission | null>(null);

    // State for Tadarus session modal
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<TadarusSession | null>(null);

    // State for detailed progress view
    const [progressViewMonth, setProgressViewMonth] = useState(new Date());

    // State for Approval History filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [assessmentMentee, setAssessmentMentee] = useState<Employee | null>(null);



    const mentees = useMemo(() => {
        return menteesOfMentor.map(m => allUsersData[m.id]?.employee || m);
    }, [menteesOfMentor, allUsersData]);

    // 🔥 AUTO-LOAD: Pre-load detailed data for all mentees when progress or reading tabs are opened
    // This ensures monthlyActivities and reading history are fresh and ready for display
    useEffect(() => {
        const needsDetailedData = mentorSubView === 'progress' || mentorSubView === 'laporan-bacaan';
        if (needsDetailedData && loadDetailedEmployeeData && mentees.length > 0) {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            console.log(`🔄[MentorDashboard] Pre - loading current month data for ${mentees.length} mentees(tab: ${mentorSubView})`);
            mentees.forEach(mentee => {
                loadDetailedEmployeeData(mentee.id, currentMonth, currentYear).catch(err => {
                    console.error(`⚠️ Failed to load detailed data for ${mentee.name}: `, err);
                });
            });
        }
    }, [mentorSubView, mentees.length, loadDetailedEmployeeData]);

    const pendingTadarusRequests = useMemo(() => {
        return tadarusRequests.filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        });
    }, [tadarusRequests, employee.id, allUsersData]);

    const pendingMissedPrayerRequests = useMemo(() => {
        return missedPrayerRequests.filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        });
    }, [missedPrayerRequests, employee.id, allUsersData]);

    const pendingMentorReviews = useMemo(() => {
        return monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => s.mentorId === employee.id && s.status === 'pending_mentor');
    }, [monthlyReportSubmissions, employee.id]);

    const upcomingSessions = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return tadarusSessions.filter(s => s.mentorId === employee.id && s.date >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [tadarusSessions, employee.id]);

    const submissionsForMentor = useMemo(() => {
        return monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => s.mentorId === employee.id);
    }, [monthlyReportSubmissions, employee.id]);

    const unifiedHistory = useMemo(() => {
        const reports = monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => s.mentorId === employee.id).map((s: MonthlyReportSubmission) => ({
            id: s.id,
            type: 'report' as const,
            menteeName: s.menteeName,
            periode: `${new Date(s.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} `,
            submittedAt: s.submittedAt,
            monthKey: s.monthKey,
            status: s.status,
            originalData: s
        }));

        const tadarus = tadarusRequests.filter(r => r.mentorId === employee.id).map(r => ({
            id: r.id,
            type: 'tadarus' as const,
            menteeName: r.menteeName,
            periode: `${r.category || 'Tadarus'} (${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })})`,
            submittedAt: r.requestedAt,
            monthKey: r.date.substring(0, 7),
            status: r.status,
            originalData: r
        }));

        const missedPrayers = missedPrayerRequests.filter(r => r.mentorId === employee.id).map(r => ({
            id: r.id,
            type: 'missed_prayer' as const,
            menteeName: r.menteeName,
            periode: `Terlewat: ${r.prayerName} (${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })})`,
            submittedAt: r.requestedAt,
            monthKey: r.date.substring(0, 7),
            status: r.status,
            originalData: r
        }));

        return [...reports, ...tadarus, ...missedPrayers].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    }, [monthlyReportSubmissions, tadarusRequests, missedPrayerRequests, employee.id]);

    const availableYears = useMemo(() => {
        const years = new Set(unifiedHistory.map(item => item.monthKey.substring(0, 4)));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [unifiedHistory]);

    const filteredItems = useMemo(() => {
        return unifiedHistory.filter(item => {
            const statusMatch = statusFilter === 'all' ||
                (statusFilter === 'pending' && (item.type === 'report' ? item.status === 'pending_mentor' : item.status === 'pending')) ||
                (statusFilter === 'approved' && (item.type === 'report' ? ['pending_supervisor', 'pending_kaunit', 'approved'].includes(item.status) : item.status === 'approved')) ||
                (statusFilter === 'rejected' && (item.type === 'report' ? item.status.startsWith('rejected_') : item.status === 'rejected'));

            if (!statusMatch) return false;

            const [year, month] = item.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);

            return yearMatch && monthMatch;
        });
    }, [unifiedHistory, statusFilter, filterYear, filterMonth]);

    const handleApprove = (type: 'missed-prayer' | 'report', id: string) => {
        setApprovalTarget({ type, id });
    };

    const handleConfirmApproval = () => {
        if (!approvalTarget) return;

        if (approvalTarget.type === 'missed-prayer') {
            onReviewMissedPrayerRequest(approvalTarget.id, 'approved', 'Disetujui oleh Mentor');
        } else {
            onReviewReport(approvalTarget.id, 'approved', 'Disetujui oleh Mentor.', 'mentor');
        }

        // Log audit removed as store is being deleted


        setSelectedSubmission(null);
        setApprovalTarget(null);
    };

    const handleRejectSubmit = (notes: string) => {
        if (!rejectionTarget) return;

        if (rejectionTarget.type === 'missed-prayer') {
            onReviewMissedPrayerRequest(rejectionTarget.id, 'rejected', notes);
        } else {
            onReviewReport(rejectionTarget.submission.id, 'rejected', notes, 'mentor');
            // Log audit removed as store is being deleted
        }

        setSelectedSubmission(null);
        setRejectionTarget(null);
    };

    const handleDeleteSession = () => {
        if (pendingSessionDelete) {
            onDeleteTadarusSession(pendingSessionDelete.id);
            setPendingSessionDelete(null);
        }
    };

    const openSessionModal = (session?: TadarusSession) => {
        setEditingSession(session || null);
        setIsSessionModalOpen(true);
    };

    const menteeData = selectedSubmission ? allUsersData[selectedSubmission.menteeId]?.employee : null;

    if (selectedSubmission) {
        return menteeData ? (
            <MenteeDetailProgressView
                mentee={menteeData}
                monthKey={selectedSubmission.monthKey}
                onBack={() => setSelectedSubmission(null)}
                allUsersData={allUsersData}
                loadDetailedEmployeeData={loadDetailedEmployeeData}
                dailyActivitiesConfig={dailyActivitiesConfig}
                onUpdateMentee={onUpdateProfile}
                assessorId={employee.id}
            />
        ) : null;
    }

    return (
        <div className="space-y-6">
            <div className="overflow-x-auto overflow-y-visible touch-pan-x pb-3 pt-3">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-white/10 min-w-max px-1">
                    <SubTabButton label="Persetujuan" icon={CheckSquare} active={mentorSubView === 'persetujuan'} onClick={() => setMentorSubView('persetujuan')} />
                    {(employee.canBeMentor || isAnyAdmin(employee)) && (
                        <>
                            <SubTabButton label="Anggota Bimbingan" icon={Users} active={mentorSubView === 'mentees'} onClick={() => setMentorSubView('mentees')} />
                            <SubTabButton label="Target Bimbingan" icon={Tag} active={mentorSubView === 'target'} onClick={() => setMentorSubView('target')} />
                            <SubTabButton label="Progres Anggota" icon={BarChart3} active={mentorSubView === 'progress'} onClick={() => setMentorSubView('progress')} />
                            <SubTabButton label="Laporan Bacaan" icon={BookOpen} active={mentorSubView === 'laporan-bacaan'} onClick={() => setMentorSubView('laporan-bacaan')} />
                            <SubTabButton label="Kompetensi Al-Qur'an" icon={GraduationCap} active={mentorSubView === 'quran-competency'} onClick={() => setMentorSubView('quran-competency')} />
                        </>
                    )}


                </div>
            </div>

            <div className="animate-view-change">


                {mentorSubView === 'persetujuan' && (
                    <UniversalPersetujuan
                        loggedInEmployee={employee}
                        monthlyReportSubmissions={monthlyReportSubmissions}
                        // @ts-ignore
                        onReviewReport={onReviewReport}
                        allUsersData={allUsersData}
                        pendingTadarusRequests={tadarusRequests || []}
                        pendingMissedPrayerRequests={missedPrayerRequests || []}
                        onReviewTadarusRequest={onReviewTadarusRequest}
                        onReviewMissedPrayerRequest={onReviewMissedPrayerRequest}
                        loadDetailedEmployeeData={loadDetailedEmployeeData}
                        dailyActivitiesConfig={dailyActivitiesConfig}
                    />
                )}
                {/* Sesi Bimbingan view removed */}
                {mentorSubView === 'mentees' && (
                    <MenteeManagement
                        mentees={mentees}
                        allUsers={Object.values(allUsersData).map(d => d.employee)}
                        mentorId={employee.id}
                        onUpdateProfile={onUpdateProfile}
                        addToast={addToast}
                    />
                )}
                {mentorSubView === 'target' && (
                    <TargetManagement
                        mentees={mentees}
                        targetMenteeId={targetMenteeId}
                        setTargetMenteeId={setTargetMenteeId}
                        targetTitle={targetTitle}
                        setTargetTitle={setTargetTitle}
                        targetDescription={targetDescription}
                        setTargetDescription={setTargetDescription}
                        handleCreateTarget={handleCreateTarget}
                        menteeTargets={menteeTargets.filter(t => t.mentorId === employee.id)}
                        setConfirmDeleteTarget={setConfirmDeleteTarget}
                        allUsersData={allUsersData}
                    />
                )}
                {mentorSubView === 'progress' && (
                    <MenteeDetailProgressView
                        mentee={mentees[0]}
                        monthKey={progressViewMonth.toISOString().slice(0, 7)}
                        mentees={mentees}
                        currentMonth={progressViewMonth}
                        onMonthChange={setProgressViewMonth}
                        allUsersData={allUsersData}
                        loadDetailedEmployeeData={loadDetailedEmployeeData}
                        dailyActivitiesConfig={dailyActivitiesConfig}
                        onUpdateMentee={onUpdateProfile}
                        assessorId={employee.id}
                    />
                )}
                {mentorSubView === 'laporan-bacaan' && (
                    <ReadingReportView mentees={mentees} mentorName={employee.name} />
                )}
                {mentorSubView === 'quran-competency' && (
                    <QuranCompetencySummaryDashboard
                        mentees={employee.role === 'super-admin'
                            ? Object.values(allUsersData).map(d => d.employee)
                            : mentees}
                        assessorId={employee.id}
                        loggedInEmployee={employee}
                        isReadOnly={employee.role === 'admin'} // 🔥 Admin can only view, not assess
                        onUpdateMentee={onUpdateProfile}
                        onStartAssessment={(m: Employee) => {
                            setAssessmentMentee(m);
                            setMentorSubView('quran-assessment');
                        }}
                    />
                )}
                {mentorSubView === 'quran-assessment' && assessmentMentee && (
                    <QuranCompetencyAssessment
                        mentee={assessmentMentee}
                        assessorId={employee.id}
                        onClose={() => {
                            setMentorSubView('quran-competency');
                            setAssessmentMentee(null);
                        }}
                        onUpdateMentee={onUpdateProfile}
                    />
                )}
            </div>

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
            <ConfirmationModal
                isOpen={!!pendingSessionDelete}
                onClose={() => setPendingSessionDelete(null)}
                onConfirm={handleDeleteSession}
                title="Hapus Sesi Bimbingan"
                message={<>Apakah Anda yakin ingin menghapus sesi &quot;<strong>{pendingSessionDelete?.title}</strong>&quot;? Tindakan ini tidak dapat diurungkan.</>}
                confirmText="Ya, Hapus Sesi"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
            <TadarusSessionModal
                isOpen={isSessionModalOpen}
                onClose={() => setIsSessionModalOpen(false)}
                onSave={onCreateTadarusSession}
                onUpdate={onUpdateTadarusSession}
                existingSession={editingSession}
                mentees={mentees}
                mentorId={employee.id}
            />
        </div>
    );
};
