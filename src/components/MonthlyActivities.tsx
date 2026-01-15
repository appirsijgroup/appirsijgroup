import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type MonthlyActivityProgress, type WeeklyReportSubmission, type DailyActivity, type MutabaahLockingMode } from '../types';
import { CheckSquareIcon, SquareIcon, SendIcon, CalendarDaysIcon, LockClosedIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';


interface MonthlyActivitiesProps {
    employee: Employee;
    allUsers: Employee[];
    monthlyProgressData: Record<string, MonthlyActivityProgress>;
    onUpdate: (userId: string, monthKey: string, updates: MonthlyActivityProgress) => void;
    onActivateMonth: (userId: string, monthKey: string) => void;
    weeklyReportSubmissions: WeeklyReportSubmission[];
    onSubmitReport: (monthKey: string, weekIndex: number) => void;
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


const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex-grow py-3 px-5 text-center font-semibold rounded-lg transition-all duration-300
            ${active
                ? 'bg-teal-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
    >
        {children}
    </button>
);

const MonthlyActivities: React.FC<MonthlyActivitiesProps> = ({ employee, allUsers, monthlyProgressData, onUpdate, onActivateMonth, weeklyReportSubmissions, onSubmitReport, date, onDateChange, dailyActivitiesConfig, mutabaahLockingMode }) => {
    const [isDirty, setIsDirty] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [submissionConfirmation, setSubmissionConfirmation] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<'prev' | 'next' | null>(null);

    const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
    const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
    const [isActivating, setIsActivating] = useState(false);

    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.name])), [allUsers]);

    const kaUnitName = useMemo(() => userMap.get(employee.kaUnitId || ''), [userMap, employee.kaUnitId]);
    const supervisorName = useMemo(() => userMap.get(employee.supervisorId || ''), [userMap, employee.supervisorId]);
    const mentorName = useMemo(() => userMap.get(employee.mentorId || ''), [userMap, employee.mentorId]);

    const monthKey = useMemo(() => {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }, [date]);

    // This is now the single source of truth for progress data in this component.
    const progress = useMemo(() => monthlyProgressData[monthKey] || {}, [monthlyProgressData, monthKey]);
    
    const isMonthActivated = useMemo(() => {
        // Support both camelCase (from Supabase) and snake_case conversions
        const months = employee.activatedMonths || employee.activated_months || [];
        const isActivated = months.includes(monthKey) ?? false;

        // Debug log to help diagnose issues
        console.log('🔍 MonthlyActivities isMonthActivated check:', {
            employeeId: employee.id,
            monthKey,
            activatedMonths: months,
            isMonthActivated: isActivated
        });

        return isActivated;
    }, [employee.activatedMonths, employee.activated_months, monthKey]);

    const daysInMonth = useMemo(() => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), [date]);

    const now = useMemo(() => new Date(), []);
    
    const weeks = useMemo(() => getBalancedWeeks(date), [date]);

    const currentWeeklySubmission = useMemo(() => {
        return weeklyReportSubmissions.find(s => s.monthKey === monthKey && s.weekIndex === currentWeekIndex);
    }, [weeklyReportSubmissions, monthKey, currentWeekIndex]);

    const isPastWeek = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const week = weeks[currentWeekIndex];
        if (!week || week.days.length === 0) return false;

        const lastDayOfWeek = week.days[week.days.length - 1];
        const lastDateOfWeek = new Date(date.getFullYear(), date.getMonth(), lastDayOfWeek);
        lastDateOfWeek.setHours(23, 59, 59, 999);

        return lastDateOfWeek < today;
    }, [date, weeks, currentWeekIndex]);

    // Check if the viewed month is in the past (independent of selected week)
    const isPastMonth = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastDayOfMonth = daysInMonth;
        const lastDateOfMonth = new Date(date.getFullYear(), date.getMonth(), lastDayOfMonth);
        lastDateOfMonth.setHours(23, 59, 59, 999);

        return lastDateOfMonth < today;
    }, [date, daysInMonth]);
    
    const isReadOnlyForWeek = useMemo(() => {
        // 🔥 locking mode: jika 'monthly', user bebas mengisi kapan saja (tidak dikunci per pekan)
        const shouldLockPastWeek = mutabaahLockingMode === 'weekly';

        if (shouldLockPastWeek && isPastWeek && !currentWeeklySubmission) return true;
        if (currentWeeklySubmission && (currentWeeklySubmission.status.startsWith('pending_') || currentWeeklySubmission.status === 'approved')) return true;
        return false;
    }, [isPastWeek, currentWeeklySubmission, mutabaahLockingMode]);

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

    const handleProgressChange = (day: string, activityId: string, value: boolean) => {
        if(isReadOnlyForWeek) return;
        
        // Create a deep copy of the current month's progress to modify
        const newMonthProgress = JSON.parse(JSON.stringify(progress));

        if (!newMonthProgress[day]) {
            newMonthProgress[day] = {};
        }

        if (value) {
            newMonthProgress[day][activityId] = true;
        } else {
            delete newMonthProgress[day][activityId];
        }

        // Immediately call the parent's update function
        onUpdate(employee.id, monthKey, newMonthProgress);
        // We still use isDirty to let user know they have pending *manual* changes to save,
        // though now it's more of a visual cue since the state is already sent up.
        if (!isDirty) setIsDirty(true);
    };

    const handleSaveChanges = () => {
        // The state is already updated in the parent. This button now just serves to give user feedback.
        setIsDirty(false);
        setSuccessMessage('Perubahan berhasil disimpan!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (isDirty && !isReadOnlyForWeek && isMonthActivated) {
            setPendingNavigation(direction);
            return;
        }
        executeNavigation(direction);
    };

    const executeNavigation = (direction: 'prev' | 'next') => {
        const newDate = new Date(date);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
        onDateChange(newDate);
        setPendingNavigation(null);
    };

    const handleConfirmNavigation = () => {
        if (pendingNavigation) {
            executeNavigation(pendingNavigation);
        }
    };

    const handleSubmission = () => {
        if (isDirty && !isReadOnlyForWeek) {
            alert("Harap simpan perubahan Anda terlebih dahulu sebelum mengajukan laporan.");
            return;
        }
        setSubmissionConfirmation(true);
    };

    const executeSubmission = () => {
        onSubmitReport(monthKey, currentWeekIndex);
        setSuccessMessage('Laporan mingguan berhasil diajukan ke mentor!');
        setSubmissionConfirmation(false);
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    const handleActivateClick = async () => {
        if (isPastMonth) return;

        setIsActivating(true);
        try {
            await onActivateMonth(employee.id, monthKey);
            // Success - parent will update employee and trigger re-render
            setSuccessMessage('Lembar Mutaba\'ah berhasil diaktifkan!');
            setIsActivating(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error activating month:', error);
            setIsActivating(false);
        }
    };

    const isNextMonthFuture = () => {
        const nextMonth = new Date(date);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
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
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, typeof summary>);
    
    }, [dailyActivitiesConfig, weeks, currentWeekIndex, progress, activityProgressCounts, weeklyAchievedCounts]);

    const statusConfig = {
        pending_mentor: { label: "Menunggu Mentor", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400" },
        pending_supervisor: { label: "Menunggu SPV", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
        pending_kaunit: { label: "Menunggu Ka. Unit", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400 animate-pulse" },
        approved: { label: "Disetujui", color: "bg-green-500/20 text-green-300", dot: "bg-green-400" },
        rejected_mentor: { label: "Ditolak Mentor", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
        rejected_supervisor: { label: "Ditolak SPV", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
        rejected_kaunit: { label: "Ditolak Ka. Unit", color: "bg-red-500/20 text-red-300", dot: "bg-red-400" },
    };

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const todayDay = today.getDate();
    const isCurrentMonthView = today.getFullYear() === date.getFullYear() && date.getMonth() === date.getMonth();

    const selectedWeekDays = weeks[currentWeekIndex]?.days || [];

    // Generate month options
    const monthOptions = useMemo(() => {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months.map((month, index) => ({
            value: index,
            label: month
        }));
    }, []);

    // Generate year options (current year +/- 2 years)
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push({
                value: i,
                label: i.toString()
            });
        }
        return years.reverse();
    }, []);

    return (
        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            {/* Enterprise-style Month/Year Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-black/20 p-4 rounded-xl">
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-2">
                        Bulan
                    </label>
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
                            <option key={month.value} value={month.value} className="text-black bg-white">
                                {month.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-2">
                        Tahun
                    </label>
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
                            <option key={year.value} value={year.value} className="text-black bg-white">
                                {year.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!isMonthActivated ? (
                <div className="flex flex-col items-center justify-center text-center bg-black/20 rounded-2xl p-8 sm:p-12 animate-view-change border-2 border-dashed border-teal-500/50 w-full max-w-7xl mx-auto">
                    <CalendarDaysIcon className="w-20 h-20 text-teal-300 mb-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Aktivasi Lembar Mutaba'ah Diperlukan</h2>
                    <p className="text-blue-200 text-base sm:text-lg mt-3 max-w-3xl">
                        Untuk dapat melakukan presensi dan mencatat aktivitas lainnya, Anda harus mengaktifkan Lembar Mutaba'ah untuk bulan <strong>{date.toLocaleDateString('id-ID', { month: 'long' })}</strong> terlebih dahulu.
                    </p>
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
                        ) : (
                            "Aktifkan Lembar Mutaba'ah"
                        )}
                    </button>
                    {isPastMonth && <p className="text-xs text-yellow-300 mt-4">Anda tidak dapat mengaktifkan lembar untuk bulan yang telah berlalu.</p>}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                        <TabButton active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')}>Laporan Mingguan</TabButton>
                        <TabButton active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')}>Rekap Bulanan</TabButton>
                    </div>

                    
                    {activeTab === 'weekly' && (
                        <div className="animate-view-change">
                            <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                                {weeks.map(({ weekIndex, days }) => {
                                    const submission = weeklyReportSubmissions.find(s => s.monthKey === monthKey && s.weekIndex === weekIndex);
                                    let statusDot: React.ReactNode = null;
                                    if (submission) {
                                        statusDot = <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${statusConfig[submission.status].dot}`}></span>;
                                    } else if (isPastWeek && currentWeekIndex === weekIndex) {
                                         statusDot = <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 bg-green-400`}></span>;
                                    }

                                    return (
                                        <button
                                            key={weekIndex}
                                            onClick={() => setCurrentWeekIndex(weekIndex)}
                                            className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                                                currentWeekIndex === weekIndex ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-blue-200'
                                            }`}
                                        >
                                            Pekan {weekIndex + 1}
                                            {statusDot}
                                        </button>
                                    );
                                })}
                            </div>

                            {isReadOnlyForWeek && (
                                <div className="mb-4 p-3 bg-gray-700/50 text-gray-300 text-center rounded-lg flex items-center justify-center gap-3">
                                    <LockClosedIcon className="w-5 h-5" />
                                    <p className="font-semibold text-sm">
                                        {isPastWeek && !currentWeeklySubmission
                                            ? "Pekan ini telah terlewat dan dikunci."
                                            : "Pekan ini telah diajukan dan dikunci."
                                        }
                                    </p>
                                </div>
                            )}
                            <div className={`overflow-x-auto rounded-lg border border-white/20 ${isReadOnlyForWeek ? 'opacity-70' : ''}`}>
                                <table className="min-w-full text-sm text-left text-white border-collapse">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sm:sticky sm:left-0 sm:z-20 bg-gray-900 whitespace-nowrap">Aktivitas</th>
                                            <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sm:sticky sm:left-[250px] sm:z-20 bg-gray-900 whitespace-nowrap">Progres</th>
                                            {selectedWeekDays.map(day => (
                                                <th key={day} scope="col" className={`px-2 py-3 font-bold text-center w-20 min-w-[80px] whitespace-nowrap ${isCurrentMonthView && day === todayDay ? 'bg-teal-700' : 'bg-gray-800'}`}>
                                                    {new Date(date.getFullYear(), date.getMonth(), day).toLocaleDateString('id-ID', { weekday: 'short' })} <br/> {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(groupedActivities).map(([category, activities]) => (
                                            <Fragment key={category}>
                                                <tr className="group"><td className="px-3 py-2 font-bold text-teal-200 sm:sticky sm:left-0 sm:z-10 bg-gray-700 group-hover:bg-gray-600 whitespace-nowrap" colSpan={selectedWeekDays.length + 2}>{category}</td></tr>
                                                {activities.map(activity => {
                                                    const isAutomated = activity.automationTrigger && ['PRAYER_WAJIB', 'ACTIVITY_TYPE', 'TADARUS_SESSION', 'BOOK_READING_REPORT', 'TEAM_ATTENDANCE'].includes(activity.automationTrigger.type);
                                                    return (
                                                        <tr key={activity.id} className="group border-b border-gray-700">
                                                            <td className="px-3 py-3 font-medium text-left sm:sticky sm:left-0 bg-gray-800 group-hover:bg-gray-700 sm:z-10 whitespace-nowrap">{activity.title}</td>
                                                            <td className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[250px] bg-gray-800 group-hover:bg-gray-700 sm:z-10 whitespace-nowrap">
                                                                {(() => {
                                                                    const isDailyTask = activity.monthlyTarget > 7;
                                                                    if (isDailyTask) {
                                                                        const achieved = weeklyAchievedCounts[activity.id] || 0;
                                                                        const target = weeks[currentWeekIndex]?.days.length || 0;
                                                                        return `${achieved} / ${target}`;
                                                                    } else {
                                                                        const achieved = activityProgressCounts[activity.id] || 0;
                                                                        const target = activity.monthlyTarget;
                                                                        return `${achieved} / ${target}`;
                                                                    }
                                                                })()}
                                                            </td>
                                                            {selectedWeekDays.map(day => {
                                                                const dayKey = (day).toString().padStart(2, '0');
                                                                const isChecked = progress[dayKey]?.[activity.id] || false;
                                                                const isFutureDate = isCurrentMonthView && day > todayDay;
                                                                
                                                                return (
                                                                    <td key={day} className={`text-center border-l border-gray-700 group-hover:bg-white/5 ${isCurrentMonthView && day === todayDay ? 'bg-teal-900/40' : ''}`}>
                                                                        <button 
                                                                            onClick={() => handleProgressChange(dayKey, activity.id, !isChecked)} 
                                                                            disabled={isAutomated || isReadOnlyForWeek || isFutureDate}
                                                                            className="w-full h-full flex items-center justify-center py-3 disabled:cursor-not-allowed"
                                                                            aria-label={`Tandai ${activity.title} pada tanggal ${dayKey}`}
                                                                            title={isAutomated ? "Diisi otomatis" : isReadOnlyForWeek ? "Dikunci" : isFutureDate ? "Tanggal akan datang" : ""}
                                                                        >
                                                                            {isChecked ? <CheckSquareIcon className={`w-6 h-6 ${isAutomated || isReadOnlyForWeek || isFutureDate ? 'text-teal-400/50' : 'text-teal-400 hover:text-teal-300'}`} /> : <SquareIcon className={`w-6 h-6 ${isAutomated || isReadOnlyForWeek || isFutureDate ? 'text-gray-600' : 'text-gray-500 hover:text-white'}`} />}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
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
                                                            <div 
                                                                className="bg-teal-500 h-2.5 rounded-full transition-all duration-500" 
                                                                style={{ width: `${activity.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center gap-4">
                                {mutabaahLockingMode === 'weekly' && isPastWeek && !currentWeeklySubmission ? (
                                    <div className="px-2.5 py-1.5 text-sm font-semibold rounded-full bg-green-500/20 text-green-300">
                                        Status: Disetujui Otomatis (Waktu Terlewat)
                                    </div>
                                ) : currentWeeklySubmission ? (
                                    <div className={`px-2.5 py-1.5 text-sm font-semibold rounded-full ${statusConfig[currentWeeklySubmission.status].color}`}>
                                        Status: {statusConfig[currentWeeklySubmission.status].label}
                                    </div>
                                ) : null}

                                {!isReadOnlyForWeek && (
                                    <>
                                        {employee.mentorId && (
                                            <button
                                                onClick={handleSubmission}
                                                disabled={isDirty}
                                                className="w-full max-w-xs sm:w-auto bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <SendIcon className="w-5 h-5"/>
                                                {currentWeeklySubmission?.status.startsWith('rejected') ? 'Ajukan Ulang Laporan Pekan Ini' : 'Ajukan Laporan Pekan Ini'}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveChanges}
                                            disabled={!isDirty}
                                            className="w-full max-w-xs sm:w-auto bg-teal-500 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-teal-400 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                        >
                                            {isDirty ? 'Simpan Perubahan' : 'Tersimpan'}
                                        </button>
                                        {isDirty && <p className="text-xs text-yellow-300">Anda memiliki perubahan yang belum disimpan.</p>}
                                    </>
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
                                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sm:sticky sm:left-0 sm:z-20 bg-gray-900 whitespace-nowrap">Aktivitas</th>
                                            <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sm:sticky sm:left-[250px] sm:z-20 bg-gray-900 whitespace-nowrap">Progres</th>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                                <th key={day} scope="col" className={`px-2 py-3 font-bold text-center w-12 min-w-[48px] whitespace-nowrap ${isCurrentMonthView && day === todayDay ? 'bg-teal-700' : 'bg-gray-800'}`}>{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(groupedActivities).map(([category, activities]) => (
                                            <Fragment key={category}>
                                                <tr className="group"><td className="px-3 py-2 font-bold text-teal-200 sm:sticky sm:left-0 sm:z-10 bg-gray-700 group-hover:bg-gray-600 whitespace-nowrap" colSpan={daysInMonth + 2}>{category}</td></tr>
                                                {activities.map(activity => (
                                                    <tr key={activity.id} className="group border-b border-gray-700">
                                                        <td className="px-3 py-3 font-medium text-left sm:sticky sm:left-0 bg-gray-800 group-hover:bg-gray-700 sm:z-10 whitespace-nowrap">{activity.title}</td>
                                                        <td className="px-3 py-3 font-semibold text-center sm:sticky sm:left-[250px] bg-gray-800 group-hover:bg-gray-700 sm:z-10 whitespace-nowrap">{activityProgressCounts[activity.id] || 0} / {activity.monthlyTarget}</td>
                                                        {Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0')).map(dayKey => (
                                                            <td key={dayKey} className={`text-center border-l border-gray-700 group-hover:bg-white/5 ${isCurrentMonthView && parseInt(dayKey) === todayDay ? 'bg-teal-900/40' : ''}`}>
                                                                <div className="w-full h-full flex items-center justify-center py-3">{progress[dayKey]?.[activity.id] ? <CheckSquareIcon className="w-6 h-6 text-teal-400" /> : <SquareIcon className="w-6 h-6 text-gray-600" />}</div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-12 pt-8 border-t border-white/10 text-center">
                                <h4 className="text-lg font-semibold text-white mb-6">Pihak yang Menyetujui</h4>
                                <div className="flex flex-wrap justify-between items-stretch gap-4 sm:gap-6">
                                    {/* Ka. Unit */}
                                    <div className="flex flex-col text-center px-2 py-4 bg-black/20 rounded-lg h-40 justify-between flex-1 min-w-[160px]">
                                        <p className="text-sm text-blue-200 font-semibold">Kepala Unit</p>
                                        <div className="w-full">
                                            <p className="font-bold text-white text-sm break-words h-10 flex items-center justify-center px-1" title={kaUnitName || 'Belum Diatur'}>{kaUnitName || 'Belum Diatur'}</p>
                                            <div className="w-full h-px bg-gray-600 my-1 mx-auto"></div>
                                            <p className="font-mono text-xs text-gray-400">{employee.kaUnitId || '-'}</p>
                                        </div>
                                    </div>
                                    {/* Supervisor */}
                                    <div className="flex flex-col text-center px-2 py-4 bg-black/20 rounded-lg h-40 justify-between flex-1 min-w-[160px]">
                                        <p className="text-sm text-blue-200 font-semibold">Supervisor</p>
                                        <div className="w-full">
                                            <p className="font-bold text-white text-sm break-words h-10 flex items-center justify-center px-1" title={supervisorName || 'Belum Diatur'}>{supervisorName || 'Belum Diatur'}</p>
                                            <div className="w-full h-px bg-gray-600 my-1 mx-auto"></div>
                                            <p className="font-mono text-xs text-gray-400">{employee.supervisorId || '-'}</p>
                                        </div>
                                    </div>
                                    {/* Mentor */}
                                    <div className="flex flex-col text-center px-2 py-4 bg-black/20 rounded-lg h-40 justify-between flex-1 min-w-[160px]">
                                        <p className="text-sm text-blue-200 font-semibold">Mentor</p>
                                        <div className="w-full">
                                            <p className="font-bold text-white text-sm break-words h-10 flex items-center justify-center px-1" title={mentorName || 'Belum Diatur'}>{mentorName || 'Belum Diatur'}</p>
                                            <div className="w-full h-px bg-gray-600 my-1 mx-auto"></div>
                                            <p className="font-mono text-xs text-gray-400">{employee.mentorId || '-'}</p>
                                        </div>
                                    </div>
                                    {/* Karyawan */}
                                    <div className="flex flex-col text-center px-2 py-4 bg-black/20 rounded-lg h-40 justify-between flex-1 min-w-[160px]">
                                        <p className="text-sm text-blue-200 font-semibold">Karyawan</p>
                                        <div className="w-full">
                                            <p className="font-bold text-white text-sm break-words h-10 flex items-center justify-center px-1" title={employee.name}>{employee.name}</p>
                                            <div className="w-full h-px bg-gray-600 my-1 mx-auto"></div>
                                            <p className="font-mono text-xs text-gray-400">{employee.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    )}
                     {successMessage && <p className="mt-4 text-green-300 animate-fade-in text-center">{successMessage}</p>}
                </>
            )}

            {submissionConfirmation && createPortal(
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                        <h3 className="text-lg font-bold text-white mb-2">Konfirmasi Pengajuan Laporan</h3>
                        <p className="text-blue-200 mb-4">Apakah Anda yakin ingin mengajukan laporan untuk <strong>Pekan {currentWeekIndex + 1} - {date.toLocaleDateString('id-ID', { month: 'long' })}</strong> kepada mentor Anda?</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setSubmissionConfirmation(false)} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                            <button onClick={executeSubmission} className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500">
                                Ya, Ajukan
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={!!pendingNavigation}
                onClose={() => setPendingNavigation(null)}
                onConfirm={handleConfirmNavigation}
                title="Perubahan Belum Disimpan"
                message="Anda memiliki perubahan yang belum disimpan. Lanjutkan tanpa menyimpan?"
                confirmText="Ya, Lanjutkan"
                confirmColorClass="bg-blue-600 hover:bg-blue-500"
            />
        </div>
    );
};

export default MonthlyActivities;