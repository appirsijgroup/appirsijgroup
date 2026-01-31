import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { type Employee, type DailyActivity, type DailyActivityProgress } from '../types';
import { isAdministrativeAccount, isAnyAdmin, isSuperAdmin } from '@/lib/rolePermissions';
import { useAppDataStore, useHospitalStore } from '@/store/store';
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


const ActivationReport: React.FC<{ allUsers: Employee[]; hospitalFilter: string; hospitalName?: string }> = ({ allUsers, hospitalFilter, hospitalName }) => {
    const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

    // Filter out admin/super-admin - only count real employees (users)
    const realEmployees = useMemo(() => {
        let filtered = allUsers.filter(u => u && u.id && !isAdministrativeAccount(u.id) && !isAnyAdmin(u));
        if (hospitalFilter && hospitalFilter !== 'all') {
            filtered = filtered.filter(u => u.hospitalId === hospitalFilter);
        }
        return filtered;
    },
        [allUsers, hospitalFilter]
    );

    // State for stats (initially from props, then updated from API)
    const [stats, setStats] = useState({
        totalEmployees: realEmployees.length,
        activatedCount: realEmployees.filter(u => u.activatedMonths?.includes(currentMonthKey)).length,
        notActivatedCount: realEmployees.length - realEmployees.filter(u => u.activatedMonths?.includes(currentMonthKey)).length,
        mentorCount: allUsers.filter(u => u.canBeMentor || u.role === 'admin' || u.role === 'super-admin').length,
        complianceRate: 0,
        activationRate: 0,
        hospitalBreakdown: [] as any[]
    });

    const isGlobal = hospitalFilter === 'all';

    // ⚡ Fetch accurate stats from server to handle pagination gaps
    useEffect(() => {
        const fetchAccurateStats = async () => {
            try {
                const params = new URLSearchParams();
                if (hospitalFilter && hospitalFilter !== 'all') {
                    params.append('hospitalId', hospitalFilter);
                }
                const response = await fetch(`/api/analytics/stats?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(prev => ({
                        ...prev,
                        totalEmployees: data.totalEmployees,
                        activatedCount: data.activatedCount,
                        notActivatedCount: data.notActivatedCount,
                        mentorCount: data.mentorCount,
                        complianceRate: data.complianceRate,
                        activationRate: data.activationRate,
                        hospitalBreakdown: data.hospitalBreakdown || []
                    }));
                }
            } catch (error) {
                console.error('Failed to load accurate analytics stats:', error);
            }
        };

        fetchAccurateStats();
    }, [hospitalFilter]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isGlobal ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'}`}>
                        {isGlobal ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"></path><path d="M19 21V11"></path><path d="M5 21V11"></path><path d="M9 21v-4a2 2 0 0 1 4 0v4"></path></svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white leading-tight">
                            {isGlobal ? 'Ringkasan Eksekutif Grup RSI' : `Laporan Unit: ${hospitalName || 'Rumah Sakit'}`}
                        </h2>
                        <p className="text-gray-400 text-xs mt-0.5">
                            {isGlobal ? 'Data agregat dari seluruh unit RS yang tergabung dalam aliansi.' : 'Data performa spesifik untuk unit kerja terpilih.'}
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isGlobal ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-teal-500/10 border-teal-500/30 text-teal-400'}`}>
                    {isGlobal ? 'Dashboard Global' : 'Unit RS'}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Total Karyawan Card */}
                <div className="bg-linear-to-br from-blue-900/40 to-blue-800/20 p-5 rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-blue-300 text-sm font-medium uppercase tracking-wider mb-1">Total Karyawan</span>
                        <span className="text-4xl font-bold text-white mb-2">{stats.totalEmployees}</span>
                        <div className="flex items-center gap-2 text-xs text-blue-200/60">
                            <span className="bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 font-medium">Terdaftar</span>
                        </div>
                    </div>
                </div>

                {/* Status Aktivasi Card */}
                <div className="bg-linear-to-br from-teal-900/40 to-teal-800/20 p-5 rounded-xl border border-teal-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-300"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-teal-300 text-sm font-medium uppercase tracking-wider mb-1">Status Aktivasi</span>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-bold text-white">{stats.activatedCount}</span>
                            <span className="text-sm text-teal-200/60">/ {stats.notActivatedCount} Belum</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/30 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-teal-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.activationRate}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-teal-200/60">
                            <span>Rate: {stats.activationRate}%</span>
                            <span>Bulan Ini</span>
                        </div>
                    </div>
                </div>

                {/* Mentor Card */}
                <div className="bg-linear-to-br from-purple-900/40 to-purple-800/20 p-5 rounded-xl border border-purple-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-300"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-purple-300 text-sm font-medium uppercase tracking-wider mb-1">Jumlah Mentor</span>
                        <span className="text-4xl font-bold text-white mb-2">{stats.mentorCount}</span>
                        <div className="flex items-center gap-2 text-xs text-purple-200/60">
                            <span className="bg-purple-500/20 px-2 py-0.5 rounded text-purple-300 font-medium">Aktif</span>
                        </div>
                    </div>
                </div>

                {/* Compliance Rate Card */}
                <div className="bg-linear-to-br from-orange-900/40 to-orange-800/20 p-5 rounded-xl border border-orange-500/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-300"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-orange-300 text-sm font-medium uppercase tracking-wider mb-1">Pengisian Mutaba'ah</span>
                        <span className="text-4xl font-bold text-white mb-2">{stats.complianceRate}%</span>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/30 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.complianceRate}%` }}></div>
                        </div>
                        <div className="flex justify-end text-xs text-orange-200/60">
                            <span>Bulan Ini</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hospital Comparison Table for Global View */}
            {isGlobal && stats.hospitalBreakdown.length > 0 && (
                <div className="bg-black/20 rounded-xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"></path><path d="M19 21V11"></path><path d="M5 21V11"></path><path d="M9 21v-4a2 2 0 0 1 4 0v4"></path></svg>
                        <h3 className="text-white font-bold text-sm">Komparasi Kinerja Antar Unit RS</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40 text-gray-400 border-b border-white/10">
                                    <th className="p-4 font-semibold">Unit Rumah Sakit</th>
                                    <th className="p-4 font-semibold text-center">Total SDM</th>
                                    <th className="p-4 font-semibold text-center">Aktivasi Lembar</th>
                                    <th className="p-4 font-semibold text-center">Kepatuhan Laporan</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.hospitalBreakdown.map(h => {
                                    const actPercent = h.total > 0 ? Math.round((h.activated / h.total) * 100) : 0;
                                    const compPercent = h.total > 0 ? Math.round((h.compliance / h.total) * 100) : 0;
                                    return (
                                        <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold group-hover:text-teal-400 transition-colors">{h.brand}</span>
                                                    <span className="text-gray-400 text-xs italic">{h.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-white">{h.total}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-semibold">{actPercent}%</span>
                                                        <span className="text-gray-500 text-[10px]">({h.activated}/{h.total})</span>
                                                    </div>
                                                    <div className="w-24 bg-black/40 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${actPercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-semibold">{compPercent}%</span>
                                                        <span className="text-gray-500 text-[10px]">({h.compliance}/{h.total})</span>
                                                    </div>
                                                    <div className="w-24 bg-black/40 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${compPercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${compPercent > 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : compPercent > 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                    {compPercent > 80 ? 'TERBAIK' : compPercent > 50 ? 'STABIL' : 'RENDAH'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const MutabaahPerformanceReport: React.FC<{
    allUsers: Employee[];
    dailyActivitiesConfig: DailyActivity[];
    hospitalFilter: string;
}> = ({ allUsers, dailyActivitiesConfig, hospitalFilter }) => {
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<{
        performanceByCategory: any[];
        groupedPerformanceByActivity: Record<string, any[]>;
        employeeCount: number;
    }>({
        performanceByCategory: [],
        groupedPerformanceByActivity: {},
        employeeCount: 0
    });

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

    // ⚡ Fetch accurate aggregated performance from server
    useEffect(() => {
        const fetchPerformance = async () => {
            setIsLoading(true);
            try {
                const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
                const year = currentMonth.getFullYear().toString();

                const params = new URLSearchParams({
                    month,
                    year,
                    unit: unitFilter,
                    bagian: bagianFilter,
                    professionCategory: kategoriFilter,
                    profession: profesiFilter,
                    hospitalId: hospitalFilter,
                    employeeId: selectedUserIdFilter || 'all'
                });

                const response = await fetch(`/api/analytics/performance?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setPerformanceData(data);
                }
            } catch (error) {
                console.error('Failed to fetch performance analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPerformance();
    }, [currentMonth, unitFilter, bagianFilter, kategoriFilter, profesiFilter, selectedUserIdFilter, hospitalFilter]);

    // Filter options memoization (only from real employees, excluding admins)
    const filterOptions = useMemo(() => {
        const units = new Set<string>();
        const bagians = new Set<string>();
        const profesi = new Set<string>();
        // Only include real employees (non-admin) in filter options
        const realEmployees = allUsers.filter(u => {
            const isReal = u && u.id && !isAdministrativeAccount(u.id) && !isAnyAdmin(u);
            if (!isReal) return false;
            if (hospitalFilter && hospitalFilter !== 'all') {
                return u.hospitalId === hospitalFilter;
            }
            return true;
        });
        realEmployees.forEach(user => {
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

    const { performanceByCategory, groupedPerformanceByActivity, employeeCount } = performanceData;

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Analisis Kinerja Mutaba&apos;ah</h3>
                <div className="shrink-0 flex items-center justify-between bg-black/20 p-1 rounded-full w-full md:w-auto">
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

            <p className="text-sm text-center text-blue-200">{employeeCount} karyawan</p>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-black/10 rounded-xl border border-white/5">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
                    <p className="text-teal-200/60 font-medium animate-pulse">Menganalisis kinerja mutaba&apos;ah seluruh karyawan...</p>
                </div>
            ) : employeeCount > 0 ? (
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
    const { loggedInEmployee } = useAppDataStore();
    const { hospitals } = useHospitalStore();
    const [hospitalFilter, setHospitalFilter] = useState('all');
    const [isLoadingMore, setIsLoadingMore] = useState(false); // State local untuk loading more

    // Check if user is BPH or Super Admin (Cross-RS Authority)
    const canSelectHospital = useMemo(() => {
        if (!loggedInEmployee) return false;
        const isBPH = loggedInEmployee.functionalRoles?.includes('BPH') || (loggedInEmployee as any).functional_roles?.includes('BPH');
        return isBPH || isSuperAdmin(loggedInEmployee);
    }, [loggedInEmployee]);

    // Reset hospital filter to user's hospital if they cannot select multiple
    useEffect(() => {
        if (!canSelectHospital && loggedInEmployee?.hospitalId) {
            setHospitalFilter(loggedInEmployee.hospitalId);
        }
    }, [canSelectHospital, loggedInEmployee]);

    const allUsers = useMemo(() => {
        const employees = Object.values(allUsersData).map((d: { employee: Employee }) => d.employee);
        return employees.filter(e => {
            const isBasicActive = e && e.id && e.isActive !== false && !isAdministrativeAccount(e.id) && e.role !== 'admin' && e.role !== 'super-admin';
            if (!isBasicActive) return false;
            if (hospitalFilter && hospitalFilter !== 'all') {
                return e.hospitalId === hospitalFilter;
            }
            return true;
        });
    }, [allUsersData, hospitalFilter]);

    // Check if we likely have partial data (e.g., exactly 50 records)
    // This is a heuristic; ideally we'd pass total count from backend
    const isPartialData = allUsers.length > 0 && allUsers.length <= 50;

    const selectedHospitalName = useMemo(() => {
        if (hospitalFilter === 'all') return 'Grup RSI (Aliansi)';
        return hospitals.find(h => h.id === hospitalFilter)?.name || 'Rumah Sakit';
    }, [hospitalFilter, hospitals]);

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
            {/* Hospital Selector for BPH/Super Admin */}
            {
                canSelectHospital && (
                    <div className="bg-teal-900/40 border border-teal-500/30 rounded-xl p-5 mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="p-3 bg-teal-500/20 rounded-full text-teal-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            </div>
                            <div className="grow">
                                <h3 className="text-white font-bold text-lg leading-tight mb-1">Filter Wilayah Kerja (Global Dashboard)</h3>
                                <p className="text-teal-200/60 text-sm">Pilih Rumah Sakit untuk melihat data spesifik atau pilih "Semua Unit RS" untuk ringkasan grup.</p>
                            </div>
                            <div className="w-full md:w-80">
                                <select
                                    value={hospitalFilter}
                                    onChange={(e) => setHospitalFilter(e.target.value)}
                                    className="w-full bg-black/40 border border-teal-500/40 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none appearance-none cursor-pointer font-semibold"
                                >
                                    <option value="all" className="bg-teal-900 text-white">🏢 Tampilkan Semua Unit RS (Grup)</option>
                                    {hospitals.map(h => (
                                        <option key={h.id} value={h.id} className="bg-teal-900 text-white">
                                            🏥 {h.brand} - {h.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isPartialData && onLoadAllData && (
                    <div className="bg-blue-900/40 border border-blue-500/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300">
                                <ChartBarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">Menampilkan {allUsers.length} data karyawan di dropdown</p>
                                <p className="text-blue-200 text-xs">Analisis grafik sudah 100% akurat berdasarkan data seluruh organisasi di database.</p>
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
                )
            }

            <ActivationReport
                allUsers={allUsers}
                hospitalFilter={hospitalFilter}
                hospitalName={selectedHospitalName}
            />
            <MutabaahPerformanceReport allUsers={allUsers} dailyActivitiesConfig={dailyActivitiesConfig} hospitalFilter={hospitalFilter} />
        </div >
    );
};

export default Analytics;
