import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type MyDashboardViewProps, Employee, ReadingHistory, QuranReadingHistory, WeeklyReportSubmission, MenteeTarget, ToDoItem, DailyActivity } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartBarIcon, DocumentTextIcon, CalendarDaysIcon, ClockIcon, AcademicCapIcon, CheckIcon, TrashIcon, CheckSquareIcon, UserGroupIcon, ShieldCheckIcon, PencilIcon, LockClosedIcon, PlusCircleIcon, ListBulletIcon, EyeIcon, ArrowUturnLeftIcon, CheckCircleIcon, InformationCircleIcon, TrendingUpIcon } from './Icons';
import MenteeGuidanceView from './MenteeGuidanceView';
import { MentorDashboard, type MentorDashboardView } from './MentorDashboard';
import ConfirmationModal from './ConfirmationModal';
import RapotView from './RapotView';
import Persetujuan from './Persetujuan';
import { createPortal } from 'react-dom';
import { TeamAttendanceView } from './TeamAttendanceView';
import Analytics from './Analytics';
import { getTodayLocalDateString, createLocalDate, normalizeDate, formatDateTimeIndonesia, formatDateIndonesia } from '../utils/dateUtils';


const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

const TabButton: React.FC<{
    label: string;
    icon: React.FC<{ className: string }>;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
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
    const { performanceData, monthlyStats } = useMemo(() => {
        console.info('🔄 KinerjaView useMemo running!');
        console.info('📊 Employee monthlyActivities:', employee.monthlyActivities);

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthProgress = employee.monthlyActivities?.[currentMonthKey] || {};

        console.info('📅 Current month:', currentMonthKey);
        // 🔥 FIX: Merge manual activities with automation data (Reading & Quran history)
        // This ensures "Membaca Al-Quran dan buku" is synced from history tables
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

        console.info('📚 Enriched Month Progress with Reading History:', enrichedMonthProgress);

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

                console.info(`  ✨ ${activity.title}: achieved=${achieved}, target=${activity.monthlyTarget}, percentage=${percentage}%`);

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

        console.info('📈 Final performance data:', categoryResults);
        console.info('📊 Final monthly stats:', statsForCards);

        return { performanceData: categoryResults, monthlyStats: statsForCards };
    }, [employee.monthlyActivities, dailyActivitiesConfig]);

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
                    <div className="w-full min-w-[700px] md:min-w-0 h-80 min-h-80">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={300}>
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
                                            <span className="font-medium text-white text-sm leading-tight break-words flex-shrink">{activity.title}</span>
                                            <span className="font-semibold text-blue-200 text-xs flex-shrink-0">{activity.achieved} / {activity.target}</span>
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
    submissions: WeeklyReportSubmission[];
    todayForMaxDate: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ employee, onLogBookReading, onDeleteReadingHistory, submissions, todayForMaxDate }) => {
    const [bookTitle, setBookTitle] = useState('');
    const [pagesRead, setPagesRead] = useState('');
    const [dateCompleted, setDateCompleted] = useState(getTodayLocalDateString());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookTitle || !pagesRead || !dateCompleted) {
            alert("Harap isi semua kolom.");
            return;
        }
        onLogBookReading(bookTitle, pagesRead, dateCompleted);
        setBookTitle('');
        setPagesRead('');
        setDateCompleted(getTodayLocalDateString());
    };

    const [isLocked, lockReason] = useMemo(() => {
        if (!dateCompleted) return [true, "Pilih tanggal"];

        const selectedDateObj = createLocalDate(dateCompleted);
        const monthKey = dateCompleted.slice(0, 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const normalizedSelectedDate = normalizeDate(selectedDateObj);
        if (normalizedSelectedDate > today) {
            return [true, "Tidak bisa mengisi tanggal di masa depan."];
        }

        const selectedMonthDate = createLocalDate(monthKey + '-02');
        const weeksForSelectedMonth = getBalancedWeeks(selectedMonthDate);
        const dayOfMonth = selectedDateObj.getDate();
        const weekIndexOfSelected = weeksForSelectedMonth.findIndex(w => w.days.includes(dayOfMonth));

        if (weekIndexOfSelected === -1) {
            if (process.env.NODE_ENV === "development") console.error('Week calculation error in ReadingActivityCard:', {
                dateCompleted,
                selectedDateObj,
                monthKey,
                weeksForSelectedMonth,
                dayOfMonth
            });
            return [true, "Tanggal tidak valid. Silakan hubungi admin."];
        }

        const currentMonthForToday = new Date(today.getFullYear(), today.getMonth(), 1);
        const weeksForCurrentMonth = getBalancedWeeks(currentMonthForToday);
        const currentDay = today.getDate();
        const currentWeekIndexForToday = weeksForCurrentMonth.findIndex(w => w.days.includes(currentDay));

        const isSameMonthAndYearAsToday = selectedDateObj.getFullYear() === today.getFullYear() && selectedDateObj.getMonth() === today.getMonth();
        const isCurrentWeek = isSameMonthAndYearAsToday && weekIndexOfSelected === currentWeekIndexForToday;

        if (!isCurrentWeek) {
            return [true, "Hanya pekan berjalan yang bisa diisi."];
        }

        const currentWeeklySubmission = submissions.find(s => s.monthKey === monthKey && s.weekIndex === weekIndexOfSelected);
        if (currentWeeklySubmission && (currentWeeklySubmission.status.startsWith('pending_') || currentWeeklySubmission.status === 'approved')) {
            return [true, "Pekan ini sudah diajukan."];
        }

        return [false, ""];
    }, [dateCompleted, submissions]);

    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col justify-between gap-3 sm:gap-4">
            <h4 className="text-base sm:text-lg font-bold text-white">Membaca Al-Quran dan buku</h4>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                    <label className="text-xs sm:text-sm font-medium text-blue-200 block mb-1.5">Judul Buku</label>
                    <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Contoh: Fiqih Ibadah" className="w-full bg-white/10 border border-white/30 rounded-lg p-3 sm:p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white text-base sm:text-sm" />
                </div>
                <div>
                    <label className="text-xs sm:text-sm font-medium text-blue-200 block mb-1.5">Halaman Dibaca</label>
                    <input type="text" value={pagesRead} onChange={e => setPagesRead(e.target.value)} placeholder="Contoh: 1-15, 20" className="w-full bg-white/10 border border-white/30 rounded-lg p-3 sm:p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white text-base sm:text-sm" />
                </div>
                <div>
                    <label className="text-xs sm:text-sm font-medium text-blue-200 block mb-1.5">Tanggal Selesai</label>
                    <input type="date" value={dateCompleted} onChange={e => setDateCompleted(e.target.value)} max={todayForMaxDate} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 sm:p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white text-base sm:text-sm" style={{ colorScheme: 'dark' }} />
                </div>
                {isLocked ? (
                    <div className="w-full font-semibold py-3 sm:py-2.5 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 bg-gray-700/50 text-gray-400 cursor-not-allowed text-sm sm:text-base">
                        <LockClosedIcon className="w-5 h-5" /> <span className="truncate">{lockReason}</span>
                    </div>
                ) : (
                    <button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 sm:py-2.5 px-4 rounded-lg shadow-md transition-colors text-base sm:text-sm">
                        Laporkan
                    </button>
                )}
            </form>
        </div>
    );
};

const SimpleActivityCard: React.FC<{
    activity: { id: string; title: string };
    employee: Employee;
    onLogManualActivity: (activityId: string, date: string) => void;
    submissions: WeeklyReportSubmission[];
    todayForMaxDate: string;
}> = ({ activity, employee, onLogManualActivity, submissions, todayForMaxDate }) => {
    const [date, setDate] = useState(getTodayLocalDateString());

    const isDone = useMemo(() => {
        if (!date) return false;
        const monthKey = date.slice(0, 7);
        const dayKey = date.slice(8, 10);
        return employee.monthlyActivities?.[monthKey]?.[dayKey]?.[activity.id] ?? false;
    }, [date, employee.monthlyActivities, activity.id]);

    const [isLocked, lockReason] = useMemo(() => {
        if (!date) return [true, "Pilih tanggal"];

        const selectedDateObj = createLocalDate(date);
        const monthKey = date.slice(0, 7);

        // --- Get today's date, normalized to midnight for comparison ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // --- Check if the selected date is in the future ---
        const normalizedSelectedDate = normalizeDate(selectedDateObj);
        if (normalizedSelectedDate > today) {
            return [true, "Tidak bisa mengisi tanggal di masa depan."];
        }

        // --- Determine the week of the selected date ---
        const selectedMonthDate = createLocalDate(monthKey + '-02');
        const weeksForSelectedMonth = getBalancedWeeks(selectedMonthDate);
        const dayOfMonth = selectedDateObj.getDate();
        const weekIndexOfSelected = weeksForSelectedMonth.findIndex(w => w.days.includes(dayOfMonth));

        if (weekIndexOfSelected === -1) {
            if (process.env.NODE_ENV === "development") console.error('Week calculation error:', {
                date,
                selectedDateObj,
                monthKey,
                weeksForSelectedMonth,
                dayOfMonth
            });
            return [true, "Tanggal tidak valid. Silakan hubungi admin."];
        }

        // --- Determine the current week based on today's date ---
        const currentMonthForToday = new Date(today.getFullYear(), today.getMonth(), 1);
        const weeksForCurrentMonth = getBalancedWeeks(currentMonthForToday);
        const currentDay = today.getDate();
        const currentWeekIndexForToday = weeksForCurrentMonth.findIndex(w => w.days.includes(currentDay));

        // --- Check if the selected date is within the current week ---
        const isSameMonthAndYearAsToday = selectedDateObj.getFullYear() === today.getFullYear() && selectedDateObj.getMonth() === today.getMonth();
        const isCurrentWeek = isSameMonthAndYearAsToday && weekIndexOfSelected === currentWeekIndexForToday;

        if (!isCurrentWeek) {
            return [true, "Hanya pekan berjalan yang bisa diisi."];
        }

        // --- If it IS the current week and not a future date, check submission status ---
        const currentWeeklySubmission = submissions.find(s => s.monthKey === monthKey && s.weekIndex === weekIndexOfSelected);
        if (currentWeeklySubmission && (currentWeeklySubmission.status.startsWith('pending_') || currentWeeklySubmission.status === 'approved')) {
            return [true, "Pekan ini sudah diajukan."];
        }

        return [false, ""];
    }, [date, submissions]);

    const handleSubmit = () => {
        if (process.env.NODE_ENV === "development") console.log('🔵 [SimpleActivityCard] handleSubmit called for activity:', activity.title, 'activity.id:', activity.id, 'date:', date);
        if (!date) {
            alert("Harap pilih tanggal.");
            return;
        }
        if (process.env.NODE_ENV === "development") console.log('🔵 [SimpleActivityCard] Calling onLogManualActivity with:', activity.id, date);
        onLogManualActivity(activity.id, date);
        if (process.env.NODE_ENV === "development") console.log('🔵 [SimpleActivityCard] onLogManualActivity call completed');
    };

    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/10 flex flex-col justify-between gap-3 sm:gap-4">
            <h4 className="text-base sm:text-lg font-bold text-white leading-tight">{activity.title}</h4>
            <div className="space-y-3 sm:space-y-4">
                <div>
                    <label className="text-xs sm:text-sm font-medium text-blue-200 block mb-1.5">Pilih Tanggal</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayForMaxDate} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 sm:p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white text-base sm:text-sm" style={{ colorScheme: 'dark' }} />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isDone || isLocked}
                    className={`w-full font-semibold py-3 sm:py-2.5 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm sm:text-base ${isLocked
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : isDone
                            ? 'bg-green-500/80 text-white cursor-not-allowed'
                            : 'bg-teal-500 hover:bg-teal-400 text-white'
                        }`}
                >
                    {isLocked ? (
                        <>
                            <LockClosedIcon className="w-5 h-5" /> <span className="truncate">{lockReason}</span>
                        </>
                    ) : isDone ? (
                        <>
                            <CheckIcon className="w-5 h-5" /> Sudah Dilaporkan
                        </>
                    ) : 'Lapor Telah Melakukan'}
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
        if (process.env.NODE_ENV === "development") console.log('📚 RiwayatBacaan processing history:', {
            hasBookHistory: !!employee.readingHistory,
            bookCount: employee.readingHistory?.length || 0,
            hasQuranHistory: !!employee.quranReadingHistory,
            quranCount: employee.quranReadingHistory?.length || 0
        });

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
                    <span className="font-semibold text-xs sm:text-sm text-teal-300 px-2 sm:px-4 text-center flex-grow">
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
                                        <TrashIcon className="w-4 h-4 sm:w-4 sm:h-4" />
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

const ToDoListView: React.FC<{
    employee: Employee;
    onUpdateTodoList: (userId: string, todoList: ToDoItem[]) => void;
}> = ({ employee, onUpdateTodoList }) => {
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [viewingTodo, setViewingTodo] = useState<ToDoItem | null>(null);
    const [editingTodo, setEditingTodo] = useState<ToDoItem | null>(null);
    const [confirmingAction, setConfirmingAction] = useState<{ type: 'complete' | 'delete' | 'reopen'; todo: ToDoItem } | null>(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [editCompletionNotes, setEditCompletionNotes] = useState('');

    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [newNotes, setNewNotes] = useState('');

    // Filters
    const [titleFilter, setTitleFilter] = useState('');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [monthFilter, setMonthFilter] = useState<string>('all');

    // Calendar Date Range Picker State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarDisplayDate, setCalendarDisplayDate] = useState(new Date());
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Close calendar on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const todoList = useMemo(() => employee.todoList || [], [employee.todoList]);

    const availableYears = useMemo(() => {
        if (todoList.length === 0) return [new Date().getFullYear().toString()];
        const years = new Set(todoList.map(t => new Date(t.createdAt).getFullYear().toString()));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [todoList]);

    const filteredToDoList = useMemo(() => {
        return todoList.filter(todo => {
            if (titleFilter && !todo.title.toLowerCase().includes(titleFilter.toLowerCase())) {
                return false;
            }

            // Date range filter has priority
            if (dateRange.start && todo.date) {
                const todoDate = createLocalDate(todo.date);
                const startDate = new Date(dateRange.start);
                startDate.setHours(0, 0, 0, 0);

                if (dateRange.end) {
                    const endDate = new Date(dateRange.end);
                    endDate.setHours(0, 0, 0, 0);
                    return todoDate >= startDate && todoDate <= endDate;
                }
                // If only start is selected, it acts as a single day filter
                return todoDate.getTime() === startDate.getTime();
            } else if (dateRange.start && !todo.date) {
                // Task has no date, so it doesn't match range filter
                return false;
            }

            // If no date range, use year/month filters
            if (!todo.date) {
                // Tasks without a date only show when year/month filters are 'all'
                return yearFilter === 'all' && monthFilter === 'all';
            }

            const todoDate = createLocalDate(todo.date);
            const todoYear = todoDate.getFullYear().toString();
            const todoMonth = (todoDate.getMonth() + 1).toString();

            const yearMatch = yearFilter === 'all' || todoYear === yearFilter;
            const monthMatch = monthFilter === 'all' || todoMonth === monthFilter;

            return yearMatch && monthMatch;
        });
    }, [todoList, titleFilter, yearFilter, monthFilter, dateRange]);


    const handleSetYearFilter = (year: string) => {
        setYearFilter(year);
        setDateRange({ start: null, end: null }); // Reset date range when year changes
    };

    const handleSetMonthFilter = (month: string) => {
        setMonthFilter(month);
        setDateRange({ start: null, end: null }); // Reset date range when month changes
    };

    const handleClearDateRange = () => {
        setDateRange({ start: null, end: null });
        setHoverDate(null);
        setIsCalendarOpen(false);
    };

    const handleResetFilters = () => {
        setTitleFilter('');
        setYearFilter('all');
        setMonthFilter('all');
        handleClearDateRange();
    };

    const activeTasks = useMemo(() => filteredToDoList.filter(t => !t.completed).sort((a, b) => (new Date(a.date || 0).getTime()) - (new Date(b.date || 0).getTime())), [filteredToDoList]);
    const completedTasks = useMemo(() => filteredToDoList.filter(t => t.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)), [filteredToDoList]);

    const resetAddForm = () => {
        setNewTitle('');
        setNewDate('');
        setNewTime('');
        setNewNotes('');
        setIsAddModalOpen(false);
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        const newTodo: ToDoItem = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            date: newDate || null,
            time: newTime || null,
            notes: newNotes.trim() || null,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
            completionNotes: null,
        };
        onUpdateTodoList(employee.id, [...todoList, newTodo]);
        resetAddForm();
    };

    const handleCompleteTask = () => {
        if (confirmingAction?.type !== 'complete') return;
        const updatedList = todoList.map(task =>
            task.id === confirmingAction.todo.id
                ? { ...task, completed: true, completedAt: Date.now(), completionNotes: completionNotes.trim() || null }
                : task
        );
        onUpdateTodoList(employee.id, updatedList);
        setConfirmingAction(null);
        setCompletionNotes('');
    };

    const handleEditCompletionNotes = () => {
        if (!editingTodo) return;
        const updatedList = todoList.map(task =>
            task.id === editingTodo.id
                ? { ...task, completionNotes: editCompletionNotes.trim() || null }
                : task
        );
        onUpdateTodoList(employee.id, updatedList);
        setEditingTodo(null);
        setEditCompletionNotes('');
    };

    const handleReopenTask = () => {
        if (confirmingAction?.type !== 'reopen') return;
        const updatedList = todoList.map(task =>
            task.id === confirmingAction.todo.id
                ? { ...task, completed: false, completedAt: null, completionNotes: null }
                : task
        );
        onUpdateTodoList(employee.id, updatedList);
        setConfirmingAction(null);
    };

    const handleDeleteTask = () => {
        if (confirmingAction?.type !== 'delete') return;
        const updatedList = todoList.filter(task => task.id !== confirmingAction.todo.id);
        onUpdateTodoList(employee.id, updatedList);
        setConfirmingAction(null);
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return null;
        return formatDateIndonesia(dateString, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (timestamp?: number | null) => {
        return formatDateTimeIndonesia(timestamp);
    };

    // Calendar logic
    const handleDateClick = (day: Date) => {
        handleSetYearFilter('all');
        handleSetMonthFilter('all');

        if (!dateRange.start || (dateRange.start && dateRange.end)) {
            setDateRange({ start: day, end: null });
            setHoverDate(null);
        } else {
            if (day < dateRange.start) {
                setDateRange({ start: day, end: null });
            } else {
                setDateRange({ start: dateRange.start, end: day });
                setIsCalendarOpen(false);
            }
            setHoverDate(null);
        }
    };

    const navigateCalendar = (direction: 'prev' | 'next') => {
        setCalendarDisplayDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = calendarDisplayDate.getFullYear();
        const month = calendarDisplayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === new Date().toDateString();

            let isInRange = false;
            let isHoverPreview = false;
            const isStart = dateRange.start && date.toDateString() === dateRange.start.toDateString();
            const isEnd = dateRange.end && date.toDateString() === dateRange.end.toDateString();

            if (dateRange.start && dateRange.end) {
                isInRange = date > dateRange.start && date < dateRange.end;
            } else if (dateRange.start && hoverDate) {
                const start = dateRange.start;
                const end = hoverDate;
                if (start <= end) {
                    isHoverPreview = date > start && date <= end;
                } else {
                    isHoverPreview = date >= end && date < start;
                }
            }

            const isOtherMonth = false; // The calendar doesn't show days from other months, so this is always false.

            // --- START FIX ---
            // Separated styling logic for clarity and correctness
            let selectionClasses = '';
            if (isStart || isEnd) {
                selectionClasses += ' bg-teal-500 text-white font-bold';
            }
            if (isStart && isEnd) {
                selectionClasses += ' is-selected-start is-selected-end is-single-day';
            } else if (isStart) {
                selectionClasses += ' is-selected-start';
            } else if (isEnd) {
                selectionClasses += ' is-selected-end';
            }
            // --- END FIX ---


            const cellClasses = [
                'date-cell w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-colors',
                isToday && !isStart && !isEnd && !isInRange ? 'border-2 border-teal-400' : '',
                isOtherMonth ? 'text-gray-500' : 'text-white hover:bg-white/10',
                selectionClasses,
                isInRange ? 'is-in-range bg-teal-300 text-teal-900' : '',
                isHoverPreview ? 'is-hover-preview' : '',
            ].join(' ');

            calendarDays.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => dateRange.start && !dateRange.end && setHoverDate(date)}
                    className={cellClasses}
                >
                    {day}
                </button>
            );
        }

        return (
            <div className="grid grid-cols-7 gap-1 text-center">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => <div key={day} className="text-xs font-bold text-gray-400">{day}</div>)}
                {calendarDays}
            </div>
        );
    };

    const formatDateForDisplay = (date: Date | null) => date ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';

    return (
        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-white/10 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <ListBulletIcon className="w-6 h-6 text-teal-300" />
                    To-Do List Pribadi
                </h3>
                <button onClick={() => setIsAddModalOpen(true)} className="flex-shrink-0 bg-teal-500 hover:bg-teal-400 text-white font-semibold p-2 rounded-lg shadow-md transition-colors flex items-center gap-2 text-sm">
                    <PlusCircleIcon className="w-5 h-5" /> Tambah Tugas
                </button>
            </div>

            <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <input type="text" placeholder="Cari berdasarkan judul..." value={titleFilter} onChange={e => setTitleFilter(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-teal-400" />
                    <div className="relative" ref={calendarRef}>
                        <label className="text-xs font-medium text-blue-100 block mb-1">Filter Rentang Tanggal</label>
                        <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white text-left flex justify-between items-center">
                            <span>{dateRange.start ? `${formatDateForDisplay(dateRange.start)} - ${formatDateForDisplay(dateRange.end)}` : 'Pilih Tanggal'}</span>
                            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                        </button>
                        {isCalendarOpen && (
                            <div className="absolute z-10 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl" onMouseLeave={() => setHoverDate(null)}>
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => navigateCalendar('prev')} className="p-2 rounded-full hover:bg-white/10">&lt;</button>
                                    <span className="font-semibold text-white">{calendarDisplayDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                                    <button onClick={() => navigateCalendar('next')} className="p-2 rounded-full hover:bg-white/10">&gt;</button>
                                </div>
                                {renderCalendar()}
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleClearDateRange} className="text-xs text-blue-300 hover:underline">Hapus Pilihan</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={yearFilter} onChange={e => handleSetYearFilter(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-teal-400">
                            <option value="all" className="bg-white text-black">Semua Tahun</option>
                            {availableYears.map(year => <option key={year} value={year} className="bg-white text-black">{year}</option>)}
                        </select>
                        <select value={monthFilter} onChange={e => handleSetMonthFilter(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-teal-400">
                            <option value="all" className="bg-white text-black">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, i) =>
                                <option key={i + 1} value={i + 1} className="bg-white text-black">{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                            )}
                        </select>
                    </div>
                </div>
                <div className="text-right">
                    <button onClick={handleResetFilters} className="px-4 py-1.5 text-xs font-semibold rounded-full bg-gray-700 hover:bg-gray-600 text-blue-200 transition-colors">
                        Reset Filter
                    </button>
                </div>
            </div>

            <div className="border-b border-white/10 flex">
                <button onClick={() => setActiveTab('active')} className={`py-2 px-4 font-semibold ${activeTab === 'active' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-gray-400'}`}>Tugas Aktif ({activeTasks.length})</button>
                <button onClick={() => setActiveTab('completed')} className={`py-2 px-4 font-semibold ${activeTab === 'completed' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-gray-400'}`}>Tugas Selesai ({completedTasks.length})</button>
            </div>

            <div className="space-y-3 min-h-[300px]">
                {activeTab === 'active' ? (
                    activeTasks.length > 0 ? activeTasks.map(task => (
                        <div key={task.id} className="bg-gray-700/50 p-3 rounded-lg flex items-center gap-3 animate-fade-in-up">
                            <div className="flex-grow">
                                <p className="font-semibold text-white">{task.title}</p>
                                {(task.date || task.time) && (
                                    <p className="text-xs text-blue-200 mt-1 flex items-center gap-1.5">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        {formatDate(task.date)} {task.time}
                                    </p>
                                )}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => setConfirmingAction({ type: 'complete', todo: task })} className="p-2 text-green-400 hover:text-green-300 rounded-full hover:bg-white/10" title="Selesaikan"><CheckIcon className="w-5 h-5" /></button>
                                <button onClick={() => setViewingTodo(task)} className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-white/10" title="Lihat Detail"><EyeIcon className="w-5 h-5" /></button>
                                <button onClick={() => setConfirmingAction({ type: 'delete', todo: task })} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10" title="Hapus"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )) : <p className="text-center pt-10 text-gray-400 italic">Tidak ada tugas aktif</p>
                ) : (
                    completedTasks.length > 0 ? completedTasks.map(task => (
                        <div key={task.id} className="bg-black/40 p-3 rounded-lg flex items-center gap-3 animate-fade-in">
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-400">{task.title}</p>
                                <p className="text-xs text-gray-500 mt-1">Selesai: {formatDateTime(task.completedAt)}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => setConfirmingAction({ type: 'reopen', todo: task })} className="p-2 text-yellow-400 hover:text-yellow-300 rounded-full hover:bg-white/10" title="Aktifkan Kembali"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                                <button onClick={() => { setEditingTodo(task); setEditCompletionNotes(task.completionNotes || ''); }} className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-white/10" title="Edit Catatan Selesai"><PencilIcon className="w-5 h-5" /></button>
                                <button onClick={() => setViewingTodo(task)} className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-white/10" title="Lihat Detail"><EyeIcon className="w-5 h-5" /></button>
                                <button onClick={() => setConfirmingAction({ type: 'delete', todo: task })} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10" title="Hapus"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )) : <p className="text-center pt-10 text-gray-400 italic">Belum ada tugas selesai</p>
                )}
            </div>

            {/* Modals */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                        <h3 className="text-lg font-bold text-white mb-4">Tambah Tugas Baru</h3>
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Judul Kegiatan" required className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white" style={{ colorScheme: 'dark' }} />
                                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white" style={{ colorScheme: 'dark' }} />
                            </div>
                            <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Catatan (opsional)" rows={3} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white"></textarea>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={resetAddForm} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan Tugas</button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}

            {viewingTodo && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/20 animate-pop-in">
                        <div className="p-6 border-b border-white/10">
                            <h3 className="text-2xl font-bold text-teal-300 leading-tight">{viewingTodo.title}</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                <div className="flex items-start gap-3">
                                    {viewingTodo.completed ? <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /> : <InformationCircleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />}
                                    <div>
                                        <p className="text-blue-200">Status</p>
                                        <p className={`font-semibold text-lg ${viewingTodo.completed ? 'text-green-300' : 'text-yellow-300'}`}>{viewingTodo.completed ? 'Selesai' : 'Aktif'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CalendarDaysIcon className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-blue-200">Jadwal</p>
                                        <p className="font-semibold text-white text-lg">{formatDate(viewingTodo.date) || 'Tidak diatur'} {viewingTodo.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <ClockIcon className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-blue-200">Dibuat pada</p>
                                        <p className="font-semibold text-white text-base">{formatDateTime(viewingTodo.createdAt)}</p>
                                    </div>
                                </div>
                                {viewingTodo.completed && (
                                    <div className="flex items-start gap-3">
                                        <CheckSquareIcon className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-blue-200">Diselesaikan pada</p>
                                            <p className="font-semibold text-white text-base">{formatDateTime(viewingTodo.completedAt)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(viewingTodo.notes || viewingTodo.completionNotes) && <hr className="border-t border-white/10" />}

                            {viewingTodo.notes && (
                                <div>
                                    <h4 className="font-semibold text-teal-300 mb-2">Catatan Awal</h4>
                                    <p className="text-white bg-black/20 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">{viewingTodo.notes}</p>
                                </div>
                            )}

                            {viewingTodo.completionNotes && (
                                <div>
                                    <h4 className="font-semibold text-teal-300 mb-2">Catatan Penyelesaian</h4>
                                    <p className="text-white bg-black/20 p-3 rounded-lg border border-white/10 whitespace-pre-wrap">{viewingTodo.completionNotes}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-900/50 rounded-b-2xl text-right">
                            <button onClick={() => setViewingTodo(null)} className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold text-white text-sm">Tutup</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {confirmingAction && confirmingAction.type === 'complete' && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                        <h3 className="text-lg font-bold text-white">Selesaikan Tugas</h3>
                        <p className="text-blue-200 my-2">Apakah Anda yakin ingin menyelesaikan tugas: <strong className="text-white">&quot;{confirmingAction.todo.title}&quot;</strong>?</p>
                        <textarea value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="Catatan penyelesaian (opsional)" rows={3} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white"></textarea>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => { setConfirmingAction(null); setCompletionNotes(''); }} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                            <button onClick={handleCompleteTask} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-semibold">Ya, Selesaikan</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {editingTodo && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                        <h3 className="text-lg font-bold text-white">Edit Catatan Selesai</h3>
                        <p className="text-blue-200 my-2">Ubah catatan untuk tugas: <strong className="text-white">&quot;{editingTodo.title}&quot;</strong>.</p>
                        <textarea value={editCompletionNotes} onChange={e => setEditCompletionNotes(e.target.value)} placeholder="Catatan penyelesaian (opsional)" rows={4} className="w-full bg-white/10 border border-white/30 rounded-lg p-3 text-white"></textarea>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => { setEditingTodo(null); setEditCompletionNotes(''); }} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                            <button onClick={handleEditCompletionNotes} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan Catatan</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {confirmingAction && (confirmingAction.type === 'delete' || confirmingAction.type === 'reopen') && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setConfirmingAction(null)}
                    onConfirm={confirmingAction.type === 'delete' ? handleDeleteTask : handleReopenTask}
                    title={confirmingAction.type === 'delete' ? 'Hapus Tugas' : 'Aktifkan Kembali Tugas'}
                    message={<>Apakah Anda yakin ingin {confirmingAction.type === 'delete' ? 'menghapus' : 'mengaktifkan kembali'} tugas: <strong className="block mt-2">&quot;{confirmingAction.todo.title}&quot;</strong>?</>}
                    confirmText={confirmingAction.type === 'delete' ? 'Ya, Hapus' : 'Ya, Aktifkan Kembali'}
                    confirmColorClass={confirmingAction.type === 'delete' ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'}
                />
            )}
        </div>
    );
};


interface AktivitasPribadiViewProps extends Pick<MyDashboardViewProps, 'dailyActivitiesConfig' | 'onLogBookReading' | 'onLogManualActivity' | 'onDeleteReadingHistory' | 'onUpdateTodoList'> {
    submissions: WeeklyReportSubmission[];
    employee: Employee;
}

// Define SubTabButton component outside AktivitasPribadiView to avoid creating during render
const SubTabButton: React.FC<{
    label: string;
    tab: 'laporan' | 'riwayat' | 'todolist';
    isActive: boolean;
    onClick: (tab: 'laporan' | 'riwayat' | 'todolist') => void;
}> = ({ label, tab, isActive, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`py-3 px-4 sm:px-5 font-semibold transition-colors duration-200 border-b-2 whitespace-nowrap text-sm sm:text-base ${isActive ? 'border-teal-400 text-teal-300' : 'border-transparent text-gray-400 hover:text-white'
            }`}
    >
        {label}
    </button>
);

const AktivitasPribadiView: React.FC<AktivitasPribadiViewProps> = ({ employee, dailyActivitiesConfig, onLogBookReading, onLogManualActivity, onDeleteReadingHistory, onUpdateTodoList, submissions }) => {
    const [activeSubTab, setActiveSubTab] = useState<'laporan' | 'riwayat' | 'todolist'>('laporan');
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
                    <SubTabButton
                        label="To-Do List"
                        tab="todolist"
                        isActive={activeSubTab === 'todolist'}
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
            {activeSubTab === 'todolist' && (
                <div className="animate-view-change">
                    <ToDoListView employee={employee} onUpdateTodoList={onUpdateTodoList} />
                </div>
            )}
        </div>
    );
};


export const MyDashboard: React.FC<MyDashboardViewProps> = (props) => {
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
    } = props;
    /* eslint-enable */

    type DashboardTab = 'kinerja' | 'analytics' | 'rapot' | 'aktivitas-pribadi' | 'bimbingan' | 'panel-mentor' | 'persetujuan' | 'presensi-tim';

    const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab as DashboardTab || 'kinerja');
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

    // State for MentorDashboard subview
    const [mentorSubView, setMentorSubView] = useState<MentorDashboardView>('persetujuan');

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
        switch (activeTab) {
            case 'kinerja':
                return <MemoizedKinerjaView employee={employee} dailyActivitiesConfig={dailyActivitiesConfig} />;
            case 'analytics':
                return <Analytics allUsersData={props.allUsersData} dailyActivitiesConfig={dailyActivitiesConfig} />;
            case 'rapot':
                return <RapotView employee={employee} dailyActivitiesConfig={props.dailyActivitiesConfig} allUsersData={props.allUsersData} hospitals={props.hospitals} />;
            case 'aktivitas-pribadi':
                return <AktivitasPribadiView
                    employee={employee}
                    dailyActivitiesConfig={props.dailyActivitiesConfig}
                    onLogBookReading={props.onLogBookReading}
                    onLogManualActivity={props.onLogManualActivity}
                    onDeleteReadingHistory={props.onDeleteReadingHistory}
                    onUpdateTodoList={props.onUpdateTodoList}
                    submissions={props.weeklyReportSubmissions}
                />;
            case 'bimbingan':
                return <MenteeGuidanceView
                    employee={employee}
                    submissions={props.submissions}
                    onNavigateToReport={props.onNavigateToReport}
                    tadarusRequests={props.menteeTadarusRequests}
                    onTadarusRequest={props.onTadarusRequest}
                    tadarusSessions={props.tadarusSessions}
                    onMenteeAttendSession={props.onMenteeAttendSession}
                    missedPrayerRequests={props.menteeMissedPrayerRequests}
                    onCreateMissedPrayerRequest={props.onCreateMissedPrayerRequest}
                />;
            case 'panel-mentor':
                if (!hasMentorRole) return null;
                return <MentorDashboard
                    employee={employee}
                    allUsersData={props.allUsersData}
                    onUpdateProfile={props.onUpdateProfile}
                    weeklyReportSubmissions={props.weeklyReportSubmissions}
                    onReviewReport={props.onReviewReport}
                    tadarusSessions={props.tadarusSessions}
                    tadarusRequests={props.tadarusRequests}
                    onCreateTadarusSession={props.onCreateTadarusSession}
                    onUpdateTadarusSession={props.onUpdateTadarusSession}
                    onDeleteTadarusSession={props.onDeleteTadarusSession}
                    onReviewTadarusRequest={props.onReviewTadarusRequest}
                    missedPrayerRequests={props.missedPrayerRequests}
                    onReviewMissedPrayerRequest={props.onReviewMissedPrayerRequest}
                    onMentorAttendOwnSession={props.onMentorAttendOwnSession}
                    onLogAudit={props.onLogAudit}
                    onDeleteMenteeTarget={handleDeleteMenteeTarget}
                    mentorSubView={mentorSubView}
                    setMentorSubView={setMentorSubView}
                    menteesOfMentor={menteesOfMentor}
                    targetMenteeId={targetMenteeId}
                    setTargetMenteeId={setTargetMenteeId}
                    targetTitle={targetTitle}
                    setTargetTitle={setTargetTitle}
                    targetDescription={targetDescription}
                    setTargetDescription={setTargetDescription}
                    handleCreateTarget={handleCreateTarget}
                    setConfirmDeleteTarget={setConfirmDeleteTarget}
                    menteeTargets={menteeTargets.filter(t => t.mentorId === employee.id)}
                />;
            case 'persetujuan':
                if (!hasApprovalRole) return null;
                return <Persetujuan
                    loggedInEmployee={employee}
                    weeklyReportSubmissions={props.weeklyReportSubmissions}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Persetujuan component uses a simpler signature
                    onReviewReport={props.onReviewReport as any} // Cast because this component is simpler
                    allUsersData={props.allUsersData}
                />
            case 'presensi-tim':
                if (!canDoTeamAttendance) return null;
                return <TeamAttendanceView
                    loggedInEmployee={employee}
                    allUsersData={allUsersData}
                    teamAttendanceSessions={teamAttendanceSessions}
                    onCreateSessions={onCreateTeamAttendanceSessions}
                    onAddActivity={onAddActivity}
                    onUpdateAttendance={onUpdateTeamAttendance}
                    onDeleteSession={(session) => onDeleteTeamAttendanceSession(session.id)}
                    addToast={addToast}
                />
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="border-b border-white/20">
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 -mb-px min-w-max">
                        {initialTab === 'aktivitas-pribadi' ? (
                            <>
                                <TabButton label="Aktivitas Pribadi" icon={PencilIcon} active={activeTab === 'aktivitas-pribadi'} onClick={() => setActiveTab('aktivitas-pribadi')} />
                                <TabButton label="Bimbingan Saya" icon={AcademicCapIcon} active={activeTab === 'bimbingan'} onClick={() => setActiveTab('bimbingan')} />
                                {hasMentorRole && <TabButton label="Panel Mentor" icon={ShieldCheckIcon} active={activeTab === 'panel-mentor'} onClick={() => setActiveTab('panel-mentor')} />}
                                {hasApprovalRole && <TabButton label="Persetujuan" icon={CheckSquareIcon} active={activeTab === 'persetujuan'} onClick={() => setActiveTab('persetujuan')} />}
                                {canDoTeamAttendance && <TabButton label="Presensi Tim" icon={UserGroupIcon} active={activeTab === 'presensi-tim'} onClick={() => setActiveTab('presensi-tim')} />}
                            </>
                        ) : (
                            <>
                                <TabButton label="Kinerja" icon={ChartBarIcon} active={activeTab === 'kinerja'} onClick={() => setActiveTab('kinerja')} />
                                <TabButton label="Analytics" icon={TrendingUpIcon} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                                <TabButton label="Rapot APPI" icon={DocumentTextIcon} active={activeTab === 'rapot'} onClick={() => setActiveTab('rapot')} />
                            </>
                        )}
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