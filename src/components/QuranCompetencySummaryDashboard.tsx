import React, { useState, useEffect, useMemo } from 'react';
import { Employee, QuranDimension, EmployeeQuranCompetency } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import { GraduationCap, Users, LayoutDashboard, Search, Filter, BarChart3, List, Clock } from 'lucide-react';
import { getQuranLevels } from '@/services/quranCompetencyService';

interface QuranCompetencySummaryDashboardProps {
    mentees: Employee[];
    assessorId: string;
    loggedInEmployee: Employee; // 🔥 NEW: Pass the logged in employee to check role
    isReadOnly?: boolean; // 🔥 NEW: For admin - can only view, not assess
    onUpdateMentee: (userId: string, updates: Partial<Employee>) => void;
    onStartAssessment: (mentee: Employee) => void;
}

const LEVEL_DESCRIPTIONS: Record<string, string> = {
    // Reading
    'R0': 'Belum bisa membaca', 'R1': 'Terbata-bata', 'R2': 'Lancar (tajwid kurang)', 'R3': 'Lancar & Stabil',
    // Tajwid
    'T0': 'Awam', 'T1': 'Dasar', 'T2': 'Cukup', 'T3': 'Baik',
    // Hafalan
    'H0': 'Kosong', 'H1': 'Juz 30', 'H2': 'Juz 29', 'H3': 'Juz 28', 'H4': 'Juz 1', 'H5': '30 Juz',
    // Adab
    'P0': 'Dasar', 'P1': 'Global', 'P2': 'Tematik', 'P3': 'Tadabbur'
};

const LevelBadge = ({ code, colorClass, borderClass }: { code: string, colorClass: string, borderClass: string }) => (
    <div className="group relative inline-block">
        <span className={`cursor-help inline-block px-2 py-1 ${colorClass} text-xs font-mono font-bold rounded border ${borderClass}`}>
            {code}
        </span>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center whitespace-normal border border-white/20 shadow-xl">
            {LEVEL_DESCRIPTIONS[code] || 'Level ' + code}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
    </div>
);

const PREMIUM_COLORS = [
    '#14b8a6', // teal-500
    '#0ea5e9', // sky-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#a855f7', // purple-500
    '#d946ef', // fuchsia-500',
];

type TabView = 'list' | 'dashboard';

export const QuranCompetencySummaryDashboard: React.FC<QuranCompetencySummaryDashboardProps> = ({
    mentees: initialMentees,
    assessorId,
    loggedInEmployee, // 🔥 NEW
    isReadOnly = false, // 🔥 NEW: Default to false (can assess)
    onUpdateMentee,
    onStartAssessment
}) => {
    const [activeTab, setActiveTab] = useState<TabView>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUnit, setFilterUnit] = useState('all');
    const [filterHospital, setFilterHospital] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [allCompetencies, setAllCompetencies] = useState<Record<string, EmployeeQuranCompetency>>({});
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    const itemsPerPage = 10;

    // 🔥 FIX: Check if user is admin or super-admin (not based on mentee count)
    const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';
    const isSuperAdmin = loggedInEmployee.role === 'super-admin';

    // Fetch all competencies if admin or super admin
    useEffect(() => {
        const fetchGlobalData = async () => {
            if (isAdmin) {
                setIsLoadingAll(true);
                const { getAllQuranCompetencies } = await import('@/services/quranCompetencyService');
                const comps = await getAllQuranCompetencies();
                const mapping: Record<string, EmployeeQuranCompetency> = {};
                comps.forEach(c => mapping[c.employeeId] = c);
                setAllCompetencies(mapping);
                setIsLoadingAll(false);
            }
        };
        fetchGlobalData();
    }, [isAdmin]);

    const mentees = useMemo(() => {
        if (Object.keys(allCompetencies).length === 0) return initialMentees;
        return initialMentees.map(m => ({
            ...m,
            quranCompetency: allCompetencies[m.id] || m.quranCompetency
        }));
    }, [initialMentees, allCompetencies]);

    // Get unique hospitals from mentees
    const hospitals = useMemo(() => {
        const h = new Set<string>();
        mentees.forEach(m => { if (m.hospitalId) h.add(m.hospitalId); });
        return Array.from(h).sort();
    }, [mentees]);

    // Get units filtered by selected hospital
    const units = useMemo(() => {
        const u = new Set<string>();
        mentees.forEach(m => {
            // Only include units from selected hospital (or all if 'all' is selected)
            if (filterHospital === 'all' || m.hospitalId === filterHospital) {
                if (m.unit) u.add(m.unit);
            }
        });
        return Array.from(u).sort();
    }, [mentees, filterHospital]);

    // Reset unit filter when hospital filter changes
    useEffect(() => {
        setFilterUnit('all');
        setCurrentPage(1);
    }, [filterHospital]);

    // Reset page when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterUnit]);

    const filteredMentees = useMemo(() => {
        return mentees.filter(m => {
            const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesUnit = filterUnit === 'all' || m.unit === filterUnit;
            const matchesHospital = filterHospital === 'all' || m.hospitalId === filterHospital;
            return matchesSearch && matchesUnit && matchesHospital;
        });
    }, [mentees, searchQuery, filterUnit, filterHospital]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredMentees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMentees = filteredMentees.slice(startIndex, endIndex);

    const aggregateData = useMemo(() => {
        const stats = {
            R: {} as Record<string, number>,
            T: {} as Record<string, number>,
            H: {} as Record<string, number>,
            P: {} as Record<string, number>
        };

        filteredMentees.forEach(m => {
            if (m.quranCompetency) {
                const comp = m.quranCompetency;
                if (comp.readingLevel) stats.R[comp.readingLevel] = (stats.R[comp.readingLevel] || 0) + 1;
                if (comp.tajwidLevel) stats.T[comp.tajwidLevel] = (stats.T[comp.tajwidLevel] || 0) + 1;
                if (comp.memorizationLevel) stats.H[comp.memorizationLevel] = (stats.H[comp.memorizationLevel] || 0) + 1;
                if (comp.understandingLevel) stats.P[comp.understandingLevel] = (stats.P[comp.understandingLevel] || 0) + 1;
            }
        });

        const formatForChart = (dimensionStats: Record<string, number>, dimension: QuranDimension) => {
            // Define all possible levels for each dimension
            const allLevels: Record<QuranDimension, string[]> = {
                'R': ['R0', 'R1', 'R2', 'R3'],
                'T': ['T0', 'T1', 'T2', 'T3'],
                'H': ['H0', 'H1', 'H2', 'H3', 'H4', 'H5'],
                'P': ['P0', 'P1', 'P2', 'P3']
            };

            const levels = allLevels[dimension];
            const totalCount = filteredMentees.length || 1;

            return levels.map(code => {
                const count = dimensionStats[code] || 0;
                return {
                    code,
                    count,
                    percentage: filteredMentees.length > 0 ? Math.round((count / totalCount) * 100) : 0
                };
            });
        };

        return {
            R: formatForChart(stats.R, 'R'),
            T: formatForChart(stats.T, 'T'),
            H: formatForChart(stats.H, 'H'),
            P: formatForChart(stats.P, 'P')
        };
    }, [filteredMentees]);

    const ChartSection = React.memo(({ title, data, color }: { title: string, data: any[], color: string }) => (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-[400px]">
            <h4 className="text-white font-bold mb-6 flex justify-between items-center">
                <span>{title}</span>
                <span className="text-xs text-white/40 font-normal">Agregat Anggota</span>
            </h4>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="code"
                            type="category"
                            stroke="#ffffff60"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} barSize={32} isAnimationActive={false}>
                            <LabelList dataKey="percentage" position="right" formatter={(val: any) => val ? `${val}%` : ''} style={{ fill: '#ffffff90', fontSize: '12px' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    ));

    const TabButton = ({ tab, icon: Icon, label }: { tab: TabView, icon: any, label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tab Navigation */}
            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/5 w-fit">
                <TabButton tab="list" icon={List} label="Daftar Penilaian" />
                <TabButton tab="dashboard" icon={BarChart3} label="Dashboard" />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Cari anggota bimbingan..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {isSuperAdmin && (
                    <div className="relative w-full md:w-64">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none"
                            value={filterHospital}
                            onChange={e => setFilterHospital(e.target.value)}
                        >
                            <option value="all" className="bg-gray-900">Semua RS</option>
                            {hospitals.map(hospital => (
                                <option key={hospital} value={hospital} className="bg-gray-900">{hospital}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="relative w-full md:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none"
                        value={filterUnit}
                        onChange={e => setFilterUnit(e.target.value)}
                    >
                        <option value="all" className="bg-gray-900">Semua Unit</option>
                        {units.map(unit => (
                            <option key={unit} value={unit} className="bg-gray-900">{unit}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'list' ? (
                <>
                    {/* Daftar Penilaian Tab */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Nama</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Unit</th>
                                        {isSuperAdmin && (
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">RS</th>
                                        )}
                                        <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Reading</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Tajwid</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Hafalan</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Adab</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedMentees.map((m) => (
                                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">{m.name}</td>
                                            <td className="px-6 py-4 text-sm text-white/70 whitespace-nowrap">{m.unit || '-'}</td>
                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-sm text-white/70 whitespace-nowrap">{m.hospitalId || '-'}</td>
                                            )}
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <LevelBadge
                                                    code={m.quranCompetency?.readingLevel || 'R0'}
                                                    colorClass="bg-emerald-500/20 text-emerald-400"
                                                    borderClass="border-emerald-500/30"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <LevelBadge
                                                    code={m.quranCompetency?.tajwidLevel || 'T0'}
                                                    colorClass="bg-blue-500/20 text-blue-400"
                                                    borderClass="border-blue-500/30"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <LevelBadge
                                                    code={m.quranCompetency?.memorizationLevel || 'H0'}
                                                    colorClass="bg-purple-500/20 text-purple-400"
                                                    borderClass="border-purple-500/30"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <LevelBadge
                                                    code={m.quranCompetency?.understandingLevel || 'P0'}
                                                    colorClass="bg-amber-500/20 text-amber-400"
                                                    borderClass="border-amber-500/30"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isReadOnly ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/40 text-xs font-bold rounded-lg border border-white/10">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        Lihat Saja
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => onStartAssessment(m)}
                                                        className="px-4 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white text-xs font-bold rounded-lg border border-teal-500/20 transition-all active:scale-95"
                                                    >
                                                        Nilai
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredMentees.length > 0 ? (
                            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                                <div className="hidden md:block text-sm text-white/60">
                                    Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredMentees.length)} dari {filteredMentees.length} data
                                </div>
                                <div className="flex items-center gap-2 w-full justify-center md:w-auto">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg border border-white/10 transition-all"
                                    >
                                        &lt;
                                    </button>
                                    <div className="px-4 py-2 bg-teal-500/20 text-teal-400 text-sm font-bold rounded-lg border border-teal-500/30">
                                        Hal {currentPage} dari {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg border border-white/10 transition-all"
                                    >
                                        &gt;
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-white/40">
                                Tidak ada data yang sesuai dengan filter
                            </div>
                        )}
                    </div>

                    {/* Level Legend */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h4 className="text-white/80 font-bold mb-4 flex items-center gap-2">
                            <List className="w-4 h-4 text-teal-400" />
                            Keterangan Level Penilaian
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                            <div className="space-y-2">
                                <h5 className="text-emerald-400 font-bold mb-1">Reading (R)</h5>
                                {['R0', 'R1', 'R2', 'R3'].map(code => (
                                    <div key={code} className="flex gap-2 text-white/60">
                                        <span className="font-mono font-bold text-white/80 w-6">{code}</span>
                                        <span>{LEVEL_DESCRIPTIONS[code]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-blue-400 font-bold mb-1">Tajwid (T)</h5>
                                {['T0', 'T1', 'T2', 'T3'].map(code => (
                                    <div key={code} className="flex gap-2 text-white/60">
                                        <span className="font-mono font-bold text-white/80 w-6">{code}</span>
                                        <span>{LEVEL_DESCRIPTIONS[code]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-purple-400 font-bold mb-1">Hafalan (H)</h5>
                                {['H0', 'H1', 'H2', 'H3', 'H4', 'H5'].map(code => (
                                    <div key={code} className="flex gap-2 text-white/60">
                                        <span className="font-mono font-bold text-white/80 w-6">{code}</span>
                                        <span>{LEVEL_DESCRIPTIONS[code]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-amber-400 font-bold mb-1">Adab (P)</h5>
                                {['P0', 'P1', 'P2', 'P3'].map(code => (
                                    <div key={code} className="flex gap-2 text-white/60">
                                        <span className="font-mono font-bold text-white/80 w-6">{code}</span>
                                        <span>{LEVEL_DESCRIPTIONS[code]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Dashboard Tab */
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-linear-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/20 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <Users className="w-10 h-10 text-teal-400 mb-4 group-hover:scale-110 transition-transform" />
                                <div className="flex items-center gap-2">
                                    <div className="text-3xl font-black text-white">{filteredMentees.length}</div>
                                    {isSuperAdmin && (
                                        <span className="bg-teal-500/20 text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/30">GLOBAL</span>
                                    )}
                                </div>
                                <div className="text-teal-200/60 text-sm font-semibold uppercase tracking-wider">
                                    {isSuperAdmin ? (searchQuery || filterUnit !== 'all' || filterHospital !== 'all' ? 'Hasil Filter' : 'Total Karyawan') : 'Total Anggota Bimbingan'}
                                </div>
                            </div>
                        </div>
                        <div className="bg-linear-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <GraduationCap className="w-10 h-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <div className="text-3xl font-black text-white">
                                    {filteredMentees.filter(m => m.quranCompetency).length}
                                </div>
                                <div className="text-blue-200/60 text-sm font-semibold uppercase tracking-wider">Telah Dinilai</div>
                            </div>
                        </div>
                        <div className="bg-linear-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <Clock className="w-10 h-10 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
                                <div className="text-3xl font-black text-white">
                                    {filteredMentees.length - filteredMentees.filter(m => m.quranCompetency).length}
                                </div>
                                <div className="text-amber-200/60 text-sm font-semibold uppercase tracking-wider">Belum Dinilai</div>
                            </div>
                        </div>
                        <div className="bg-linear-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <LayoutDashboard className="w-10 h-10 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                                <div className="text-3xl font-black text-white">
                                    {filteredMentees.length > 0 ? Math.round((filteredMentees.filter(m => m.quranCompetency).length / filteredMentees.length) * 100) : 0}%
                                </div>
                                <div className="text-purple-200/60 text-sm font-semibold uppercase tracking-wider">Progress Pemetaan</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ChartSection key="reading-chart" title="Reading Accuracy (Kualitas Baca)" data={aggregateData.R} color="#10b981" />
                        <ChartSection key="tajwid-chart" title="Tajwid Mastery (Ilmu Tajwid)" data={aggregateData.T} color="#3b82f6" />
                        <ChartSection key="hifdzil-chart" title="Hifdzil Progress (Hafalan)" data={aggregateData.H} color="#a855f7" />
                        <ChartSection key="understanding-chart" title="Understanding & Adab" data={aggregateData.P} color="#f59e0b" />
                    </div>
                </div>
            )}
        </div>
    );
};
