import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { type Employee, type DailyActivity, type DailyActivityProgress } from '../types';
import { PdfIcon, ChartBarIcon } from './Icons';
import { generateOfficialPdf, type ReportSection, type TableConfig } from './ReportGenerator';
import EmployeeSearchableInput from './EmployeeSearchableInput';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

interface AnalyticsProps {
    allUsersData: Record<string, { employee: Employee; attendance: unknown; history: unknown; }>;
    dailyActivitiesConfig: DailyActivity[];
    onLoadAllData?: () => Promise<void>;
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode; minWidth?: string }> = ({ title, children, minWidth }) => {
    // ... existing implementation
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <div className="bg-black/20 p-4 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white mb-2">{title}</h4>
            {minWidth ? (
                <div className="overflow-x-auto pb-4 -mx-2 px-2 md:overflow-x-visible md:mx-0 md:px-0">
                    <div className="min-w-[700px] md:min-w-0 h-72">
                        {isClient ? children : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="w-full h-72">
                    {isClient ? children : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ... existing ActivationReport ...

// ... existing MutabaahPerformanceReport ...


const ActivationReport: React.FC<{ allUsers: Employee[] }> = ({ allUsers }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const currentMonthLabel = useMemo(() => new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), []);

    // State for filters
    const [unitFilter, setUnitFilter] = useState('all');
    const [bagianFilter, setBagianFilter] = useState('all');
    const [kategoriFilter, setKategoriFilter] = useState<'all' | 'MEDIS' | 'NON MEDIS'>('all');
    const [profesiFilter, setProfesiFilter] = useState('all');
    const [genderFilter, setGenderFilter] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
    const [activationFilter, setActivationFilter] = useState<'all' | 'activated' | 'not-activated'>('all');

    // Populate filter options from data
    const filterOptions = useMemo(() => {
        const units = new Set<string>();
        const bagians = new Set<string>();
        const profesi = new Set<string>();
        allUsers.forEach(user => {
            if (user.unit) units.add(user.unit);
            if (user.bagian) bagians.add(user.bagian);
            if (user.profession) profesi.add(user.profession);
        });
        return {
            units: Array.from(units).sort(),
            bagians: Array.from(bagians).sort(),
            profesi: Array.from(profesi).sort(),
        };
    }, [allUsers]);

    // Apply filters
    const filteredUsers = useMemo(() => {
        const filtered = allUsers.filter(user => {
            if (unitFilter !== 'all' && user.unit !== unitFilter) return false;
            if (bagianFilter !== 'all' && user.bagian !== bagianFilter) return false;
            // Case-insensitive category comparison
            if (kategoriFilter !== 'all' && user.professionCategory?.toUpperCase() !== kategoriFilter.toUpperCase()) return false;
            if (profesiFilter !== 'all' && user.profession !== profesiFilter) return false;
            // Case-insensitive gender comparison to handle "Laki-laki" vs "LAKI-LAKI" vs "laki-laki"
            if (genderFilter !== 'all' && user.gender?.toLowerCase() !== genderFilter.toLowerCase()) return false;

            const isActivated = user.activatedMonths?.includes(currentMonthKey) ?? false;
            if (activationFilter === 'activated' && !isActivated) return false;
            if (activationFilter === 'not-activated' && isActivated) return false;

            return true;
        });

        // Debug log when filter changes
        if (genderFilter !== 'all' || unitFilter !== 'all' || bagianFilter !== 'all') {
        }

        return filtered;
    }, [allUsers, unitFilter, bagianFilter, kategoriFilter, profesiFilter, genderFilter, activationFilter, currentMonthKey]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman

    // Prepare data for chart and table
    const reportData = useMemo(() => {
        const activatedCount = filteredUsers.filter(u => u.activatedMonths?.includes(currentMonthKey)).length;
        const notActivatedCount = filteredUsers.length - activatedCount;

        const chartData = [
            { name: 'Sudah Aktivasi', value: activatedCount },
            { name: 'Belum Aktivasi', value: notActivatedCount },
        ];

        const tableData = filteredUsers.map(user => ({
            id: user.id,
            name: user.name,
            unit: user.unit,
            bagian: user.bagian,
            isActivated: user.activatedMonths?.includes(currentMonthKey) ?? false,
        })).sort((a, b) => a.name.localeCompare(b.name));

        return { chartData, tableData, activatedCount, total: filteredUsers.length };
    }, [filteredUsers, currentMonthKey]);

    // Pagination logic
    const totalPages = Math.ceil(reportData.tableData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTableData = reportData.tableData.slice(startIndex, startIndex + itemsPerPage);

    const ACTIVATED_COLOR = '#14b8a6'; // Teal
    const NOT_ACTIVATED_COLOR = '#6b7280'; // Gray

    const handleDownloadActivationPdf = () => {
        const tableColumn = ["No.", "Nama Karyawan", "Unit", "Status Aktivasi"];
        const tableRows = reportData.tableData.map((record, index) => [
            index + 1,
            record.name,
            record.unit,
            record.isActivated ? 'Sudah' : 'Belum'
        ]);

        const tableConfig: TableConfig = {
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], },
            didParseCell: (data) => {
                const statusColumnIndex = 3;
                if (data.section === 'body' && data.column.index === statusColumnIndex) {
                    const cellText = String(data.cell.raw).toLowerCase();
                    if (cellText === 'sudah') {
                        (data.cell.styles.textColor as [number, number, number]) = [0, 128, 0]; // Green
                    } else if (cellText === 'belum') {
                        (data.cell.styles.textColor as [number, number, number]) = [255, 0, 0]; // Red
                    }
                }
            }
        };

        const activeFilters = [
            unitFilter !== 'all' && `Unit: ${unitFilter}`,
            bagianFilter !== 'all' && `Bagian: ${bagianFilter}`,
            kategoriFilter !== 'all' && `Kategori: ${kategoriFilter}`,
            profesiFilter !== 'all' && `Profesi: ${profesiFilter}`,
            genderFilter !== 'all' && `Gender: ${genderFilter}`,
            activationFilter !== 'all' && `Status: ${activationFilter === 'activated' ? 'Sudah Aktivasi' : 'Belum Aktivasi'}`,
        ].filter(Boolean).join(', ');

        const subtitle = `Bulan: ${currentMonthLabel}\n${activeFilters ? `Filter Aktif: ${activeFilters}` : 'Filter: Semua Karyawan'}`;

        const reportSection: ReportSection = {
            title: "LAPORAN AKTIVASI LEMBAR MUTABA'AH",
            subtitle: subtitle,
            tables: [tableConfig],
            orientation: 'portrait',
            pageFormat: 'a4',
        };

        const fileName = `laporan_aktivasi_mutabaah_${currentMonthLabel}.pdf`;
        generateOfficialPdf(
            [reportSection],
            fileName,
            'save'
        );
    };

    const activationPercentage = reportData.total > 0 ? Math.round((reportData.activatedCount / reportData.total) * 100) : 0;

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [unitFilter, bagianFilter, kategoriFilter, profesiFilter, genderFilter, activationFilter]);

    return (
        <div className="bg-black/20 p-4 rounded-lg border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">Laporan Aktivasi Lembar Mutaba&apos;ah ({currentMonthLabel})</h4>
                <button
                    onClick={handleDownloadActivationPdf}
                    disabled={reportData.tableData.length === 0}
                    className="p-2 text-blue-200 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Unduh Laporan Aktivasi (PDF)"
                >
                    <PdfIcon className="w-5 h-5" />
                </button>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Unit</option>
                    {filterOptions.units.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
                <select value={bagianFilter} onChange={e => setBagianFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Bagian</option>
                    {filterOptions.bagians.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
                <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value as 'all' | 'MEDIS' | 'NON MEDIS')} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Kategori</option>
                    <option value="MEDIS" className="text-black bg-white">MEDIS</option>
                    <option value="NON MEDIS" className="text-black bg-white">NON MEDIS</option>
                </select>
                <select value={profesiFilter} onChange={e => setProfesiFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Profesi</option>
                    {filterOptions.profesi.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as 'all' | 'Laki-laki' | 'Perempuan')} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Gender</option>
                    <option value="Laki-laki" className="text-black bg-white">Laki-laki</option>
                    <option value="Perempuan" className="text-black bg-white">Perempuan</option>
                </select>
                <select value={activationFilter} onChange={e => setActivationFilter(e.target.value as 'all' | 'activated' | 'not-activated')} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                    <option value="all" className="text-black bg-white">Semua Status</option>
                    <option value="activated" className="text-black bg-white">Sudah Aktivasi</option>
                    <option value="not-activated" className="text-black bg-white">Belum Aktivasi</option>
                </select>
            </div>
            {/* Chart and Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-80 flex flex-col items-center justify-center">
                    <div className="relative w-full h-full">
                        {isClient ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={reportData.chartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={'70%'} outerRadius={'90%'} paddingAngle={5} isAnimationActive={false}>
                                        <Cell fill={ACTIVATED_COLOR} />
                                        <Cell fill={NOT_ACTIVATED_COLOR} />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                            </div>
                        )}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
                            <span className="text-4xl font-bold text-white">{activationPercentage}%</span>
                        </div>
                    </div>
                    <div className="text-center mt-8 space-y-2">
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTIVATED_COLOR }}></span>Sudah Aktivasi</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NOT_ACTIVATED_COLOR }}></span>Belum Aktivasi</div>
                        </div>
                        <p className="text-xl font-bold text-white">{reportData.activatedCount} / {reportData.total} Karyawan</p>
                        <p className="text-blue-200 text-sm">telah melakukan aktivasi</p>
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col">
                    <div className="max-h-96 overflow-auto rounded-lg border border-white/10 grow">
                        <table className="min-w-full text-sm text-left text-white">
                            <thead className="bg-gray-800/70 backdrop-blur-sm text-xs uppercase text-blue-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Unit</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">Status Aktivasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {paginatedTableData.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-2 font-semibold whitespace-nowrap">{user.name}</td>
                                        <td className="px-4 py-2 text-blue-200 whitespace-nowrap">{user.unit}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActivated ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                {user.isActivated ? 'Sudah' : 'Belum'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {reportData.tableData.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center p-8 text-blue-200">
                                            Tidak ada karyawan yang cocok dengan filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ←
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <span className="text-gray-400 px-2">...</span>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                                                }`}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MutabaahPerformanceReport: React.FC<{
    allUsers: Employee[];
    dailyActivitiesConfig: DailyActivity[];
}> = ({ allUsers, dailyActivitiesConfig }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Date filter
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // User filters
    const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string | undefined>(undefined);
    const [unitFilter, setUnitFilter] = useState('all');
    const [bagianFilter, setBagianFilter] = useState('all');
    const [kategoriFilter, setKategoriFilter] = useState<'all' | 'MEDIS' | 'NON MEDIS'>('all');
    const [profesiFilter, setProfesiFilter] = useState('all');
    const genderFilter: 'all' = 'all';

    // Filter options memoization
    const filterOptions = useMemo(() => {
        const units = new Set<string>();
        const bagians = new Set<string>();
        const profesi = new Set<string>();
        allUsers.forEach(user => {
            if (user.unit) units.add(user.unit);
            if (user.bagian) bagians.add(user.bagian);
            if (user.profession) profesi.add(user.profession);
        });
        return {
            units: Array.from(units).sort(),
            bagians: Array.from(bagians).sort(),
            profesi: Array.from(profesi).sort(),
        };
    }, [allUsers]);

    const filteredUsers = useMemo(() => {
        const result = allUsers.filter(user => {
            if (selectedUserIdFilter && user.id !== selectedUserIdFilter) return false;
            if (unitFilter !== 'all' && user.unit !== unitFilter) return false;
            if (bagianFilter !== 'all' && user.bagian !== bagianFilter) return false;

            // 🔥 FIXED: Case-insensitive category comparison for consistency
            if (kategoriFilter !== 'all' && user.professionCategory?.toUpperCase() !== kategoriFilter.toUpperCase()) return false;

            if (profesiFilter !== 'all' && user.profession !== profesiFilter) return false;
            if (genderFilter !== 'all' && user.gender !== genderFilter) return false;
            return true;
        });

        // 🔍 DEBUG: Log filter results

        return result;
    }, [allUsers, selectedUserIdFilter, unitFilter, bagianFilter, kategoriFilter, profesiFilter, genderFilter]);

    const { performanceByCategory, groupedPerformanceByActivity } = useMemo(() => {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        const activityTotals: Record<string, { achieved: number; target: number }> = {};
        dailyActivitiesConfig.forEach(act => {
            activityTotals[act.id] = { achieved: 0, target: 0 };
        });

        // 🔥 OPTIMIZATION: Process users more efficiently and defensively
        filteredUsers.forEach(user => {
            // Get data from either camelCase or snake_case for maximum resilience
            const monthlyActivities = user.monthlyActivities || (user as any).monthly_activities;
            const monthProgress = monthlyActivities?.[monthKey];

            if (!monthProgress || typeof monthProgress !== 'object') {
                // If no progress data, still count targets for the period
                dailyActivitiesConfig.forEach(activity => {
                    activityTotals[activity.id].target += activity.monthlyTarget;
                });
                return;
            }

            const dailyProgressList = Object.values(monthProgress);

            dailyActivitiesConfig.forEach(activity => {
                activityTotals[activity.id].target += activity.monthlyTarget;

                // Count successful days for this activity
                const achievedCount = dailyProgressList.reduce((dayCount: number, dailyProgress: any) => {
                    // Defensive check for dailyProgress
                    if (!dailyProgress || typeof dailyProgress !== 'object') return dayCount;
                    return dayCount + (dailyProgress[activity.id] ? 1 : 0);
                }, 0);

                activityTotals[activity.id].achieved += achievedCount;
            });
        });

        const performanceByActivity = dailyActivitiesConfig.map(act => {
            const totals = activityTotals[act.id];
            const percentage = totals.target > 0 ? Math.round((totals.achieved / totals.target) * 100) : 0;
            return { name: act.title, category: act.category, percentage };
        });

        const categoryTotals: Record<string, { totalPercentage: number; count: number }> = {};
        performanceByActivity.forEach(item => {
            // Defensive check for category
            const categoryName = item.category || 'Lainnya';
            if (!categoryTotals[categoryName]) categoryTotals[categoryName] = { totalPercentage: 0, count: 0 };
            categoryTotals[categoryName].totalPercentage += item.percentage;
            categoryTotals[categoryName].count++;
        });

        const performanceByCategory = Object.entries(categoryTotals).map(([name, stats]) => ({
            name,
            Persentase: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
        }));

        const groupedPerformanceByActivity = performanceByActivity.reduce((acc, item) => {
            const categoryName = item.category || 'Lainnya';
            if (!acc[categoryName]) acc[categoryName] = [];
            acc[categoryName].push(item);
            return acc;
        }, {} as Record<string, typeof performanceByActivity>);

        // 🔍 DEBUG: Log performance calculation results

        return { performanceByCategory, groupedPerformanceByActivity };
    }, [filteredUsers, dailyActivitiesConfig, currentMonth]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    const isNextMonthFuture = () => {
        const nextMonth = new Date(currentMonth);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
    };

    const selectClass = "w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none";

    return (
        <div className="bg-black/20 p-4 rounded-lg border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-bold text-white">Analisis Kinerja Mutaba&apos;ah</h3>
                <div className="shrink-0 flex items-center justify-between bg-black/20 p-1 rounded-full w-full sm:w-auto">
                    <button onClick={() => navigateMonth('prev')} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">&larr;</button>
                    <span className="font-semibold text-base text-teal-300 px-2 grow text-center">{currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">&rarr;</button>
                </div>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-4">
                    <EmployeeSearchableInput
                        allUsers={allUsers}
                        value={selectedUserIdFilter}
                        onChange={setSelectedUserIdFilter}
                        placeholder="Cari & Filter Nama Karyawan..."
                    />
                </div>
                <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className={selectClass}>
                    <option value="all" className="text-black bg-white">Semua Unit</option>
                    {filterOptions.units.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
                <select value={bagianFilter} onChange={e => setBagianFilter(e.target.value)} className={selectClass}>
                    <option value="all" className="text-black bg-white">Semua Bagian</option>
                    {filterOptions.bagians.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
                <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value as 'all' | 'MEDIS' | 'NON MEDIS')} className={selectClass}>
                    <option value="all" className="text-black bg-white">Semua Kategori Profesi</option>
                    <option value="MEDIS" className="text-black bg-white">MEDIS</option>
                    <option value="NON MEDIS" className="text-black bg-white">NON MEDIS</option>
                </select>
                <select value={profesiFilter} onChange={e => setProfesiFilter(e.target.value)} className={selectClass}>
                    <option value="all" className="text-black bg-white">Semua Profesi</option>
                    {filterOptions.profesi.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                </select>
            </div>

            <p className="text-sm text-center text-blue-200">{filteredUsers.length} karyawan</p>

            {filteredUsers.length > 0 ? (
                <div className="space-y-6">
                    <ChartCard title="Rata-rata Capaian per Kategori" minWidth="700px">
                        {isClient ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceByCategory} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                                    <YAxis stroke="#cbd5e1" allowDecimals={false} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                    <Bar dataKey="Persentase" isAnimationActive={false}>
                                        <LabelList dataKey="Persentase" position="top" fill="#e2e8f0" fontSize={12} formatter={(value: unknown) => typeof value === 'number' ? `${value}%` : ''} />
                                        {performanceByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                            </div>
                        )}
                    </ChartCard>

                    {Object.entries(groupedPerformanceByActivity).map(([category, activities], index) => (
                        <ChartCard key={category} title={`Detail Kategori: ${category}`} minWidth="700px">
                            {isClient ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activities} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={180} tick={{ fontSize: 11, fill: '#e2e8f0' }} interval={0} />
                                        <Bar dataKey="percentage" name="Capaian" barSize={20} fill={COLORS[index % COLORS.length]} isAnimationActive={false}>
                                            <LabelList dataKey="percentage" position="right" fill="#e2e8f0" fontSize={11} formatter={(value: unknown) => typeof value === 'number' && value > 0 ? `${value}%` : ''} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                                </div>
                            )}
                        </ChartCard>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-blue-200">
                    Tidak ada data karyawan yang cocok dengan filter yang dipilih.
                </div>
            )}
        </div>
    );
};

const Analytics: React.FC<AnalyticsProps> = ({ allUsersData, dailyActivitiesConfig, onLoadAllData }) => {
    const [isLoadingMore, setIsLoadingMore] = useState(false); // State local untuk loading more

    const allUsers = useMemo(() => {
        const employees = Object.values(allUsersData).map((d: { employee: Employee }) => d.employee);
        // Filter: isActive = true OR undefined/null (treat undefined as active)
        return employees.filter(e => e.isActive !== false);
    }, [allUsersData]);

    // Check if we likely have partial data (e.g., exactly 50 records)
    // This is a heuristic; ideally we'd pass total count from backend
    const isPartialData = allUsers.length > 0 && allUsers.length <= 50;

    const handleLoadAll = async () => {
        if (onLoadAllData) {
            setIsLoadingMore(true);
            try {
                await onLoadAllData();
            } finally {
                setIsLoadingMore(false);
            }
        }
    };

    // Show loading state if no data yet
    if (Object.keys(allUsersData).length === 0) {
        return (
            <div className="bg-black/20 p-8 rounded-lg border border-white/10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {isPartialData && onLoadAllData && (
                <div className="bg-blue-900/40 border border-blue-500/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300">
                            <ChartBarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">Menampilkan {allUsers.length} data karyawan</p>
                            <p className="text-blue-200 text-xs">Untuk performa, hanya sebagian data yang dimuat. Analisis mungkin belum lengkap.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLoadAll}
                        disabled={isLoadingMore}
                        className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoadingMore ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Memuat...
                            </>
                        ) : (
                            'Muat Semua Data'
                        )}
                    </button>
                </div>
            )}

            <ActivationReport allUsers={allUsers} />
            <MutabaahPerformanceReport allUsers={allUsers} dailyActivitiesConfig={dailyActivitiesConfig} />
        </div>
    );
};

export default Analytics;
