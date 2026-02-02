import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type MonthlyActivityProgress, type MonthlyReportSubmission, type DailyActivity, type MutabaahLockingMode } from '../types';
import { CheckSquare, Square, Send, CalendarDays, Lock } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useUIStore } from '@/store/store';

interface MonthlyActivitiesProps {
    employee: Employee;
    allUsers: Employee[];
    monthlyProgressData: Record<string, MonthlyActivityProgress>;
    onUpdate: (userId: string, monthKey: string, updates: MonthlyActivityProgress) => void;
    onActivateMonth: (userId: string, monthKey: string) => void;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onSubmitReport: (monthKey: string) => void;
    date: Date;
    onDateChange: (newDate: Date) => void;
    dailyActivitiesConfig: DailyActivity[];
    mutabaahLockingMode: MutabaahLockingMode;
}

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

const MonthlyActivities: React.FC<MonthlyActivitiesProps> = ({
    employee,
    allUsers,
    monthlyProgressData,
    onUpdate,
    onActivateMonth,
    monthlyReportSubmissions,
    onSubmitReport,
    date,
    onDateChange,
    dailyActivitiesConfig,
    mutabaahLockingMode
}) => {
    const { addToast } = useUIStore();
    const [isDirty, setIsDirty] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [submissionConfirmation, setSubmissionConfirmation] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<'prev' | 'next' | null>(null);

    const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
    const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
    const [isActivating, setIsActivating] = useState(false);

    const userMap = useMemo(() => {
        const map = new Map<string, Employee>();
        if (Array.isArray(allUsers)) {
            allUsers.forEach(u => {
                if (u.id) map.set(String(u.id).trim(), u);
            });
        }
        return map;
    }, [allUsers]);

    const kaUnit = useMemo(() => userMap.get(String(employee.kaUnitId || '').trim()), [userMap, employee.kaUnitId]);
    const supervisor = useMemo(() => userMap.get(String(employee.supervisorId || '').trim()), [userMap, employee.supervisorId]);
    const mentor = useMemo(() => userMap.get(String(employee.mentorId || '').trim()), [userMap, employee.mentorId]);

    const kaUnitName = kaUnit?.name;
    const supervisorName = supervisor?.name;
    const mentorName = mentor?.name;

    const monthKey = useMemo(() => {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }, [date]);

    const safeMonthlyProgressData = monthlyProgressData || {};
    const progress = useMemo(() => safeMonthlyProgressData[monthKey] || {}, [safeMonthlyProgressData, monthKey]);

    const isMonthActivated = useMemo(() => {
        const months = employee.activatedMonths || employee.activated_months || [];
        return months.includes(monthKey);
    }, [employee.activatedMonths, employee.activated_months, monthKey]);

    const daysInMonth = useMemo(() => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), [date]);

    const weeks = useMemo(() => getBalancedWeeks(date), [date]);

    const currentMonthlySubmission = useMemo(() => {
        return monthlyReportSubmissions.find(s => s.monthKey === monthKey);
    }, [monthlyReportSubmissions, monthKey]);

    const isPastMonth = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDateOfMonth = new Date(date.getFullYear(), date.getMonth(), daysInMonth);
        lastDateOfMonth.setHours(23, 59, 59, 999);
        return lastDateOfMonth < today;
    }, [date, daysInMonth]);

    const isReadOnly = useMemo(() => {
        if (currentMonthlySubmission && (currentMonthlySubmission.status.startsWith('pending_') || currentMonthlySubmission.status === 'approved')) return true;
        if (isPastMonth) return true;
        return false;
    }, [currentMonthlySubmission, isPastMonth]);

    useEffect(() => {
        setIsDirty(false);
        setSuccessMessage('');
        const today = new Date();
        if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) {
            const dayOfMonth = today.getDate();
            const weekIndex = weeks.findIndex(w => w.days.includes(dayOfMonth));
            setCurrentWeekIndex(weekIndex >= 0 ? weekIndex : 0);
        } else {
            setCurrentWeekIndex(0);
        }
    }, [monthKey, weeks, date]);

    useEffect(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const selectedYear = date.getFullYear();
        const selectedMonth = date.getMonth();

        if (selectedYear === currentYear && selectedMonth > currentMonth) {
            const adjustedDate = new Date(date);
            adjustedDate.setMonth(currentMonth);
            onDateChange(adjustedDate);
        }
    }, [date.getFullYear(), date.getMonth(), onDateChange]);

    const handleProgressChange = (day: string, activityId: string, value: boolean) => {
        if (isReadOnly) return;
        const newMonthProgress = JSON.parse(JSON.stringify(progress));
        if (!newMonthProgress[day]) {
            newMonthProgress[day] = {};
        }
        if (value) {
            newMonthProgress[day][activityId] = true;
        } else {
            delete newMonthProgress[day][activityId];
        }
        onUpdate(employee.id, monthKey, newMonthProgress);
        if (!isDirty) setIsDirty(true);
    };

    const handleConfirmNavigation = () => {
        if (pendingNavigation) {
            const newDate = new Date(date);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (pendingNavigation === 'prev' ? -1 : 1));
            onDateChange(newDate);
            setPendingNavigation(null);
        }
    };

    const handleSubmission = () => {
        if (isDirty && !isReadOnly) {
            addToast("Harap simpan perubahan Anda terlebih dahulu sebelum mengajukan laporan.", 'error');
            return;
        }
        setSubmissionConfirmation(true);
    };

    const executeSubmission = () => {
        onSubmitReport(monthKey);
        setSuccessMessage('Laporan bulanan berhasil diajukan ke mentor!');
        setSubmissionConfirmation(false);
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    const handleActivateClick = async () => {
        if (isPastMonth) return;
        setIsActivating(true);
        try {
            await onActivateMonth(employee.id, monthKey);
            setSuccessMessage('Lembar Mutaba\'ah berhasil diaktifkan!');
            setIsActivating(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setIsActivating(false);
        }
    };

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, typeof dailyActivitiesConfig>);
    }, [dailyActivitiesConfig]);

    const activityProgressCounts = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            const count = Object.values(progress).reduce((dayCount, dailyProgress) => {
                return dayCount + (dailyProgress[activity.id] ? 1 : 0);
            }, 0);
            acc[activity.id] = count;
            return acc;
        }, {} as Record<string, number>);
    }, [progress, dailyActivitiesConfig]);

    const weeklyAchievedCounts = useMemo(() => {
        if (!weeks[currentWeekIndex]) return {};
        const weeklyDays = weeks[currentWeekIndex].days;
        const counts: Record<string, number> = {};
        dailyActivitiesConfig.forEach(activity => {
            const weeklyAchieved = weeklyDays.reduce((acc, day) => {
                const dayKey = day.toString().padStart(2, '0');
                return acc + (progress[dayKey]?.[activity.id] ? 1 : 0);
            }, 0);
            counts[activity.id] = weeklyAchieved;
        });
        return counts;
    }, [dailyActivitiesConfig, weeks, currentWeekIndex, progress]);

    const weeklyProgressSummary = useMemo(() => {
        if (!weeks[currentWeekIndex]) return {};
        const weeklyDays = weeks[currentWeekIndex].days;
        const summary = dailyActivitiesConfig.map(activity => {
            const isDailyTask = activity.monthlyTarget > 7;
            const target = isDailyTask ? weeklyDays.length : activity.monthlyTarget;
            const monthlyAchieved = activityProgressCounts[activity.id] || 0;
            const weeklyAchieved = weeklyAchievedCounts[activity.id] || 0;
            const achieved = isDailyTask ? weeklyAchieved : monthlyAchieved;
            const percentage = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
            return {
                id: activity.id,
                title: activity.title,
                category: activity.category,
                achieved,
                target,
                percentage,
            };
        });
        return summary.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, typeof summary>);
    }, [dailyActivitiesConfig, weeks, currentWeekIndex, progress, activityProgressCounts, weeklyAchievedCounts]);

    const statusConfig = {
        pending_mentor: { label: "Menunggu Mentor", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400" },
        pending_supervisor: { label: "Menunggu SPV", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
        pending_kaunit: { label: "Menunggu Ka. Unit", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
        pending_manager: { label: "Menunggu Manajer", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
        approved: { label: "Disetujui", color: "bg-green-500/20 text-green-300", dot: "bg-green-400" },
        rejected_mentor: { label: "Ditolak Mentor", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
        rejected_supervisor: { label: "Ditolak SPV", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
        rejected_kaunit: { label: "Ditolak Ka. Unit", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
        rejected_manager: { label: "Ditolak Manajer", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
    };

    const todayFixed = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const todayDay = todayFixed.getDate();
    const isCurrentMonthView = todayFixed.getFullYear() === date.getFullYear() && todayFixed.getMonth() === date.getMonth();

    const selectedWeekDays = weeks[currentWeekIndex]?.days || [];

    const monthOptions = useMemo(() => {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const isCurrentYear = date.getFullYear() === new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        return months.map((month, index) => ({
            value: index,
            label: month,
            disabled: isCurrentYear && index > currentMonth
        })).filter(option => !option.disabled);
    }, [date]);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 2; i <= currentYear; i++) {
            years.push({ value: i, label: i.toString() });
        }
        return years.reverse();
    }, []);

    const canSubmitThisMonth = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const viewYear = date.getFullYear();
        const viewMonth = date.getMonth();
        if (viewYear > currentYear || (viewYear === currentYear && viewMonth > currentMonth)) return false;
        if (viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth)) return true;
        return today.getDate() >= 28;
    }, [date]);

    const submissionConfirmationModal = createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">
                    {canSubmitThisMonth ? "Konfirmasi Pengajuan Laporan" : "Laporan Belum Dapat Dikirim"}
                </h3>
                <div className="text-blue-200 mb-4">
                    {canSubmitThisMonth ? (
                        <>
                            <p>Apakah Anda yakin ingin mengajukan laporan untuk bulan <strong>{date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong> kepada mentor Anda?</p>
                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-200">
                                <p className="font-semibold text-blue-300 mb-1">Penting:</p>
                                <p>Pastikan semua data aktivitas sudah terisi lengkap. Setelah dikirim, Anda tidak dapat mengubah data kecuali laporan ditolak.</p>
                            </div>
                        </>
                    ) : (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-yellow-200 font-medium mb-2">Laporan bulan {date.toLocaleDateString('id-ID', { month: 'long' })} belum bisa dikirim.</p>
                            <p className="text-sm text-yellow-100/80">Pengiriman laporan baru dibuka pada akhir bulan (tanggal <strong>28 - 31</strong>).<br /><br />Silakan lanjutkan pengisian mutaba'ah harian Anda.</p>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setSubmissionConfirmation(false)} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold focus:ring-2 focus:ring-gray-400 focus:outline-none">
                        {canSubmitThisMonth ? "Batal" : "Tutup"}
                    </button>
                    {canSubmitThisMonth && (
                        <button onClick={executeSubmission} className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-lg shadow-blue-600/20">
                            Ya, Ajukan
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-black/20 p-4 rounded-xl">
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-2">Bulan</label>
                    <select
                        value={date.getMonth()}
                        onChange={(e) => {
                            const newDate = new Date(date);
                            newDate.setMonth(parseInt(e.target.value));
                            onDateChange(newDate);
                        }}
                        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    >
                        {monthOptions.map((month) => (
                            <option key={month.value} value={month.value} className="text-black bg-white">{month.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-2">Tahun</label>
                    <select
                        value={date.getFullYear()}
                        onChange={(e) => {
                            const newDate = new Date(date);
                            newDate.setFullYear(parseInt(e.target.value));
                            onDateChange(newDate);
                        }}
                        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    >
                        {yearOptions.map((year) => (
                            <option key={year.value} value={year.value} className="text-black bg-white">{year.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-2">Tipe Laporan</label>
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value as 'weekly' | 'monthly')}
                        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    >
                        <option value="weekly" className="text-black bg-white">Laporan Mingguan</option>
                        <option value="monthly" className="text-black bg-white">Rekap Bulanan</option>
                    </select>
                </div>
            </div>

            {!isMonthActivated ? (
                <div className="flex flex-col items-center justify-center text-center bg-black/20 rounded-2xl p-8 sm:p-12 animate-view-change border-2 border-dashed border-teal-500/50 w-full max-w-7xl mx-auto">
                    <CalendarDays className="w-20 h-20 text-teal-300 mb-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Aktivasi Lembar Mutaba'ah Diperlukan</h2>
                    <p className="text-blue-200 text-base sm:text-lg mt-3 max-w-3xl">Untuk dapat melakukan presensi dan mencatat aktivitas lainnya, Anda harus mengaktifkan Lembar Mutaba'ah untuk bulan <strong>{date.toLocaleDateString('id-ID', { month: 'long' })}</strong> terlebih dahulu.</p>
                    <button
                        onClick={handleActivateClick}
                        disabled={isPastMonth || isActivating}
                        className="mt-8 bg-teal-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-teal-400 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-base flex items-center gap-2"
                    >
                        {isPastMonth || isActivating ? (
                            <>
                                {isActivating && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
                                {isPastMonth ? "Bulan Telah Lewat" : "Memproses..."}
                            </>
                        ) : "Aktifkan Lembar Mutaba'ah"}
                    </button>
                    {isPastMonth && <p className="text-xs text-yellow-300 mt-4">Anda tidak dapat mengaktifkan lembar untuk bulan yang telah berlalu.</p>}
                </div>
            ) : (
                <>
                    {isPastMonth && !currentMonthlySubmission && (
                        <div className="mb-6 mx-auto w-full max-w-7xl p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-4 animate-fade-in shadow-sm">
                            <div className="p-2 bg-yellow-500/20 rounded-lg shrink-0"><Lock className="w-6 h-6 text-yellow-500" /></div>
                            <div>
                                <h3 className="font-bold text-yellow-400 text-lg">Periode Pelaporan Berakhir</h3>
                                <p className="text-sm text-yellow-200/90 mt-1 leading-relaxed">Lembar mutaba'ah untuk bulan ini telah dikunci karena periode bulan telah berakhir. Anda tidak dapat menambah atau mengubah data aktivitas, namun Anda masih dapat mengirim laporan ini kepada mentor jika belum dikirim.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'weekly' && (
                        <div className="animate-view-change">
                            <div className="overflow-x-auto overflow-y-hidden touch-pan-x mb-6">
                                <div className="flex items-center justify-center gap-2 min-w-max">
                                    {weeks.map(({ weekIndex }) => (
                                        <button
                                            key={weekIndex}
                                            onClick={() => setCurrentWeekIndex(weekIndex)}
                                            className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-colors ${currentWeekIndex === weekIndex ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-blue-200'}`}
                                        >
                                            Pekan {weekIndex + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-white/20">
                                <table className="min-w-full text-sm text-left text-white border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-3 font-semibold min-w-[200px] text-left sm:sticky sm:left-0 sm:z-20 bg-gray-900">Aktivitas</th>
                                            <th className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[200px] sm:z-20 bg-gray-900">Progres</th>
                                            {selectedWeekDays.map(day => (
                                                <th key={day} className={`px-2 py-3 font-bold text-center w-12 ${isCurrentMonthView && day === todayDay ? 'bg-teal-700' : 'bg-gray-800'}`}>
                                                    {new Date(date.getFullYear(), date.getMonth(), day).toLocaleDateString('id-ID', { weekday: 'short' })} <br /> {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(groupedActivities).map(([category, activities]) => (
                                            <Fragment key={category}>
                                                <tr className="group"><td className="px-3 py-2 font-bold text-teal-200 sm:sticky sm:left-0 sm:z-10 bg-gray-700" colSpan={selectedWeekDays.length + 2}>{category}</td></tr>
                                                {activities.map(activity => (
                                                    <tr key={activity.id} className="group border-b border-gray-700">
                                                        <td className="px-3 py-3 font-medium text-left sm:sticky sm:left-0 bg-gray-800 group-hover:bg-gray-700 sm:z-10">{activity.title}</td>
                                                        <td className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[200px] bg-gray-800 group-hover:bg-gray-700 sm:z-10">
                                                            {activity.monthlyTarget > 7 ? `${weeklyAchievedCounts[activity.id] || 0} / ${selectedWeekDays.length}` : `${activityProgressCounts[activity.id] || 0} / ${activity.monthlyTarget}`}
                                                        </td>
                                                        {selectedWeekDays.map(day => (
                                                            <td key={day} className={`text-center border-l border-gray-700 ${isCurrentMonthView && day === todayDay ? 'bg-teal-900/40' : ''}`}>
                                                                <div className="w-full h-full flex items-center justify-center py-3">
                                                                    {progress[day.toString().padStart(2, '0')]?.[activity.id] ? <CheckSquare className="w-6 h-6 text-teal-400" /> : <Square className="w-6 h-6 text-gray-600" />}
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="my-8">
                                <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-teal-400 pl-4">Progres Pekan Ini</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {Object.entries(weeklyProgressSummary).map(([category, activities]) => (
                                        <div key={category} className="bg-black/20 p-4 rounded-lg border border-white/10">
                                            <h4 className="font-semibold text-teal-300 mb-3">{category}</h4>
                                            <div className="space-y-4">
                                                {activities.map(activity => (
                                                    <div key={activity.id}>
                                                        <div className="flex justify-between items-center mb-1 text-sm">
                                                            <span className="font-medium text-white">{activity.title}</span>
                                                            <span className="font-semibold text-blue-200">{activity.achieved} / {activity.target}</span>
                                                        </div>
                                                        <div className="w-full bg-black/30 rounded-full h-2.5">
                                                            <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${activity.percentage}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center gap-4">
                                {currentMonthlySubmission ? (
                                    <div className={`px-2.5 py-1.5 text-sm font-semibold rounded-full ${(statusConfig as any)[currentMonthlySubmission.status]?.color || 'bg-blue-500/20 text-blue-300'}`}>
                                        Status Laporan: {(statusConfig as any)[currentMonthlySubmission.status]?.label || currentMonthlySubmission.status}
                                    </div>
                                ) : (
                                    <button onClick={handleSubmission} className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                                        <Send className="w-5 h-5" /> Kirim Laporan Bulan Ini
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'monthly' && (
                        <div className="animate-view-change">
                            <div className="overflow-x-auto rounded-lg border border-white/20">
                                <table className="min-w-full text-sm text-left text-white border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-3 font-semibold min-w-[200px] text-left sm:sticky sm:left-0 sm:z-20 bg-gray-900">Aktivitas</th>
                                            <th className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[200px] sm:z-20 bg-gray-900">Progres</th>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                                <th key={day} className={`px-2 py-3 font-bold text-center w-10 ${isCurrentMonthView && day === todayDay ? 'bg-teal-700' : 'bg-gray-800'}`}>{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(groupedActivities).map(([category, activities]) => (
                                            <Fragment key={category}>
                                                <tr className="group"><td className="px-3 py-2 font-bold text-teal-200 sm:sticky sm:left-0 sm:z-10 bg-gray-700" colSpan={daysInMonth + 2}>{category}</td></tr>
                                                {activities.map(activity => (
                                                    <tr key={activity.id} className="group border-b border-gray-700">
                                                        <td className="px-3 py-3 font-medium text-left sm:sticky sm:left-0 bg-gray-800 group-hover:bg-gray-700 sm:z-10">{activity.title}</td>
                                                        <td className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[200px] bg-gray-800 group-hover:bg-gray-700 sm:z-10">{activityProgressCounts[activity.id] || 0} / {activity.monthlyTarget}</td>
                                                        {Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0')).map(dayKey => (
                                                            <td key={dayKey} className={`text-center border-l border-gray-700 ${isCurrentMonthView && parseInt(dayKey) === todayDay ? 'bg-teal-900/40' : ''}`}>
                                                                <div className="w-full h-full flex items-center justify-center py-3">{progress[dayKey]?.[activity.id] ? <CheckSquare className="w-6 h-6 text-teal-400" /> : <Square className="w-6 h-6 text-gray-600" />}</div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/10 text-center px-4 pb-8">
                                <h4 className="text-lg font-semibold text-white mb-6 tracking-wide">Pihak yang Menyetujui</h4>
                                <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4 sm:gap-6">
                                    {[
                                        { role: 'Kepala Unit', id: employee.kaUnitId, name: kaUnitName, signature: kaUnit?.signature },
                                        { role: 'Supervisor', id: employee.supervisorId, name: supervisorName, signature: supervisor?.signature },
                                        { role: 'Mentor', id: employee.mentorId, name: mentorName, signature: mentor?.signature },
                                        { role: 'Karyawan', id: employee.id, name: employee.name, signature: employee.signature }
                                    ].map((person, idx) => (
                                        <div key={idx} className="flex flex-col text-center px-2 py-4 bg-black/20 rounded-lg h-48 justify-between flex-1 w-full sm:min-w-[150px] border border-white/5">
                                            <p className="text-xs text-blue-200 font-semibold uppercase tracking-wider">{person.role}</p>
                                            <div className="flex-1 flex items-center justify-center my-2">
                                                {person.signature ? (
                                                    <img src={person.signature} alt={person.role} className="h-16 w-auto object-contain brightness-110" />
                                                ) : <div className="h-16 w-full flex items-center justify-center border border-dashed border-white/10 rounded-md"><span className="text-[10px] text-gray-500 italic">Belum Ada TTD</span></div>}
                                            </div>
                                            <div className="w-full">
                                                <p className={`font-bold text-white leading-tight px-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap`}>{person.name || 'Belum Diatur'}</p>
                                                <div className="w-full h-px bg-gray-600/50 my-1.5 mx-auto"></div>
                                                <p className="font-mono text-[10px] text-gray-400">NIP. {person.id || '-'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {submissionConfirmation && submissionConfirmationModal}
            <ConfirmationModal
                isOpen={!!pendingNavigation}
                onClose={() => setPendingNavigation(null)}
                onConfirm={handleConfirmNavigation}
                title="Perubahan Belum Disimpan"
                message="Anda memiliki perubahan yang belum disimpan. Lanjutkan tanpa menyimpan?"
                confirmText="Ya, Lanjutkan"
                confirmColorClass="bg-blue-600 hover:bg-blue-500"
            />
            {successMessage && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="bg-teal-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2">
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyActivities;