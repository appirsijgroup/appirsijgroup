import React, { useMemo, useState, useEffect } from 'react';
import { Building2, ChevronDown, LayoutDashboard, BarChart3, PieChart as PieChartIcon, Filter, UserCheck, BookOpen, CheckSquare, ChevronLeft, ChevronRight, Star, AlertCircle, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, Legend } from 'recharts';
import { type Employee, type DailyActivity, type DailyActivityProgress } from '../types';
import { isAdministrativeAccount, isAnyAdmin, isSuperAdmin } from '@/lib/rolePermissions';
import { useAppDataStore, useHospitalStore } from '@/store/store';
import { SearchIcon, ExcelIcon, PdfIcon, ChartBarIcon, PengaturanIcon as SettingsAltIcon, UsersIcon, ShieldCheckIcon } from './Icons';
import SimplePagination from './SimplePagination';
import { generateOfficialPdf, type ReportSection, type TableConfig } from './ReportGenerator';
import EmployeeSearchableInput from './EmployeeSearchableInput';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
const GLOBAL_GRADIENT = "from-amber-900/40 to-amber-800/20 border-amber-500/30";
const UNIT_GRADIENT = "from-teal-900/40 to-teal-800/20 border-teal-500/30";

// Reusable UI components for Analytics
const SelectWrapper: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
    <div className="relative group">
        {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-400 transition-colors z-10 pointer-events-none">
                {icon}
            </div>
        )}
        {children}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-teal-400 transition-colors">
            <ChevronDown size={14} />
        </div>
    </div>
);

// Helper for wrapping long labels in YAxis
const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const words = payload.value.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if ((currentLine + ' ' + words[i]).length > 25) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine += ' ' + words[i];
        }
    }
    lines.push(currentLine);

    return (
        <g transform={`translate(${x},${y})`}>
            {lines.map((line, index) => (
                <text
                    key={index}
                    x={-10}
                    y={index * 12 - (lines.length - 1) * 6}
                    dy={4}
                    textAnchor="end"
                    fill="#e2e8f0"
                    fontSize={10}
                    className="font-medium"
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

const SELECT_CLASS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500/50 focus:outline-none appearance-none cursor-pointer transition-all hover:bg-white/10";

interface AnalyticsProps {
    allUsersData: Record<string, { employee: Employee; attendance: unknown; history: unknown; }>;
    dailyActivitiesConfig: DailyActivity[];
    onLoadAllData?: () => Promise<void>;
}

interface ChartCardProps {
    title: React.ReactNode;
    children: React.ReactNode;
    minWidth?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, minWidth }) => {
    // ... existing implementation
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <div className="bg-black/20 p-3 md:p-4 rounded-xl border border-white/10 transition-all">
            <div className="font-bold text-white mb-4 text-[10px] md:text-sm uppercase tracking-wider opacity-80">{title}</div>
            {minWidth ? (
                <div className="overflow-x-auto pb-4 -mx-2 px-2">
                    <div className="min-w-[600px] md:min-w-[700px] h-72">
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

// Sub-components are defined below in the START: SUB-COMPONENTS section.


/**
 * NEW: HOSPITAL PERFORMANCE CHART (GLOBAL ONLY)
 * Visualizes the performance gap between hospitals.
 */
const GlobalComparisonCharts: React.FC<{ breakdown: any[] }> = ({ breakdown }) => {
    // Transform data to include pre-calculated percentages for labels
    const displayData = breakdown.map(d => ({
        ...d,
        aktivasiRate: d.total > 0 ? Math.round((d.activated / d.total) * 100) : 0,
        kepatuhanRate: d.total > 0 ? Math.round((d.compliance / d.total) * 100) : 0
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Aktivasi Mutaba'ah">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayData} margin={{ top: 25, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a3b1a" vertical={false} />
                        <XAxis dataKey="brand" stroke="#d97706" fontSize={11} fontWeight="bold" />
                        <YAxis stroke="#d97706" domain={[0, 100]} tickFormatter={(t) => `${t}%`} />
                        <Bar dataKey="aktivasiRate" name="Aktivasi" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                            <LabelList dataKey="aktivasiRate" position="top" fill="#fbbf24" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}%`} />
                            {displayData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#d97706'} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tingkat Kepatuhan Mutaba'ah">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayData} margin={{ top: 25, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#114232" vertical={false} />
                        <XAxis dataKey="brand" stroke="#10b981" fontSize={11} fontWeight="bold" />
                        <YAxis stroke="#10b981" domain={[0, 100]} tickFormatter={(t) => `${t}%`} />
                        <Bar
                            dataKey="kepatuhanRate"
                            name="Kepatuhan"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        >
                            <LabelList dataKey="kepatuhanRate" position="top" fill="#34d399" fontSize={12} fontWeight="bold" formatter={(val: any) => `${val}%`} />
                            {displayData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill="#10b981" fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};

// --- START: SUB-COMPONENTS (Defined before main Analytics component) ---

const HospitalPerformanceComparison: React.FC<{
    hospitalFilter: string;
    hospitals?: any[];
    currentMonth: Date;
}> = ({ hospitalFilter, hospitals = [], currentMonth }) => {
    const [selectedCategory, setSelectedCategory] = useState<'SIDIQ' | 'TABLIGH' | 'AMANAH' | 'FATONAH'>('SIDIQ');
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const fetchComparison = async () => {
            setIsLoading(true);
            try {
                const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
                const year = currentMonth.getFullYear().toString();

                const params = new URLSearchParams({
                    month,
                    year,
                    hospitalId: hospitalFilter // Use the actual filter, not hardcoded 'all'
                });

                const response = await fetch(`/api/analytics/performance?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setComparisonData(data.hospitalComparison || []);
                } else {
                    // Fallback to empty structure if API fails
                    setComparisonData([]);
                }
            } catch (error) {
                console.error('Failed to fetch hospital/unit comparison:', error);
                setComparisonData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchComparison();
    }, [hospitalFilter, currentMonth]);

    const isGlobal = hospitalFilter === 'all';

    if (!isClient) return null;

    const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; gridColor: string }> = {
        'SIDIQ': { label: 'SIDIQ (Integritas)', icon: <ShieldCheckIcon className="w-5 h-5" />, color: '#f59e0b', gridColor: '#4a3b1a' },
        'TABLIGH': { label: 'TABLIGH (Teamwork)', icon: <UsersIcon className="w-5 h-5" />, color: '#10b981', gridColor: '#114232' },
        'AMANAH': { label: 'AMANAH (Disiplin)', icon: <CheckSquare className="w-5 h-5" />, color: '#3b82f6', gridColor: '#1e3a5f' },
        'FATONAH': { label: 'FATONAH (Belajar)', icon: <BookOpen className="w-5 h-5" />, color: '#a855f7', gridColor: '#3d2b5f' }
    };

    const currentConfig = categoryConfig[selectedCategory];
    const chartData = comparisonData.map(h => ({
        brand: h.brand,
        value: h[selectedCategory]
    }));

    return (
        <div className="bg-black/20 p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/10 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-linear-to-br from-amber-500/20 to-purple-500/20 text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-base md:text-lg">
                            {hospitalFilter === 'all' ? 'Performa Unit RS' : 'Komparasi Kinerja Antar Unit'}
                        </h4>
                        <p className="text-gray-400 text-[10px] md:text-xs">Pilih kategori analisis</p>
                    </div>
                </div>

                <div className="w-full md:w-72 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none transition-transform group-focus-within:scale-110">
                        <Filter size={18} />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/20 rounded-xl pl-11 pr-10 py-3 text-white font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none appearance-none cursor-pointer shadow-inner hover:bg-black/60 transition-all"
                    >
                        <option value="SIDIQ" className="text-white bg-neutral-900">SIDIQ - Integritas</option>
                        <option value="TABLIGH" className="text-white bg-neutral-900">TABLIGH - Teamwork</option>
                        <option value="AMANAH" className="text-white bg-neutral-900">AMANAH - Disiplin</option>
                        <option value="FATONAH" className="text-white bg-neutral-900">FATONAH - Belajar</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-focus-within:text-amber-500 transition-colors">
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="h-72 flex flex-col items-center justify-center bg-black/10 rounded-xl border border-white/5">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
                </div>
            ) : comparisonData.length > 0 ? (
                <>
                    <ChartCard title={
                        <div className="flex items-center gap-2">
                            {currentConfig.icon}
                            <span>{currentConfig.label}</span>
                        </div>
                    }>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 25, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={currentConfig.gridColor} vertical={false} />
                                <XAxis dataKey="brand" stroke={currentConfig.color} fontSize={11} fontWeight="bold" />
                                <YAxis stroke={currentConfig.color} domain={[0, 100]} tickFormatter={(t) => `${t}%`} />
                                <Bar dataKey="value" name="Capaian" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                    <LabelList
                                        dataKey="value"
                                        position="top"
                                        fill={currentConfig.color}
                                        fontSize={12}
                                        fontWeight="bold"
                                        formatter={(val: any) => `${val}%`}
                                    />
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={currentConfig.color} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                </>
            ) : (
                <ChartCard title={
                    <div className="flex items-center gap-2">
                        {currentConfig.icon}
                        <span>{currentConfig.label}</span>
                    </div>
                }>
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 opacity-30">
                            <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Data {isGlobal ? 'Rumah Sakit' : 'Unit'} tidak tersedia</p>
                        <p className="text-gray-500 text-[10px] mt-1 italic">Pastikan terdapat data karyawan dan laporan mutaba&apos;ah untuk periode ini.</p>
                    </div>
                </ChartCard>
            )}
        </div>
    );
};


const ActivationReport: React.FC<{
    allUsers: Employee[];
    hospitalFilter: string;
    hospitalName?: string;
    stats: any;
}> = ({ hospitalFilter, hospitalName, stats }) => {
    const isGlobal = hospitalFilter === 'all';
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [hospitalFilter]);

    const totalPages = Math.ceil(stats.hospitalBreakdown.length / itemsPerPage);
    const paginatedData = stats.hospitalBreakdown.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">


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

            {/* QURAN SPIRITUAL PERFORMANCE CARDS */}
            {stats.quranStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">

                    {/* 1. Indeks Literasi */}
                    <div className="bg-linear-to-br from-emerald-900/40 to-emerald-800/20 p-5 rounded-xl border border-emerald-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BookOpen className="w-16 h-16 text-emerald-300" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <span className="text-emerald-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" /> Indeks Literasi Qur'an
                                </span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{stats.quranStats.indexScore}</span>
                                    <span className="text-sm text-emerald-200/60">/ 100</span>
                                </div>
                                <div className="mt-1 text-xs text-emerald-200/60">
                                    Rata-rata Kualitas Bacaan
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${stats.quranStats.indexScore > 80 ? 'bg-emerald-500' :
                                    stats.quranStats.indexScore > 60 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} style={{ width: `${stats.quranStats.indexScore}%` }}></div>
                            </div>
                            <div className="mt-2 text-[10px] text-emerald-300/80 font-bold text-right">
                                {stats.quranStats.indexScore > 80 ? 'Sangat Baik (A)' :
                                    stats.quranStats.indexScore > 60 ? 'Cukup (B)' : 'Perlu Perbaikan (C)'}
                            </div>
                        </div>
                    </div>

                    {/* 2. Butuh Binaan (Basic) */}
                    <div className="bg-linear-to-br from-rose-900/40 to-rose-800/20 p-5 rounded-xl border border-rose-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertCircle className="w-16 h-16 text-rose-300" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <span className="text-rose-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Perlu Pembinaan
                                </span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{stats.quranStats.basicCount}</span>
                                    <span className="text-sm text-rose-200/60">Orang</span>
                                </div>
                                <div className="mt-1 text-xs text-rose-200/60">
                                    Level Dasar (Belum Lancar)
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.quranStats.basicRate}%` }}></div>
                            </div>
                            <div className="mt-2 text-[10px] text-rose-300/80 font-bold text-right">
                                {stats.quranStats.basicRate}% dari Total
                            </div>
                        </div>
                    </div>

                    {/* 3. Kompeten (Standard) */}
                    <div className="bg-linear-to-br from-cyan-900/40 to-cyan-800/20 p-5 rounded-xl border border-cyan-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Star className="w-16 h-16 text-cyan-300" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <span className="text-cyan-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                    <Star className="w-4 h-4" /> Kompeten / Lancar
                                </span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{stats.quranStats.competentCount}</span>
                                    <span className="text-sm text-cyan-200/60">Orang</span>
                                </div>
                                <div className="mt-1 text-xs text-cyan-200/60">
                                    Bacaan Sudah Standar
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-cyan-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.quranStats.competentRate}%` }}></div>
                            </div>
                            <div className="mt-2 text-[10px] text-cyan-300/80 font-bold text-right">
                                {stats.quranStats.competentRate}% dari Total
                            </div>
                        </div>
                    </div>

                    {/* 4. Mahir / Hafidz (Advanced) - NEW */}
                    <div className="bg-linear-to-br from-violet-900/40 to-violet-800/20 p-5 rounded-xl border border-violet-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Crown className="w-16 h-16 text-violet-300" />
                        </div>
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <span className="text-violet-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                    <Crown className="w-4 h-4" /> Mahir / Hafidz
                                </span>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{stats.quranStats.advancedCount}</span>
                                    <span className="text-sm text-violet-200/60">Orang</span>
                                </div>
                                <div className="mt-1 text-xs text-violet-200/60">
                                    Role Model & Calon Mentor
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-violet-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.quranStats.advancedRate}%` }}></div>
                            </div>
                            <div className="mt-2 text-[10px] text-violet-300/80 font-bold text-right">
                                {stats.quranStats.advancedRate}% dari Total
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* Hospital/Unit Comparison Table - ALWAYS VISIBLE */}
            <div className="bg-black/20 rounded-xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 mt-6">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"></path><path d="M19 21V11"></path><path d="M5 21V11"></path><path d="M9 21v-4a2 2 0 0 1 4 0v4"></path></svg>
                    <h3 className="text-white font-bold text-sm">
                        {isGlobal ? 'Komparasi Kinerja Unit' : 'Komparasi Kinerja Antar Unit/Bagian'}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 text-gray-400 border-b border-white/10">
                                <th className="p-4 font-semibold whitespace-nowrap">{isGlobal ? 'Unit Rumah Sakit' : 'Unit / Bagian'}</th>
                                <th className="p-4 font-semibold text-center whitespace-nowrap">Total SDM</th>
                                <th className="p-4 font-semibold text-center whitespace-nowrap">Aktivasi Mutaba'ah</th>
                                <th className="p-4 font-semibold text-center whitespace-nowrap">Kepatuhan Laporan</th>
                                <th className="p-4 font-semibold text-center whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.hospitalBreakdown.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 italic bg-white/5">
                                        Belum ada data unit yang tersedia untuk periode ini.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((h: any) => {
                                    const actPercent = h.total > 0 ? Math.round((h.activated / h.total) * 100) : 0;
                                    const compPercent = h.total > 0 ? Math.round((h.compliance / h.total) * 100) : 0;
                                    return (
                                        <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white font-bold group-hover:text-teal-400 transition-colors truncate">{h.brand}</span>
                                                    <span className="text-gray-400 text-xs italic truncate" title={h.name}>{h.name}</span>
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {stats.hospitalBreakdown.length > 0 && (
                    <SimplePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={stats.hospitalBreakdown.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
};

const MutabaahPerformanceReport: React.FC<{
    allUsers: Employee[];
    dailyActivitiesConfig: DailyActivity[];
    hospitalFilter: string;
    hospitals?: any[];
    currentMonth: Date;
    navigateMonth: (direction: 'prev' | 'next') => void;
    isNextMonthFuture: () => boolean;
}> = ({ allUsers, dailyActivitiesConfig, hospitalFilter, hospitals = [], currentMonth, navigateMonth, isNextMonthFuture }) => {
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<{
        performanceByCategory: any[];
        groupedPerformanceByActivity: Record<string, any[]>;
        employeeCount: number;
        hospitalComparison: any[];
    }>({
        performanceByCategory: [],
        groupedPerformanceByActivity: {},
        employeeCount: 0,
        hospitalComparison: []
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

    // User filters
    const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string | undefined>(undefined);

    // Sync with prop if prop changes (e.g. from top selector)
    // NOTE: With the 'key' pattern in the parent, this component will remount on hospital change, 
    // but we keep this as a safety measure for direct prop updates.
    useEffect(() => {
        setUnitFilter('all');
        setBagianFilter('all');
        setKategoriFilter('all');
        setProfesiFilter('all');
        setSelectedUserIdFilter(undefined);
    }, [hospitalFilter]);

    const [unitFilter, setUnitFilter] = useState('all');
    const [bagianFilter, setBagianFilter] = useState('all');
    const [kategoriFilter, setKategoriFilter] = useState<'all' | 'MEDIS' | 'NON MEDIS'>('all');
    const [profesiFilter, setProfesiFilter] = useState('all');

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
                    hospitalId: hospitalFilter, // Using prop directly for perfect sync
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
                return u.hospitalId?.toLowerCase() === hospitalFilter.toLowerCase();
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
    }, [allUsers, hospitalFilter]);

    const { performanceByCategory, groupedPerformanceByActivity, employeeCount } = performanceData;

    return (
        <div className="bg-neutral-900/40 md:bg-black/20 p-3 md:p-6 rounded-xl md:rounded-2xl border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">Performa Karyawan</h3>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                    <EmployeeSearchableInput
                        allUsers={allUsers}
                        value={selectedUserIdFilter}
                        onChange={setSelectedUserIdFilter}
                        placeholder="Cari & Filter Nama Karyawan..."
                    />
                </div>
                <SelectWrapper icon={<Filter size={16} />}>
                    <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className={`${SELECT_CLASS} pl-10`}>
                        <option value="all" className="text-black bg-white">Semua Unit</option>
                        {filterOptions.units.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                    </select>
                </SelectWrapper>
                <SelectWrapper icon={<Filter size={16} />}>
                    <select value={bagianFilter} onChange={e => setBagianFilter(e.target.value)} className={`${SELECT_CLASS} pl-10`}>
                        <option value="all" className="text-black bg-white">Semua Bagian</option>
                        {filterOptions.bagians.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                    </select>
                </SelectWrapper>
                <SelectWrapper icon={<UsersIcon className="w-4 h-4" />}>
                    <select value={kategoriFilter} onChange={e => setKategoriFilter(e.target.value as 'all' | 'MEDIS' | 'NON MEDIS')} className={`${SELECT_CLASS} pl-10`}>
                        <option value="all" className="text-black bg-white">Semua Kategori Profesi</option>
                        <option value="MEDIS" className="text-black bg-white">MEDIS</option>
                        <option value="NON MEDIS" className="text-black bg-white">NON MEDIS</option>
                    </select>
                </SelectWrapper>
                <SelectWrapper icon={<Filter size={16} />}>
                    <select value={profesiFilter} onChange={e => setProfesiFilter(e.target.value)} className={`${SELECT_CLASS} pl-10`}>
                        <option value="all" className="text-black bg-white">Semua Profesi</option>
                        {filterOptions.profesi.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt}</option>)}
                    </select>
                </SelectWrapper>
            </div>



            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-black/10 rounded-xl border border-white/5">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* WORK ANALYSIS SUMMARY CARDS (RINGKASAN ANALISIS KERJA) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {(performanceByCategory.length > 0 ? performanceByCategory : [
                            { name: 'AMANAH (Disiplin)', Persentase: 0 },
                            { name: 'FATONAH (Belajar)', Persentase: 0 },
                            { name: 'SIDIQ (Integritas)', Persentase: 0 },
                            { name: 'TABLIGH (Teamwork)', Persentase: 0 }
                        ]).map((category: any, index: number) => {
                            const colors = [
                                { bg: 'bg-amber-900/40', border: 'border-amber-500/20', text: 'text-amber-400' },
                                { bg: 'bg-teal-900/40', border: 'border-teal-500/20', text: 'text-teal-400' },
                                { bg: 'bg-blue-900/40', border: 'border-blue-500/20', text: 'text-blue-400' },
                                { bg: 'bg-purple-900/40', border: 'border-purple-500/20', text: 'text-purple-400' }
                            ];
                            const style = colors[index % colors.length];

                            return (
                                <div key={category.name} className={`${style.bg} p-4 rounded-xl border ${style.border} shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                                    <div className="flex flex-col">
                                        <span className={`${style.text} text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 opacity-80 truncate`}>
                                            {category.name}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl md:text-3xl font-black text-white">
                                                {category.Persentase}%
                                            </span>
                                            <span className="text-[10px] text-gray-400">Rata-rata</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-1.5 mt-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${style.text.replace('text-', 'bg-')}`}
                                                style={{ width: `${category.Persentase}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>


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
                                    <BarChart data={activities} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            stroke="#94a3b8"
                                            width={220}
                                            tick={<CustomYAxisTick />}
                                            interval={0}
                                        />
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
                    {employeeCount === 0 && (
                        <div className="bg-black/20 p-20 rounded-xl border border-dashed border-white/10 text-center">
                            <p className="text-gray-500 text-sm italic">Belum ada data aktivitas untuk filter ini.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- END: SUB-COMPONENTS ---

const Analytics: React.FC<AnalyticsProps> = ({ allUsersData, dailyActivitiesConfig, onLoadAllData }) => {
    const { loggedInEmployee } = useAppDataStore();
    const { hospitals, loadHospitals } = useHospitalStore();

    useEffect(() => {
        loadHospitals();
    }, [loadHospitals]);

    // Check if user is BPH or Super Admin (Cross-RS Authority) or an Admin with multiple RS roles
    const canSelectHospital = useMemo(() => {
        if (!loggedInEmployee) return false;
        const isBPH = loggedInEmployee.functionalRoles?.includes('BPH') || (loggedInEmployee as any).functional_roles?.includes('BPH');
        const isSuper = isSuperAdmin(loggedInEmployee);
        const hasManagedHospitals = (loggedInEmployee.managedHospitalIds?.length || 0) > 0;

        return isBPH || isSuper || hasManagedHospitals;
    }, [loggedInEmployee]);

    // Filter hospitals based on user access
    const accessibleHospitals = useMemo(() => {
        if (!loggedInEmployee) return [];
        const isBPH = loggedInEmployee.functionalRoles?.includes('BPH') || (loggedInEmployee as any).functional_roles?.includes('BPH');
        const isSuper = isSuperAdmin(loggedInEmployee);

        if (isBPH || isSuper) return hospitals;

        if (loggedInEmployee.managedHospitalIds && loggedInEmployee.managedHospitalIds.length > 0) {
            // Include both their own hospital and any specifically managed ones
            const allowedIds = [loggedInEmployee.hospitalId, ...(loggedInEmployee.managedHospitalIds || [])]
                .filter(Boolean)
                .map(id => id?.toLowerCase());

            return hospitals.filter(h => allowedIds.includes(h.id.toLowerCase()));
        }

        return hospitals.filter(h => h.id.toLowerCase() === loggedInEmployee.hospitalId?.toLowerCase());
    }, [hospitals, loggedInEmployee]);

    const [hospitalFilter, setHospitalFilter] = useState('all');
    const [isFilterInitialized, setIsFilterInitialized] = useState(false);

    // Initial Filter Scoping for Security
    useEffect(() => {
        if (loggedInEmployee && !isFilterInitialized) {
            const isBPH = loggedInEmployee.functionalRoles?.includes('BPH') || (loggedInEmployee as any).functional_roles?.includes('BPH');
            const isSuper = isSuperAdmin(loggedInEmployee);
            const globalAccess = isBPH || isSuper;

            if (!globalAccess) {
                // Regular admins are forced to their primary hospital
                const primaryHospital = loggedInEmployee.hospitalId;
                if (primaryHospital) {
                    setHospitalFilter(primaryHospital);
                }
            }
            setIsFilterInitialized(true);
        }
    }, [loggedInEmployee, isFilterInitialized]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

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

    // --- ACCURATE STATS STATE ---
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activatedCount: 0,
        notActivatedCount: 0,
        mentorCount: 0,
        complianceRate: 0,
        activationRate: 0,
        hospitalBreakdown: [] as any[]
    });

    useEffect(() => {
        if (canSelectHospital && onLoadAllData) {
            onLoadAllData();
        }
    }, [canSelectHospital, onLoadAllData]);

    useEffect(() => {
        if (!isFilterInitialized) return; // Wait for security scoping

        const fetchAccurateStats = async () => {
            setIsLoadingStats(true);
            try {
                const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
                const year = currentMonth.getFullYear().toString();

                const params = new URLSearchParams({
                    month,
                    year
                });

                if (hospitalFilter && hospitalFilter !== 'all') {
                    params.append('hospitalId', hospitalFilter);
                }
                const response = await fetch(`/api/analytics/stats?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to load accurate analytics stats:', error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchAccurateStats();
    }, [hospitalFilter, currentMonth, isFilterInitialized]);
    // -------------------------------------------------------------

    // Check if user has access to Global view
    const canSeeGlobal = useMemo(() => {
        if (!loggedInEmployee) return false;
        const isBPH = loggedInEmployee.functionalRoles?.includes('BPH') || (loggedInEmployee as any).functional_roles?.includes('BPH');
        const isSuper = isSuperAdmin(loggedInEmployee);
        return isBPH || isSuper;
    }, [loggedInEmployee]);

    // Removal of automatic redirection as it's now handled by isFilterInitialized logic



    const isGlobal = hospitalFilter === 'all';

    const allUsers = useMemo(() => {
        const employees = Object.values(allUsersData).map((d: { employee: Employee }) => d.employee);
        return employees.filter(e => {
            const isBasicActive = e && e.id && e.isActive !== false && !isAdministrativeAccount(e.id) && e.role !== 'admin' && e.role !== 'super-admin';
            if (!isBasicActive) return false;
            if (hospitalFilter && hospitalFilter !== 'all') {
                return e.hospitalId?.toLowerCase() === hospitalFilter.toLowerCase();
            }
            return true;
        });
    }, [allUsersData, hospitalFilter]);

    // Check if we likely have partial data by comparing current count with expected stats
    const isPartialData = useMemo(() => {
        // Expected total from server stats
        const expectedTotal = isGlobal
            ? stats.totalEmployees
            : (stats.hospitalBreakdown.find(h => h.id?.toLowerCase() === hospitalFilter.toLowerCase())?.total || 0);

        // If we have 0 users but stats say we should have more, or if we have exactly a round number like 50 (legacy pagination limit)
        return (allUsers.length < expectedTotal) || (allUsers.length > 0 && allUsers.length <= 50);
    }, [allUsers.length, hospitalFilter, stats, isGlobal]);

    const selectedHospitalName = useMemo(() => {
        if (hospitalFilter === 'all') return 'Grup RSI (Aliansi)';
        return hospitals.find(h => h.id === hospitalFilter)?.name || 'Rumah Sakit';
    }, [hospitalFilter, hospitals]);

    const handleLoadAll = async () => {
        if (onLoadAllData) {
            setIsLoadingMore(true);
            try { await onLoadAllData(); } finally { setIsLoadingMore(false); }
        }
    };

    // ⚡ Auto-load full employee list when switching to detailed view to ensure search works perfectly
    useEffect(() => {
        if (viewMode === 'detailed' && isPartialData && onLoadAllData && !isLoadingMore) {
            handleLoadAll();
        }
    }, [viewMode, isPartialData, onLoadAllData, isLoadingMore]);

    if (Object.keys(allUsersData).length === 0) {
        return (
            <div className="bg-black/20 p-8 rounded-lg border border-white/10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* 🏥 Hospital Selector & Navigation Bar */}
            <div className={`p-1 rounded-2xl border ${isGlobal ? 'bg-amber-900/20 border-amber-500/30' : 'bg-teal-900/20 border-teal-500/30'} backdrop-blur-md transition-all duration-500 shadow-2xl`}>
                <div className="flex flex-col md:flex-row md:items-center p-2 gap-4">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isGlobal ? 'bg-amber-500/10 text-amber-100' : 'bg-teal-500/10 text-teal-100'} grow`}>
                        <div className={`p-2 rounded-lg ${isGlobal ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'}`}>
                            <LayoutDashboard size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm md:text-lg font-black ${isGlobal ? 'text-amber-400' : 'text-teal-400'} truncate`}>
                                {isGlobal ? 'RSIJ GROUP' : selectedHospitalName}
                            </span>
                        </div>
                    </div>

                    {/* View Mode Toggle - Visible for ALL Admins */}
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 self-stretch shrink-0">
                        <button
                            onClick={() => setViewMode('overview')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'overview' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <BarChart3 size={16} />
                            RINGKASAN
                        </button>
                        <button
                            onClick={() => setViewMode('detailed')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'detailed' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            <PieChartIcon size={16} />
                            ANALISIS KERJA
                        </button>
                    </div>

                    {/* Hospital Filter - Only for Super Admin / BPH */}
                    {canSeeGlobal && (
                        <div className="w-full md:w-80 flex items-center pr-2 relative shrink-0">
                            <label className="sr-only">Pilih Unit Kerja</label>
                            <div className="absolute left-4 z-10 text-gray-400">
                                <Building2 size={18} />
                            </div>
                            <select
                                value={hospitalFilter}
                                onChange={(e) => setHospitalFilter(e.target.value)}
                                className={`w-full bg-black/60 border ${isGlobal ? 'border-amber-500/40 text-amber-200' : 'border-teal-500/40 text-teal-200'} rounded-xl pl-11 pr-10 py-3.5 focus:ring-2 ${isGlobal ? 'focus:ring-amber-500' : 'focus:ring-teal-500'} focus:outline-none appearance-none cursor-pointer font-bold shadow-inner transition-all`}
                            >
                                {canSeeGlobal && <option value="all" className="bg-neutral-900 text-amber-400">RSIJ GROUP</option>}
                                <optgroup label={canSeeGlobal ? "Unit Rumah Sakit" : "Akses Unit Kerja"} className="bg-neutral-900 text-gray-400">
                                    {accessibleHospitals.map(h => (
                                        <option key={h.id} value={h.id} className="bg-neutral-900 text-white">
                                            {h.brand}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                            <div className="absolute right-4 pointer-events-none text-gray-400">
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Month Navigator - Standalone Section (Compact) */}
            <div className="flex justify-center -mt-6 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="flex items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 rounded-xl hover:bg-white/10 text-white transition-all flex items-center justify-center group"
                        title="Bulan Sebelumnya"
                    >
                        <ChevronDown className="w-5 h-5 rotate-90 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="min-w-[160px] text-center px-6 border-x border-white/5">
                        <span className="font-black text-[10px] text-teal-400 tracking-[0.2em] uppercase block mb-0.5">Periode Laporan</span>
                        <span className="font-bold text-sm text-white">
                            {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <button
                        onClick={() => navigateMonth('next')}
                        disabled={isNextMonthFuture()}
                        className="p-2 rounded-xl hover:bg-white/10 text-white transition-all disabled:opacity-20 flex items-center justify-center group"
                        title="Bulan Berikutnya"
                    >
                        <ChevronDown className="w-5 h-5 -rotate-90 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* 🏥 DASHBOARD CONTENT WITH LOADING OVERLAY */}
            {isLoadingStats ? (
                <div className="flex flex-col items-center justify-center py-32 bg-black/20 rounded-3xl border border-white/10 animate-pulse">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-amber-500/20 border-b-amber-500 rounded-full animate-spin-reverse"></div>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'overview' ? (
                /* 💎 EXECUTIVE OVERVIEW - Fast & Visual */
                <div className="space-y-8 animate-in fade-in duration-700">
                    <ActivationReport
                        allUsers={allUsers}
                        hospitalFilter={hospitalFilter}
                        hospitalName={selectedHospitalName}
                        stats={stats}
                    />

                    <div className="w-full space-y-8">
                        {isGlobal && canSeeGlobal && <GlobalComparisonCharts breakdown={stats.hospitalBreakdown} />}
                        {isGlobal && (
                            <HospitalPerformanceComparison
                                hospitalFilter={hospitalFilter}
                                hospitals={hospitals}
                                currentMonth={currentMonth}
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* 🔍 DETAILED ANALYTICS - Performance Deep Dive */
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="p-0 md:p-6 bg-transparent md:bg-black/40 rounded-3xl md:border md:border-white/10 md:shadow-2xl relative overflow-hidden">
                        <MutabaahPerformanceReport
                            key={`${hospitalFilter}-${viewMode}`}
                            allUsers={allUsers}
                            dailyActivitiesConfig={dailyActivitiesConfig}
                            hospitalFilter={hospitalFilter}
                            hospitals={hospitals}
                            currentMonth={currentMonth}
                            navigateMonth={navigateMonth}
                            isNextMonthFuture={isNextMonthFuture}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
