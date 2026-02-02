import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type MyDashboardViewProps, Employee, MonthlyReportSubmission, MenteeTarget, DailyActivity } from '../types';
import { isAdministrativeAccount, isAnyAdmin } from '@/lib/rolePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
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
        addToast,
        monthlyReportSubmissions,
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
                return <Analytics
                    allUsersData={props.allUsersData}
                    dailyActivitiesConfig={dailyActivitiesConfig}
                    onLoadAllData={props.onLoadEmployees}
                />;
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