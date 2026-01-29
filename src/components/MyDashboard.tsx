import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type MyDashboardViewProps, Employee, ReadingHistory, QuranReadingHistory, MonthlyReportSubmission, MenteeTarget, DailyActivity } from '../types';
import { isAdministrativeAccount, isAnyAdmin } from '@/lib/rolePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { BarChart3, FileText, TrendingUp, CalendarDays, Clock, Check, Trash2, CheckSquare, Pencil, PlusCircle, Eye, RotateCcw, CheckCircle2, Info } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { TeamAttendanceView } from './TeamAttendanceView';
import Analytics from './Analytics';
import { getTodayLocalDateString, createLocalDate, normalizeDate, formatDateTimeIndonesia, formatDateIndonesia } from '../utils/dateUtils';
import { timeValidationService } from '../services/timeValidationService';
import { useUIStore } from '@/store/store';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

const TabButton: React.FC<{
    label: string;
    icon: any;
    active: boolean;
    onClick: () => void;
    count?: number;
}> = ({ label, icon: Icon, active, onClick, count }) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap relative
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
        {count !== undefined && count > 0 && (
            <span className="absolute top-2 right-2 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg animate-pulse">
                {count}
            </span>
        )}
    </button>
);

// Helper function to calculate balanced weeks, replicated from MonthlyActivities
// FIXED: Changed to Sunday-based week calculation (0 = Sunday) to match MonthlyActivities.tsx
const getBalancedWeeks = (date: Date): { weekIndex: number, days: number[] }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        const currentDate = new Date(year, month, day);
        if (currentDate.getDay() === 0 || day === daysInMonth) { // End of week on Sunday or end of month
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Merge short first week (<= 2 days)
    if (weeks.length > 1 && weeks[0].length <= 2) {
        const firstWeek = weeks.shift()!;
        weeks[0] = [...firstWeek, ...weeks[0]];
    }

    // Merge short last week (<= 2 days)
    if (weeks.length > 1 && weeks[weeks.length - 1].length <= 2) {
        const lastWeek = weeks.pop()!;
        weeks[weeks.length - 1] = [...weeks[weeks.length - 1], ...lastWeek];
    }

    return weeks.map((days, index) => ({ weekIndex: index, days }));
};

const KinerjaView: React.FC<{ employee: Employee, dailyActivitiesConfig: DailyActivity[] }> = ({ employee, dailyActivitiesConfig }) => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 🔥 FIX: Memoize current month key separately to avoid infinite loop
    const currentMonthKey = React.useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []); // Empty deps - only compute once per component mount

    // 🔥 FIX: Data is now already pre-aggregated in monthlyActivities by loadDetailedEmployeeData

    const { performanceData, monthlyStats } = useMemo(() => {

        const monthProgress = employee.monthlyActivities?.[currentMonthKey] || {};
        const enrichedMonthProgress = { ...monthProgress };

        // 1. Sync Reading History (Books)
        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            employee.readingHistory.forEach(history => {
                const date = history.dateCompleted; // YYYY-MM-DD
                const monthKeyCheck = date.substring(0, 7); // YYYY-MM
                if (monthKeyCheck === currentMonthKey) {
                    const dayKey = date.substring(8, 10);
                    if (!enrichedMonthProgress[dayKey]) {
                        enrichedMonthProgress[dayKey] = {};
                    }
                    enrichedMonthProgress[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        // 2. Sync Quran History
        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            employee.quranReadingHistory.forEach(history => {
                const date = history.date; // YYYY-MM-DD
                const monthKeyCheck = date.substring(0, 7); // YYYY-MM
                if (monthKeyCheck === currentMonthKey) {
                    const dayKey = date.substring(8, 10);
                    if (!enrichedMonthProgress[dayKey]) {
                        enrichedMonthProgress[dayKey] = {};
                    }
                    enrichedMonthProgress[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }


        const categories: Record<string, { name: string; details: { id: string; title: string; target: number; achieved: number; percentage: number }[] }> = {
            'SIDIQ (Integritas)': { name: 'SIDIQ (Integritas)', details: [] },
            'TABLIGH (Teamwork)': { name: 'TABLIGH (Teamwork)', details: [] },
            'AMANAH (Disiplin)': { name: 'AMANAH (Disiplin)', details: [] },
            'FATONAH (Belajar)': { name: 'FATONAH (Belajar)', details: [] },
        };

        // Calculate total reading count specifically for 'baca_alquran_buku'
        let totalReadingCount = 0;
        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            totalReadingCount += employee.readingHistory.filter(h => h.dateCompleted.startsWith(currentMonthKey)).length;
        }
        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            totalReadingCount += employee.quranReadingHistory.filter(h => h.date.startsWith(currentMonthKey)).length;
        }

        dailyActivitiesConfig.forEach(activity => {
            if (categories[activity.category]) {
                let achieved = 0;

                // Special handling for reading activity: Count total entries, not just days
                if (activity.id === 'baca_alquran_buku') {
                    achieved = totalReadingCount;
                } else {
                    // Default logic: Count unique days
                    achieved = Object.values(enrichedMonthProgress).reduce((dayCount: number, dailyProgress: Record<string, boolean>) => {
                        return dayCount + (dailyProgress[activity.id] ? 1 : 0);
                    }, 0);
                }

                const percentage = activity.monthlyTarget > 0 ? Math.min(100, Math.round((achieved / activity.monthlyTarget) * 100)) : 0;


                categories[activity.category].details.push({
                    id: activity.id,
                    title: activity.title,
                    target: activity.monthlyTarget,
                    achieved,
                    percentage,
                });
            }
        });

        const categoryResults = Object.values(categories).map(cat => {
            const totalPercentage = cat.details.reduce((sum: number, detail: { id: string; title: string; target: number; achieved: number; percentage: number }) => sum + detail.percentage, 0);
            const averageScore = cat.details.length > 0 ? Math.round(totalPercentage / cat.details.length) : 0;
            return { name: cat.name, Persentase: averageScore };
        });

        const statsForCards = Object.entries(categories).reduce((acc, [key, value]) => {
            acc[key] = value.details.map(d => ({ title: d.title, achieved: d.achieved, target: d.target }));
            return acc;
        }, {} as Record<string, { title: string; achieved: number; target: number }[]>);


        return { performanceData: categoryResults, monthlyStats: statsForCards };
    }, [
        currentMonthKey,
        employee?.monthlyActivities,
        dailyActivitiesConfig,
        employee?.readingHistory,
        employee?.quranReadingHistory
    ]);

    return (
        <div className="space-y-8">
            <div className="bg-black/20 p-6 rounded-2xl shadow-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Progres Bulan Ini: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>

                {/* Mobile scroll indicator */}
                <div className="md:hidden text-center text-xs text-blue-200 mb-2 flex items-center justify-center gap-2">
                    <span>← Geser kiri/kanan untuk melihat grafik →</span>
                </div>

                {/* Scrollable container for mobile */}
                <div className="overflow-x-auto pb-4 -mx-2 px-2 md:overflow-x-visible md:mx-0 md:px-0">
                    <div className="w-full min-w-[700px] md:min-w-0" style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                                    <YAxis stroke="#cbd5e1" allowDecimals={false} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                    <Bar dataKey="Persentase" isAnimationActive={false}>
                                        <LabelList dataKey="Persentase" position="top" fill="#e2e8f0" fontSize={12} formatter={(value) => typeof value === 'number' ? `${value}%` : ''} />
                                        {performanceData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(monthlyStats).map(([category, activities]) => (
                    <div key={category} className="bg-black/20 p-6 rounded-2xl shadow-lg border border-white/10">
                        <h4 className="font-bold text-lg text-teal-300 mb-4">{category}</h4>
                        <div className="space-y-4">
                            {activities.map(activity => {
                                const percentage = activity.target > 0 ? Math.min(100, (activity.achieved / activity.target) * 100) : 0;
                                return (
                                    <div key={activity.title}>
                                        <div className="flex justify-between items-center mb-1 text-sm gap-2">
                                            <span className="font-medium text-white text-sm leading-tight wrap-break-word shrink">{activity.title}</span>
                                            <span className="font-semibold text-blue-200 text-xs shrink-0">{activity.achieved} / {activity.target}</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-2">
                                            <div
                                                className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 🔥 REMOVED React.memo to prevent chart disappearing bug
// The memo comparison was causing issues because:
// 1. Reference comparison fails when data is re-fetched
// 2. Chart doesn't re-render even when data changes
// 3. Better to let it re-render than to show stale/missing data
// Performance impact is minimal since useMemo already handles expensive calculations
const MemoizedKinerjaView = KinerjaView;

const ReadingActivityCard: React.FC<{
    employee: Employee;
    onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
    submissions: MonthlyReportSubmission[];
    todayForMaxDate: string;
    dailyActivitiesConfig: DailyActivity[];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ employee, onLogBookReading, onDeleteReadingHistory, submissions, todayForMaxDate, dailyActivitiesConfig }) => {
    const { addToast } = useUIStore();
    const [dateCompleted, setDateCompleted] = useState(getTodayLocalDateString());
    const [bookTitle, setBookTitle] = useState('');
    const [pagesRead, setPagesRead] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Find the reading activity config to get the target from database
    const readingActivity = useMemo(() => {
        return dailyActivitiesConfig.find(d => d.automationTrigger?.type === 'BOOK_READING_REPORT');
    }, [dailyActivitiesConfig]);

    // Calculate reading count from history
    const [count, setCount] = useState(0);
    useEffect(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let totalCount = 0;
        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            totalCount += employee.readingHistory.filter(h => h.dateCompleted.startsWith(currentMonthKey)).length;
        }
        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            totalCount += employee.quranReadingHistory.filter(h => h.date.startsWith(currentMonthKey)).length;
        }
        setCount(totalCount);
    }, [employee.readingHistory, employee.quranReadingHistory]);

    // Get target from database config
    const target = readingActivity?.monthlyTarget || 20;
    const isTargetMet = count >= target;
    const progress = Math.min((count / target) * 100, 100);

    // Check if selected date is already reported
    const reportedDates = useMemo(() => {
        const dates: string[] = [];
        if (employee.readingHistory) {
            employee.readingHistory.forEach(h => dates.push(h.dateCompleted));
        }
        if (employee.quranReadingHistory) {
            employee.quranReadingHistory.forEach(h => dates.push(h.date));
        }
        return dates;
    }, [employee.readingHistory, employee.quranReadingHistory]);

    const isDateAlreadyReported = reportedDates.includes(dateCompleted);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || !dateCompleted) return;

        // Validate: Check if all fields are filled
        if (!bookTitle || !pagesRead) {
            addToast("⚠️ Harap isi judul buku dan halaman yang dibaca.", 'error');
            return;
        }

        // Validate: Check if date is already reported
        if (isDateAlreadyReported) {
            addToast(`⚠️ Aktivitas ini sudah dilaporkan untuk tanggal ${dateCompleted}. Silakan pilih tanggal lain.`, 'error');
            return;
        }

        setIsLoading(true);
        try {
            onLogBookReading(bookTitle, pagesRead, dateCompleted);
            setBookTitle('');
            setPagesRead('');
            setDateCompleted(getTodayLocalDateString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border border-white/10 p-4 rounded-lg bg-linear-to-br from-gray-800/50 to-gray-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-base font-bold text-white mb-1">
                        Membaca Al-Quran dan buku
                    </h4>
                    <p className="text-xs text-blue-200">
                        Target: {target}x per bulan
                    </p>
                </div>

                {/* Status Badge */}
                {isTargetMet ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                            Tercapai!
                        </span>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-full">
                        <span className="text-xs font-semibold text-gray-400">
                            {count} / {target}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${isTargetMet
                            ? 'bg-linear-to-r from-green-500 to-green-400'
                            : 'bg-linear-to-r from-teal-500 to-blue-500'
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                    {progress.toFixed(0)}% tercapai
                </p>
            </div>

            {/* Date Input and Submit Form */}
            <div className="space-y-3">
                {/* Book Title Input */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        Judul Buku:
                    </label>
                    <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="Contoh: Fiqih Ibadah"
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                        disabled={isLoading}
                    />
                </div>

                {/* Pages Read Input */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        Halaman Dibaca:
                    </label>
                    <input
                        type="text"
                        value={pagesRead}
                        onChange={(e) => setPagesRead(e.target.value)}
                        placeholder="Contoh: 1-15, 20"
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                        disabled={isLoading}
                    />
                </div>

                {/* Date Picker */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        Tanggal Pelaporan:
                    </label>
                    <input
                        type="date"
                        value={dateCompleted}
                        onChange={(e) => setDateCompleted(e.target.value)}
                        max={getTodayLocalDateString()}
                        className={`w-full bg-white/5 border rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none ${isDateAlreadyReported
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-white/20'
                            }`}
                        disabled={isLoading}
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || isDateAlreadyReported}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${isLoading || isDateAlreadyReported
                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                        : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/50'
                        }`}
                >
                    {isLoading ? 'Menyimpan...' : 'Lapor Aktivitas'}
                </button>
            </div>
        </div>
    );
};

const SimpleActivityCard: React.FC<{
    activity: { id: string; title: string };
    employee: Employee;
    onLogManualActivity: (activityId: string, date: string) => void;
    submissions: MonthlyReportSubmission[];
    todayForMaxDate: string;
}> = ({ activity, employee, onLogManualActivity, submissions, todayForMaxDate }) => {
    const { addToast } = useUIStore();
    const [date, setDate] = useState(getTodayLocalDateString());
    const [isLoading, setIsLoading] = useState(false);

    const isDone = useMemo(() => {
        if (!date) return false;
        const monthKey = date.slice(0, 7);
        const dayKey = date.slice(8, 10);
        return employee.monthlyActivities?.[monthKey]?.[dayKey]?.[activity.id] ?? false;
    }, [date, employee.monthlyActivities, activity.id]);

    const handleSubmit = async () => {
        if (isLoading || !date) return;

        if (isDone) {
            addToast(`⚠️ Aktivitas ini sudah dilaporkan untuk tanggal ${date}. Silakan pilih tanggal lain.`, 'error');
            return;
        }

        setIsLoading(true);
        try {
            onLogManualActivity(activity.id, date);
            setDate(getTodayLocalDateString());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border border-white/10 p-4 rounded-lg bg-linear-to-br from-gray-800/50 to-gray-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-base font-bold text-white mb-1">
                        {activity.title}
                    </h4>
                    <p className="text-xs text-blue-200">
                        Aktivitas harian
                    </p>
                </div>

                {/* Status Badge */}
                {isDone ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                            Selesai
                        </span>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-full">
                        <span className="text-xs font-semibold text-gray-400">
                            Belum
                        </span>
                    </div>
                )}
            </div>

            {/* Date Input and Submit Form */}
            <div className="space-y-3">
                {/* Date Picker */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        Tanggal Pelaporan:
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        max={getTodayLocalDateString()}
                        className={`w-full bg-white/5 border rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none ${isDone ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20'
                            }`}
                        disabled={isLoading}
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || isDone}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${isLoading || isDone
                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                        : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/50'
                        }`}
                >
                    {isLoading ? 'Menyimpan...' : isDone ? 'Sudah Dilaporkan' : 'Lapor Aktivitas'}
                </button>
            </div>
        </div>
    );
};

const RiwayatBacaan: React.FC<{
    employee: Employee;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
}> = ({ employee, onDeleteReadingHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'book' | 'quran'; id: string; date: string; detail: string } | null>(null);

    const combinedHistory = useMemo(() => {

        const bookHistory = (employee.readingHistory || []).map((r: ReadingHistory) => ({
            id: r.id,
            date: r.dateCompleted,
            type: 'Buku' as const,
            detail: `${r.bookTitle} (${r.pagesRead || 'N/A'})`,
        }));

        // Combine quranReadingHistory from employee only (removed redundant client-side fetch)
        const quranHistory = (employee.quranReadingHistory || []).map((r: QuranReadingHistory) => ({
            id: r.id || `history-${r.date}-${r.surahNumber}-${r.startAyah}`,
            date: r.date,
            type: 'Al-Qur\'an' as const,
            detail: `QS. ${r.surahName} [${r.surahNumber}:${r.startAyah}-${r.endAyah}]`,
        }));

        // No need for complex deduplication logic anymore since we utilize a single source of truth
        return [...bookHistory, ...quranHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [employee.readingHistory, employee.quranReadingHistory]);

    const filteredHistory = useMemo(() => {
        return combinedHistory.filter(item => {
            const itemDate = createLocalDate(item.date);
            return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
        });
    }, [combinedHistory, currentDate]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    const isNextMonthFuture = () => {
        const nextMonth = new Date(currentDate);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
    };

    const handleDelete = () => {
        if (confirmDelete) {
            onDeleteReadingHistory(confirmDelete.type, confirmDelete.id, confirmDelete.date);
            setConfirmDelete(null);
        }
    };

    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white">Riwayat Bacaan</h3>
                <div className="flex items-center justify-between bg-black/20 p-1 rounded-full w-full sm:w-auto">
                    <button onClick={() => navigateMonth('prev')} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-white/10 transition-colors text-sm sm:text-base">
                        &larr;
                    </button>
                    <span className="font-semibold text-xs sm:text-sm text-teal-300 px-2 sm:px-4 text-center grow">
                        {currentDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 text-sm sm:text-base">
                        &rarr;
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/10 -mx-2 sm:mx-0">
                <table className="min-w-full text-xs sm:text-sm text-left text-white">
                    <thead className="bg-white/10 text-[10px] sm:text-xs uppercase text-blue-200 sticky top-0">
                        <tr>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Tanggal</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Jenis</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Detail</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length > 0 ? filteredHistory.map((item, index) => (
                            <tr key={item.id || `reading-${item.type}-${index}`} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[11px] sm:text-sm">{formatDateIndonesia(item.date)}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <span className={`px-1.5 sm:px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${item.type === 'Al-Qur\'an' ? 'bg-teal-500/20 text-teal-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm whitespace-nowrap">{item.detail}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                    <button onClick={() => setConfirmDelete({ type: item.type.toLowerCase() as 'book' | 'quran', id: item.id, date: item.date, detail: item.detail })} className="p-1.5 sm:p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10">
                                        <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr key="empty-state"><td colSpan={4} className="text-center p-6 sm:p-8 text-blue-200 text-xs sm:text-sm">Tidak ada riwayat bacaan pada bulan ini.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {confirmDelete && (
                <ConfirmationModal
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    onConfirm={handleDelete}
                    title="Hapus Riwayat Bacaan"
                    message={<>Apakah Anda yakin ingin menghapus riwayat bacaan: <strong className="block mt-2">{confirmDelete.detail}</strong>?</>}
                    confirmText="Ya, Hapus"
                    confirmColorClass="bg-red-600 hover:bg-red-500"
                />
            )}
        </div>
    );
};

interface AktivitasPribadiViewProps extends Pick<MyDashboardViewProps, 'dailyActivitiesConfig' | 'onLogBookReading' | 'onLogManualActivity' | 'onDeleteReadingHistory'> {
    submissions: MonthlyReportSubmission[];
    employee: Employee;
    onSubmitReport: (monthKey: string) => void;
}

const MonthlySubmissionPanel: React.FC<{
    submissions: MonthlyReportSubmission[];
    onSubmit: (monthKey: string) => void;
}> = ({ submissions, onSubmit }) => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const submission = submissions.find(s => s.monthKey === currentMonthKey);

    return (
        <div className="mt-8 bg-blue-900/40 border border-blue-400/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <CheckSquare className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Laporan Bulanan {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                        <p className="text-blue-200 text-sm">Pastikan semua aktivitas sudah tercatat sebelum mengirim laporan.</p>
                    </div>
                </div>

                {!submission ? (
                    <button
                        onClick={() => onSubmit(currentMonthKey)}
                        className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        Kirim Laporan Bulan Ini
                    </button>
                ) : (
                    <div className="flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                        <div>
                            <p className="text-green-400 font-bold leading-tight">Laporan Terkirim</p>
                            <p className="text-green-300 text-xs uppercase text-center">
                                {submission.status === 'approved' ? 'DISETUJUI' :
                                    submission.status.startsWith('rejected_') ? 'DITOLAK' : 'MENUNGGU'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SubTabButton: React.FC<{
    label: string;
    tab: 'laporan' | 'riwayat';
    isActive: boolean;
    onClick: (tab: 'laporan' | 'riwayat') => void;
}> = ({ label, tab, isActive, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`py-3 px-4 sm:px-5 font-semibold transition-colors duration-200 border-b-2 whitespace-nowrap text-sm sm:text-base ${isActive ? 'border-teal-400 text-teal-300' : 'border-transparent text-gray-400 hover:text-white'
            }`}
    >
        {label}
    </button>
);

const AktivitasPribadiView: React.FC<AktivitasPribadiViewProps> = ({ employee, dailyActivitiesConfig, onLogBookReading, onLogManualActivity, onDeleteReadingHistory, submissions, onSubmitReport }) => {
    const [activeSubTab, setActiveSubTab] = useState<'laporan' | 'riwayat'>('laporan');
    const todayForMaxDate = useMemo(() => getTodayLocalDateString(), []);

    const manualActivities = useMemo(() => {
        return dailyActivitiesConfig.filter(
            act => act.automationTrigger?.type === 'MANUAL_USER_REPORT'
        );
    }, [dailyActivitiesConfig]);

    return (
        <div>
            {/* Mobile scroll indicator for sub-tabs */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 flex items-center justify-center gap-2 animate-pulse">
                <span>← Geser untuk melihat menu →</span>
            </div>

            {/* Scrollable sub-tab navigation */}
            <div className="overflow-x-auto pb-2 mb-4 -mx-2 px-2 sm:overflow-x-visible sm:mx-0 sm:px-0 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-max sm:min-w-0">
                    <SubTabButton
                        label="Laporan Manual"
                        tab="laporan"
                        isActive={activeSubTab === 'laporan'}
                        onClick={setActiveSubTab}
                    />
                    <SubTabButton
                        label="Riwayat Bacaan"
                        tab="riwayat"
                        isActive={activeSubTab === 'riwayat'}
                        onClick={setActiveSubTab}
                    />
                </div>
            </div>

            {activeSubTab === 'laporan' && (
                <div className="animate-view-change">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <ReadingActivityCard
                            employee={employee}
                            onLogBookReading={onLogBookReading}
                            onDeleteReadingHistory={onDeleteReadingHistory}
                            submissions={submissions}
                            todayForMaxDate={todayForMaxDate}
                            dailyActivitiesConfig={dailyActivitiesConfig}
                        />
                        {manualActivities.map(activity => (
                            <SimpleActivityCard
                                key={activity.id}
                                activity={activity}
                                employee={employee}
                                onLogManualActivity={onLogManualActivity}
                                submissions={submissions}
                                todayForMaxDate={todayForMaxDate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {activeSubTab === 'riwayat' && (
                <div className="animate-view-change">
                    <RiwayatBacaan employee={employee} onDeleteReadingHistory={onDeleteReadingHistory} />
                </div>
            )}

            <MonthlySubmissionPanel
                submissions={submissions}
                onSubmit={onSubmitReport}
            />
        </div>
    );
};

const MyDashboard: React.FC<MyDashboardViewProps> = (props) => {
    /* eslint-disable */
    const {
        employee,
        initialTab,
        onTabChange,
        dailyActivitiesConfig,
        menteeTargets,
        onCreateMenteeTarget,
        allUsersData,
        teamAttendanceSessions,
        onCreateTeamAttendanceSessions,
        onAddActivity,
        onUpdateTeamAttendance,
        onDeleteTeamAttendanceSession,
        addToast,
        monthlyReportSubmissions,
        onSubmitReport,
    } = props;
    /* eslint-enable */

    type DashboardTab = 'kinerja' | 'analytics';

    const [activeTab, setActiveTab] = useState<DashboardTab>(
        isAdministrativeAccount(employee.id) ? 'analytics' : (initialTab as DashboardTab || 'kinerja')
    );
    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (!isInitializedRef.current && initialTab) {
            const newTab = initialTab as DashboardTab;
            setActiveTab(newTab);
            isInitializedRef.current = true;
            if (onTabChange) {
                onTabChange();
            }
        }
    }, [initialTab, onTabChange]);

    // 🔥 FIX: Safe role calculations with defaults - NO loading check!
    // Use nullish coalescing to handle undefined/null gracefully
    // Also check for snake_case fallback for initial load before camelCase conversion
    const hasMentorRole = employee.canBeMentor === true || (employee as Employee & { can_be_mentor?: boolean }).can_be_mentor === true;
    const hasApprovalRole = employee.canBeSupervisor === true || employee.canBeKaUnit === true ||
        (employee as Employee & { can_be_supervisor?: boolean; can_be_ka_unit?: boolean }).can_be_supervisor === true ||
        (employee as Employee & { can_be_supervisor?: boolean; can_be_ka_unit?: boolean }).can_be_ka_unit === true;
    const functionalRoles = employee.functionalRoles || (employee as Employee & { functional_roles?: string[] }).functional_roles || [];
    const canDoTeamAttendance = hasMentorRole || hasApprovalRole ||
        functionalRoles.includes('MANAJER') ||
        functionalRoles.includes('KEPALA URUSAN') ||
        functionalRoles.includes('KEPALA RUANGAN');

    // 🔥 NEW: Check if user can access Analytics (admin OR has functional roles/assignments)
    const canAccessAnalytics = employee.role === 'super-admin' ||
        employee.role === 'admin' ||
        (employee.role === 'user' && functionalRoles.length > 0) ||
        isAdministrativeAccount(employee.id);

    // Calculate pending counts for notification badges
    const mentorPanelCount = useMemo(() => {
        const tadarusPending = (props.tadarusRequests || []).filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        }).length;
        const sholatPending = (props.missedPrayerRequests || []).filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        }).length;
        const reportsPending = (props as any).monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => {
            const mentee = allUsersData[s.menteeId]?.employee;
            return s.status === 'pending_mentor' && mentee && mentee.mentorId === employee.id;
        }).length;
        return tadarusPending + sholatPending + reportsPending;
    }, [props.tadarusRequests, props.missedPrayerRequests, (props as any).monthlyReportSubmissions, employee.id, allUsersData]);

    const approvalTabCount = useMemo(() => {
        const supervisorPending = (props as any).monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => s.status === 'pending_supervisor' && s.supervisorId === employee.id).length;
        const kaUnitPending = (props as any).monthlyReportSubmissions.filter((s: MonthlyReportSubmission) => s.status === 'pending_kaunit' && s.kaUnitId === employee.id).length;

        // Manual requests follow the current mentor
        const manualPending = (props.tadarusRequests || []).filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        }).length + (props.missedPrayerRequests || []).filter(r => {
            const mentee = allUsersData[r.menteeId]?.employee;
            return r.status === 'pending' && mentee && mentee.mentorId === employee.id;
        }).length;

        return supervisorPending + kaUnitPending + manualPending;
    }, [(props as any).monthlyReportSubmissions, props.tadarusRequests, props.missedPrayerRequests, employee.id, allUsersData]);



    // 🔥 FIX: Auto-load all employees data if user is a mentor/approver OR when entering Analytics/Rapot
    useEffect(() => {
        const shouldLoadEmployees =
            (hasMentorRole || hasApprovalRole) || // Eagerly load for mentors/approvers
            activeTab === 'analytics'; // Or if Analytics tab requires it

        if (shouldLoadEmployees && props.onLoadEmployees) {
            // 🔥 FIX: For rapot tab, ALWAYS trigger load to ensure mentor data is fresh
            // For other tabs, only load if data is minimal
            const userCount = Object.keys(allUsersData).length;
            if (userCount <= 1) {
                props.onLoadEmployees();
            }
        }
    }, [hasMentorRole, hasApprovalRole, activeTab, allUsersData, props.onLoadEmployees]);

    // State for MentorDashboard target creation form
    const [targetMenteeId, setTargetMenteeId] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<MenteeTarget | null>(null);

    const menteesOfMentor = useMemo(() => {
        if (!hasMentorRole) return [];
        return Object.values(props.allUsersData)
            .filter(data => data.employee.mentorId === employee.id)
            .map(data => data.employee);
    }, [props.allUsersData, employee.id, hasMentorRole]);

    // Initialize targetMenteeId when mentees become available
    // Use a ref to ensure we only set it once to avoid cascading renders
    const initializedRef = useRef(false);
    useEffect(() => {
        if (menteesOfMentor.length > 0 && !targetMenteeId && !initializedRef.current) {
            initializedRef.current = true;
            // Safe because ref prevents re-execution - only runs once on first load
            setTargetMenteeId(menteesOfMentor[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Including menteesOfMentor would cause re-runs, but ref prevents that
    }, [menteesOfMentor.length, targetMenteeId]);

    const handleCreateTarget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetMenteeId || !targetTitle.trim()) {
            props.addToast('Harap pilih anggota dan isi judul target.', 'error');
            return;
        }
        const monthKey = new Date().toISOString().slice(0, 7);
        props.onCreateMenteeTarget({
            mentorId: employee.id,
            menteeId: targetMenteeId,
            title: targetTitle,
            description: targetDescription,
            monthKey: monthKey,
        });
        setTargetTitle('');
        setTargetDescription('');
        props.addToast('Target baru berhasil ditetapkan!', 'success');
    };

    const handleDeleteTarget = () => {
        if (confirmDeleteTarget) {
            props.onDeleteMenteeTarget(confirmDeleteTarget.id);
            setConfirmDeleteTarget(null);
        }
    };

    // 🔥 FIX: Wrapper function untuk delete mentee target
    const handleDeleteMenteeTarget = (targetId: string) => {
        props.onDeleteMenteeTarget(targetId);
    };

    const renderContent = () => {
        if (props.isLoadingEmployees && activeTab === 'analytics') {
            return (
                <div className="flex flex-col items-center justify-center p-12 sm:p-20 bg-black/20 rounded-2xl border border-white/5">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
                    <p className="text-teal-200/60 text-sm font-medium animate-pulse">Memuat data...</p>
                </div>
            );
        }


        switch (activeTab) {
            case 'kinerja':
                return <MemoizedKinerjaView employee={employee} dailyActivitiesConfig={dailyActivitiesConfig} />;
            case 'analytics':
                // 🔥 NEW: Security check - only show Analytics if user has access
                if (!canAccessAnalytics) {
                    return <div className="text-center text-white p-8">Anda tidak memiliki akses ke Analytics</div>;
                }
                return <Analytics allUsersData={props.allUsersData} dailyActivitiesConfig={dailyActivitiesConfig} />;
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="border-b border-white/20">
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 -mb-px min-w-max">
                        {(!isAdministrativeAccount(employee.id) || isAnyAdmin(employee)) && <TabButton label="Kinerja" icon={BarChart3} active={activeTab === 'kinerja'} onClick={() => setActiveTab('kinerja')} />}
                        {(canAccessAnalytics || isAdministrativeAccount(employee.id) || isAnyAdmin(employee)) && <TabButton label="Analytics" icon={TrendingUp} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />}
                    </div>
                </div>
            </nav>
            <div className="mt-6">
                {renderContent()}
            </div>
            <ConfirmationModal
                isOpen={!!confirmDeleteTarget}
                onClose={() => setConfirmDeleteTarget(null)}
                onConfirm={handleDeleteTarget}
                title="Hapus Target"
                message={<>Apakah Anda yakin ingin menghapus target &quot;<strong>{confirmDeleteTarget?.title}</strong>&quot;?</>}
                confirmText="Ya, Hapus"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </div>
    );
};

// 🔥 OPTIMIZATION: Memoize MyDashboard to prevent unnecessary re-renders
// Only re-renders when props change (employee, activities, submissions, etc.)
export default React.memo(MyDashboard);