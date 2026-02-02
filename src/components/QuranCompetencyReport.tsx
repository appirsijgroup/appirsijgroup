import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Hospital, EmployeeQuranCompetency } from '@/types';
import { Search, Filter, Download, FileText, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface QuranCompetencyReportProps {
    allUsersData: Record<string, { employee: Employee }>;
    hospitals: Hospital[];
    loggedInEmployee: Employee;
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

const QuranCompetencyReport: React.FC<QuranCompetencyReportProps> = ({
    allUsersData,
    hospitals,
    loggedInEmployee
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [hospitalFilter, setHospitalFilter] = useState('all');
    const [unitFilter, setUnitFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'assessed' | 'not-assessed'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [allCompetencies, setAllCompetencies] = useState<Record<string, EmployeeQuranCompetency>>({});
    const [isLoadingCompetencies, setIsLoadingCompetencies] = useState(false);

    const itemsPerPage = 15;

    const isSuperAdmin = loggedInEmployee.role === 'super-admin';
    const isAdmin = loggedInEmployee.role === 'admin' || isSuperAdmin;

    // Fetch all competencies
    useEffect(() => {
        const fetchCompetencies = async () => {
            if (isAdmin) {
                setIsLoadingCompetencies(true);
                try {
                    const { getAllQuranCompetencies } = await import('@/services/quranCompetencyService');
                    const comps = await getAllQuranCompetencies();
                    const mapping: Record<string, EmployeeQuranCompetency> = {};
                    comps.forEach(c => mapping[c.employeeId] = c);
                    setAllCompetencies(mapping);
                } catch (error) {
                    console.error('Failed to load competencies:', error);
                } finally {
                    setIsLoadingCompetencies(false);
                }
            }
        };
        fetchCompetencies();
    }, [isAdmin]);

    // Get all employees with their competency data
    const allEmployees = useMemo(() => {
        return Object.values(allUsersData).map(d => ({
            ...d.employee,
            quranCompetency: allCompetencies[d.employee.id] || d.employee.quranCompetency
        }));
    }, [allUsersData, allCompetencies]);

    // Filter employees based on admin access
    const accessibleEmployees = useMemo(() => {
        if (isSuperAdmin) return allEmployees;

        const managedHospitalIds = loggedInEmployee.managedHospitalIds || [];
        return allEmployees.filter(emp =>
            emp.hospitalId && managedHospitalIds.includes(emp.hospitalId)
        );
    }, [allEmployees, isSuperAdmin, loggedInEmployee.managedHospitalIds]);

    // Get unique units based on hospital filter
    const units = useMemo(() => {
        const u = new Set<string>();
        accessibleEmployees.forEach(emp => {
            if (hospitalFilter === 'all' || emp.hospitalId === hospitalFilter) {
                if (emp.unit) u.add(emp.unit);
            }
        });
        return Array.from(u).sort();
    }, [accessibleEmployees, hospitalFilter]);

    // Reset filters when hospital changes
    useEffect(() => {
        setUnitFilter('all');
        setCurrentPage(1);
    }, [hospitalFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, unitFilter, statusFilter]);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return accessibleEmployees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesHospital = hospitalFilter === 'all' || emp.hospitalId === hospitalFilter;
            const matchesUnit = unitFilter === 'all' || emp.unit === unitFilter;

            const hasCompetency = !!emp.quranCompetency;
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'assessed' && hasCompetency) ||
                (statusFilter === 'not-assessed' && !hasCompetency);

            return matchesSearch && matchesHospital && matchesUnit && matchesStatus;
        });
    }, [accessibleEmployees, searchTerm, hospitalFilter, unitFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Statistics
    const stats = useMemo(() => {
        const total = filteredEmployees.length;
        const assessed = filteredEmployees.filter(e => e.quranCompetency).length;
        const notAssessed = total - assessed;
        const assessmentRate = total > 0 ? Math.round((assessed / total) * 100) : 0;

        return { total, assessed, notAssessed, assessmentRate };
    }, [filteredEmployees]);

    // Export to Excel
    const handleExportExcel = () => {
        const exportData = filteredEmployees.map(emp => ({
            'NIP': emp.id,
            'Nama': emp.name,
            'Unit': emp.unit || '-',
            'Hospital': emp.hospitalId || '-',
            'Reading': emp.quranCompetency?.readingLevel || 'Belum Dinilai',
            'Tajwid': emp.quranCompetency?.tajwidLevel || 'Belum Dinilai',
            'Hafalan': emp.quranCompetency?.memorizationLevel || 'Belum Dinilai',
            'Adab': emp.quranCompetency?.understandingLevel || 'Belum Dinilai',
            'Status': emp.quranCompetency ? 'Sudah Dinilai' : 'Belum Dinilai',
            'Tanggal Penilaian': emp.quranCompetency?.assessedAt
                ? new Date(emp.quranCompetency.assessedAt).toLocaleDateString('id-ID')
                : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kompetensi Al-Quran');

        const fileName = `Laporan_Kompetensi_AlQuran_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-linear-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-xs text-blue-200/60 font-semibold uppercase">Total Karyawan</div>
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-green-500/20 to-green-500/5 border border-green-500/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.assessed}</div>
                            <div className="text-xs text-green-200/60 font-semibold uppercase">Sudah Dinilai</div>
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-amber-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.notAssessed}</div>
                            <div className="text-xs text-amber-200/60 font-semibold uppercase">Belum Dinilai</div>
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 p-5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-purple-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.assessmentRate}%</div>
                            <div className="text-xs text-purple-200/60 font-semibold uppercase">Progress Penilaian</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIP..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    {/* Hospital Filter (Super Admin only) */}
                    {isSuperAdmin && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <select
                                value={hospitalFilter}
                                onChange={e => setHospitalFilter(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                            >
                                <option value="all" className="bg-gray-900">Semua Hospital</option>
                                {hospitals.map(h => (
                                    <option key={h.id} value={h.id} className="bg-gray-900">{h.brand}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Unit Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <select
                            value={unitFilter}
                            onChange={e => setUnitFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                        >
                            <option value="all" className="bg-gray-900">Semua Unit</option>
                            {units.map(unit => (
                                <option key={unit} value={unit} className="bg-gray-900">{unit}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                        >
                            <option value="all" className="bg-gray-900">Semua Status</option>
                            <option value="assessed" className="bg-gray-900">Sudah Dinilai</option>
                            <option value="not-assessed" className="bg-gray-900">Belum Dinilai</option>
                        </select>
                    </div>
                </div>

                {/* Integrated Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-white/5">
                    <div className="mr-auto">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold ml-1">Total {stats.total} Karyawan (Tapis)</p>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={filteredEmployees.length === 0}
                        className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed group border border-green-500/20 shadow-sm"
                        title="Ekspor ke Excel"
                    >
                        <Download className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Table */}
            < div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden" >
                {
                    isLoadingCompetencies ? (
                        <div className="flex items-center justify-center py-20" >
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-black/40 border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">NIP</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Nama</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Unit</th>
                                            {isSuperAdmin && (
                                                <th className="px-6 py-4 text-left text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Hospital</th>
                                            )}
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Reading</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Tajwid</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Hafalan</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Adab</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-white/60 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {paginatedEmployees.map(emp => (
                                            <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 text-sm font-mono text-white/70 whitespace-nowrap">{emp.id}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">{emp.name}</td>
                                                <td className="px-6 py-4 text-sm text-white/70 whitespace-nowrap">{emp.unit || '-'}</td>
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 text-sm text-white/70 whitespace-nowrap">{emp.hospitalId || '-'}</td>
                                                )}
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <LevelBadge
                                                        code={emp.quranCompetency?.readingLevel || 'R0'}
                                                        colorClass="bg-emerald-500/20 text-emerald-400"
                                                        borderClass="border-emerald-500/30"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <LevelBadge
                                                        code={emp.quranCompetency?.tajwidLevel || 'T0'}
                                                        colorClass="bg-blue-500/20 text-blue-400"
                                                        borderClass="border-blue-500/30"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <LevelBadge
                                                        code={emp.quranCompetency?.memorizationLevel || 'H0'}
                                                        colorClass="bg-purple-500/20 text-purple-400"
                                                        borderClass="border-purple-500/30"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <LevelBadge
                                                        code={emp.quranCompetency?.understandingLevel || 'P0'}
                                                        colorClass="bg-amber-500/20 text-amber-400"
                                                        borderClass="border-amber-500/30"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    {emp.quranCompetency ? (
                                                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-semibold rounded-full border border-green-500/30">
                                                            Sudah Dinilai
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
                                                            Belum Dinilai
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedEmployees.length === 0 && (
                                            <tr>
                                                <td colSpan={isSuperAdmin ? 9 : 8} className="px-6 py-12 text-center text-white/40">
                                                    Tidak ada data yang sesuai dengan filter
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {filteredEmployees.length > 0 && (
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                                    <div className="hidden md:block text-sm text-white/60">
                                        Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredEmployees.length)} dari {filteredEmployees.length} data
                                    </div>
                                    <div className="flex items-center gap-2 w-full justify-center md:w-auto">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg border border-white/10 transition-all"
                                        >
                                            &lt;
                                        </button>
                                        <div className="px-4 py-2 bg-purple-500/20 text-purple-400 text-sm font-bold rounded-lg border border-purple-500/30">
                                            Hal {currentPage} dari {totalPages}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg border border-white/10 transition-all"
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
            </div >
        </div >
    );
};

export default QuranCompetencyReport;
