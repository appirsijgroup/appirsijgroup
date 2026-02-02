'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Employee, ReadingHistory, QuranReadingHistory, MonthlyReportSubmission, DailyActivity } from '../types';
import { CalendarDays, Clock, Check, Trash2, CheckSquare, Pencil, Lock, PlusCircle, List, Eye, RotateCcw, CheckCircle2, Info } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import MonthlyReportCard from './MonthlyReportCard';
import { createPortal } from 'react-dom';
import { getTodayLocalDateString, createLocalDate, normalizeDate, formatDateTimeIndonesia, formatDateIndonesia } from '../utils/dateUtils';
import type { QuranReadingSubmission } from '../services/quranSubmissionService';
import { useUIStore } from '@/store/store';

// Helper function to calculate balanced weeks
const getBalancedWeeks = (date: Date): { weekIndex: number, days: number[] }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        const currentDate = new Date(year, month, day);
        if (currentDate.getDay() === 0 || day === daysInMonth) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (weeks.length > 1 && weeks[0].length <= 2) {
        const firstWeek = weeks.shift()!;
        weeks[0] = [...firstWeek, ...weeks[0]];
    }

    if (weeks.length > 1 && weeks[weeks.length - 1].length <= 2) {
        const lastWeek = weeks.pop()!;
        weeks[weeks.length - 1] = [...weeks[weeks.length - 1], ...lastWeek];
    }

    return weeks.map((days, index) => ({ weekIndex: index, days }));
};

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
                        Membaca Buku
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

export const RiwayatBacaan: React.FC<{
    employee: Employee;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
}> = ({ employee, onDeleteReadingHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'book' | 'quran'; id: string; date: string; detail: string } | null>(null);

    const [quranSubmissions, setQuranSubmissions] = useState<QuranReadingSubmission[]>([]);
    const [quranReadingHistory, setQuranReadingHistory] = useState<QuranReadingHistory[]>([]);

    // Load Quran submissions from database
    useEffect(() => {
        const loadQuranData = async () => {
            if (!employee?.id) return;

            try {
                // Load Quran submissions
                const { getQuranSubmissions } = await import('../services/quranSubmissionService');
                const submissions = await getQuranSubmissions(employee.id);
                setQuranSubmissions(submissions);

                // Load Quran reading history from employee_quran_reading_history table
                const { getQuranReadingHistory } = await import('../services/readingHistoryService');
                const history = await getQuranReadingHistory(employee.id);
                setQuranReadingHistory(history);
            } catch (error) {
            }
        };

        loadQuranData();
    }, [employee?.id]);

    const combinedHistory = useMemo(() => {
        const bookHistory = (employee.readingHistory || []).map((r: ReadingHistory) => ({
            id: r.id,
            date: r.dateCompleted,
            type: 'Buku' as const,
            detail: `${r.bookTitle} (${r.pagesRead || 'N/A'})`,
        }));

        // Quran reading history from employee_quran_reading_history table (database)
        const quranHistoryFromTable = quranReadingHistory.map((r: QuranReadingHistory) => ({
            id: r.id || `quran-${r.date}-${r.surahNumber}`,
            date: r.date,
            type: 'Al-Qur\'an' as const,
            detail: `QS. ${r.surahName} [${r.surahNumber}:${r.startAyah}-${r.endAyah}]`,
        }));

        // Quran reading history from employee JSON field (legacy/fallback)
        const quranHistoryFromEmployee = (employee.quranReadingHistory || []).map((r: QuranReadingHistory) => ({
            id: r.id || `history-${r.date}-${r.surahNumber}`,
            date: r.date,
            type: 'Al-Qur\'an' as const,
            detail: `QS. ${r.surahName} [${r.surahNumber}:${r.startAyah}-${r.endAyah}]`,
        }));

        // Quran submissions from separate submissions table
        const quranHistoryFromSubmissions = quranSubmissions.map((r: QuranReadingSubmission) => ({
            id: r.id || `submission-${r.submissionDate}-${r.surahNumber}`,
            date: r.submissionDate,
            type: 'Al-Qur\'an' as const,
            detail: `QS. ${r.surahName} [${r.surahNumber}:${r.startAyah}-${r.endAyah}]`,
        }));

        // Merge and remove duplicates by ID to preserve multiple reports on the same day
        const allQuranHistory = [...quranHistoryFromTable, ...quranHistoryFromSubmissions, ...quranHistoryFromEmployee];
        const uniqueQuranHistory = Array.from(new Map(allQuranHistory.map(item => [item.id, item])).values());

        return [...bookHistory, ...uniqueQuranHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [employee.readingHistory, employee.quranReadingHistory, quranSubmissions, quranReadingHistory]);

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
        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-white/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Riwayat Bacaan</h3>
                <div className="flex items-center justify-between bg-black/20 p-1 rounded-full">
                    <button onClick={() => navigateMonth('prev')} className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                        &larr;
                    </button>
                    <span className="font-semibold text-sm text-teal-300 px-4 w-40 text-center">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">
                        &rarr;
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Jenis</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Detail</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length > 0 ? filteredHistory.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDateIndonesia(item.date)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'Al-Qur\'an' ? 'bg-teal-500/20 text-teal-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{item.detail}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => setConfirmDelete({ type: item.type.toLowerCase() as 'book' | 'quran', id: item.id, date: item.date, detail: item.detail })}
                                        className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 transition-all shadow-sm hover:shadow-md"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center p-8 text-blue-200">Tidak ada riwayat bacaan pada bulan ini.</td></tr>
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

const AktivitasPribadiView: React.FC<AktivitasPribadiViewProps> = ({ employee, dailyActivitiesConfig, onLogBookReading, onLogManualActivity, onDeleteReadingHistory, submissions, onSubmitMonthlyReport }) => {
    const todayForMaxDate = useMemo(() => getTodayLocalDateString(), []);
    const currentMonthKey = useMemo(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const manualActivities = useMemo(() => {
        return dailyActivitiesConfig.filter(act => {
            if (act.automationTrigger?.type !== 'MANUAL_USER_REPORT') return false;
            const excludedActivityIds = ['persyarikatan', 'kajian_selasa'];
            return !excludedActivityIds.includes(act.id);
        });
    }, [dailyActivitiesConfig]);

    return (
        <div className="animate-view-change">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReadingActivityCard
                    employee={employee}
                    onLogBookReading={onLogBookReading}
                    onDeleteReadingHistory={onDeleteReadingHistory}
                    submissions={submissions}
                    todayForMaxDate={todayForMaxDate}
                    dailyActivitiesConfig={dailyActivitiesConfig}
                />
                {manualActivities.map(activity => (
                    <MonthlyReportCard
                        key={activity.id}
                        activity={activity}
                        employeeId={employee.id}
                        monthKey={currentMonthKey}
                    />
                ))}
            </div>

            {/* MonthlySubmissionPanel removed as requested */}
        </div>
    );
};

export interface AktivitasPribadiViewProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
    onLogManualActivity: (activityId: string, date: string) => void;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
    submissions: MonthlyReportSubmission[];
    onSubmitMonthlyReport: (monthKey: string) => void;
}

export { AktivitasPribadiView };
