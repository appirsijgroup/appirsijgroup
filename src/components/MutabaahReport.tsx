import React, { useState, useMemo, useEffect } from 'react';
import { type Employee, type MonthlyActivityProgress, type DailyActivity, type Hospital } from '../types';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import * as XLSX from 'xlsx';
import { ExcelIcon, SearchIcon } from './Icons';
import { isAdministrativeAccount, isAnyAdmin } from '@/lib/rolePermissions';
import SimplePagination from './SimplePagination';

interface MutabaahReportProps {
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
    hospitals: Hospital[];
    onLoadHeavyData?: () => Promise<void>;
    isLoading?: boolean;
}

interface MutabaahReportRecord {
    employeeId: string;
    employeeName: string;
    unit: string;
    profession: string;
    professionCategory: 'MEDIS' | 'NON MEDIS';
    hospitalId?: string;
    hospitalName?: string;
    mentorId?: string;
    mentorName?: string;
    supervisorId?: string;
    supervisorName?: string;
    kaUnitId?: string;
    kaUnitName?: string;
    monthKey: string;
    sidiqCount: number;
    sidiqTarget: number;
    sidiqPercentage: number;
    tablighCount: number;
    tablighTarget: number;
    tablighPercentage: number;
    amanahCount: number;
    amanahTarget: number;
    amanahPercentage: number;
    fatonahCount: number;
    fatonahTarget: number;
    fatonahPercentage: number;
    totalCount: number;
    totalTarget: number;
    totalPercentage: number;
}

const SelectFilter: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: (string | number)[];
    defaultLabel: string;
}> = ({ value, onChange, options, defaultLabel }) => (
    <select
        value={value}
        onChange={onChange}
        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
        style={{ position: 'relative', zIndex: 50 }}
    >
        <option value="all" className="text-black bg-white">
            {defaultLabel}
        </option>
        {options.map((opt) => (
            <option key={opt} value={String(opt)} className="text-black bg-white">
                {opt}
            </option>
        ))}
    </select>
);

const MutabaahReport: React.FC<MutabaahReportProps> = ({ allUsersData, hospitals, onLoadHeavyData, isLoading }) => {
    const [yearFilter, setYearFilter] = useState<string>('');
    const [hospitalFilter, setHospitalFilter] = useState<string>('all');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [professionFilter, setProfessionFilter] = useState<string>('all');
    const [nameOrNipFilter, setNameOrNipFilter] = useState<string>('');

    // Get all available filters - use stable dependency
    const filtersData = useMemo(() => {
        const units = new Set<string>();
        const professions = new Set<string>();
        const years = new Set<number>();

        Object.values(allUsersData).forEach(({ employee }) => {
            if (!employee || !employee.id || isAdministrativeAccount(employee.id) || isAnyAdmin(employee)) return;
            if (employee.unit) units.add(employee.unit);
            if (employee.profession) professions.add(employee.profession);

            // Get years from all possible sources (snake_case and camelCase)
            const activityKeys = [
                ...Object.keys(employee.monthlyActivities || {}),
                ...Object.keys(employee.monthly_activities || {}),
                ...(employee.activatedMonths || []),
                ...(employee.activated_months || [])
            ];

            activityKeys.forEach((key) => {
                if (typeof key === 'string' && key.includes('-')) {
                    const year = parseInt(key.split('-')[0]);
                    if (!isNaN(year) && year > 2000) years.add(year);
                }
            });
        });

        // Ensure current year is always available as fallback if no data found
        if (years.size === 0) {
            const currentYear = new Date().getFullYear();
            years.add(currentYear);
            years.add(currentYear - 1);
        }

        const sortedYears = Array.from(years).sort((a, b) => b - a);

        return {
            allUnits: Array.from(units).sort(),
            allProfessions: Array.from(professions).sort(),
            allYearsWithData: sortedYears,
        };
    }, [allUsersData]);

    const { allUnits, allProfessions, allYearsWithData } = filtersData;

    useEffect(() => {
        if (allYearsWithData.length > 0 && !yearFilter) {
            setYearFilter(String(allYearsWithData[0]));
        }
    }, [allYearsWithData, yearFilter]);

    const [serverData, setServerData] = useState<{ records: MutabaahReportRecord[], total: number, totalPages: number }>({ records: [], total: 0, totalPages: 0 });
    const [isFetching, setIsFetching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // 🚀 Fetch accurate data from API
    useEffect(() => {
        const fetchReportData = async () => {
            if (!yearFilter) return;
            setIsFetching(true);
            try {
                const params = new URLSearchParams({
                    year: yearFilter,
                    hospitalId: hospitalFilter,
                    unit: unitFilter,
                    profession: professionFilter,
                    search: nameOrNipFilter,
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString()
                });

                const response = await fetch(`/api/admin/reports/mutabaah?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setServerData(data);
                }
            } catch (error) {
                console.error('Failed to fetch mutabaah report:', error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchReportData();
    }, [yearFilter, hospitalFilter, unitFilter, professionFilter, nameOrNipFilter, currentPage]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [yearFilter, hospitalFilter, unitFilter, professionFilter, nameOrNipFilter]);

    const filteredData = serverData.records;
    const { total: totalRecords, totalPages } = serverData;
    const paginatedData = filteredData; // Server already paginated it

    // Excel export (high limit to get all filtered data)
    const handleDownloadXlsx = async () => {
        setIsFetching(true);
        try {
            const params = new URLSearchParams({
                year: yearFilter,
                hospitalId: hospitalFilter,
                unit: unitFilter,
                profession: professionFilter,
                search: nameOrNipFilter,
                page: '1',
                limit: '5000' // High limit for export
            });

            const response = await fetch(`/api/admin/reports/mutabaah?${params.toString()}`);
            if (!response.ok) throw new Error('Export failed');

            const { records: allExportData } = await response.json();

            // Multi-row header untuk Excel
            const headerRow1 = [
                'No', 'Tahun', 'RS ID', 'NIP', 'Nama', 'Unit', 'Profesi', 'Mentor',
                'SIDIQ', '', '', 'TABLIGH', '', '', 'AMANAH', '', '', 'FATONAH', '', '', 'TOTAL', '', ''
            ];
            const headerRow2 = [
                '', '', '', '', '', '', '', '',
                'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%'
            ];

            const data = allExportData.map((record: any, index: number) => [
                index + 1,
                record.monthKey,
                record.hospitalId || '-',
                record.employeeId,
                record.employeeName,
                record.unit,
                record.profession,
                record.mentorName || '-',
                // SIDIQ
                record.sidiqCount, record.sidiqTarget, `${record.sidiqPercentage}%`,
                // TABLIGH
                record.tablighCount, record.tablighTarget, `${record.tablighPercentage}%`,
                // AMANAH
                record.amanahCount, record.amanahTarget, `${record.amanahPercentage}%`,
                // FATONAH
                record.fatonahCount, record.fatonahTarget, `${record.fatonahPercentage}%`,
                // TOTAL
                record.totalCount, record.totalTarget, `${record.totalPercentage}%`,
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...data]);
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 8 }, e: { r: 0, c: 10 } }); // SIDIQ
            ws['!merges'].push({ s: { r: 0, c: 11 }, e: { r: 0, c: 13 } }); // TABLIGH
            ws['!merges'].push({ s: { r: 0, c: 14 }, e: { r: 0, c: 16 } }); // AMANAH
            ws['!merges'].push({ s: { r: 0, c: 17 }, e: { r: 0, c: 19 } }); // FATONAH
            ws['!merges'].push({ s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }); // TOTAL

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Mutabaah');
            XLSX.writeFile(wb, `Laporan_Mutabaah_Tahun_${yearFilter}.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="mt-8">
            {/* Filters */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 md:p-6 mb-8 shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    {/* Period & RS Group */}
                    <div className="lg:col-span-12 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-teal-400 block mb-1.5 ml-1">Pilih Tahun</label>
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500/50 focus:outline-none transition-all hover:bg-black/60"
                            >
                                {allYearsWithData.map((year) => (
                                    <option key={year} value={year} className="text-black bg-white">{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-blue-400 block mb-1.5 ml-1">Rumah Sakit</label>
                            <select
                                value={hospitalFilter}
                                onChange={(e) => setHospitalFilter(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all hover:bg-black/60"
                            >
                                <option value="all" className="text-black bg-white">Semua RS</option>
                                {hospitals.map((hospital) => (
                                    <option key={hospital.id} value={hospital.id} className="text-black bg-white">
                                        {hospital.brand}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Organization Group */}
                    <div className="lg:col-span-12 xl:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-blue-400 block mb-1.5 ml-1">Unit Kerja</label>
                            <SelectFilter
                                value={unitFilter}
                                onChange={(e) => setUnitFilter(e.target.value)}
                                options={allUnits}
                                defaultLabel="Semua Unit"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-purple-400 block mb-1.5 ml-1">Profesi</label>
                            <SelectFilter
                                value={professionFilter}
                                onChange={(e) => setProfessionFilter(e.target.value)}
                                options={allProfessions}
                                defaultLabel="Semua Profesi"
                            />
                        </div>
                    </div>

                    {/* Search & Actions */}
                    <div className="lg:col-span-12 xl:col-span-3 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1.5 ml-1">Pencarian</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={nameOrNipFilter}
                                    onChange={(e) => setNameOrNipFilter(e.target.value)}
                                    placeholder="Nama/NIP..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm pl-10 text-white focus:ring-2 focus:ring-teal-500/50 focus:outline-none transition-all hover:bg-black/60"
                                />
                                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors" />
                            </div>
                        </div>
                        <div className="md:col-span-4 flex items-end justify-end">
                            <button onClick={handleDownloadXlsx} disabled={filteredData.length === 0} className="p-2.5 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group border border-green-500/20 shadow-sm" title="Unduh Excel">
                                <ExcelIcon className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            {/* Mobile scroll indicator */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 animate-pulse">
                <span>← Geser untuk melihat kolom →</span>
            </div>

            <div className="relative overflow-x-auto overflow-y-hidden rounded-lg border border-white/20 -mx-2 sm:mx-0 touch-pan-x min-h-[400px]">
                {/* 🚀 Loading Overlay */}
                {isFetching && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                    </div>
                )}

                <table className="min-w-[1500px] w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        {/* Main Header Row - Level 1 */}
                        <tr>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[50px]">No</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[100px]">Tahun</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[100px]">RS ID</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[120px]">NIP</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[180px]">Nama</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[150px]">Unit</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[150px]">Profesi</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20 min-w-[150px]">Mentor</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-teal-900/30">SIDIQ</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-blue-900/30">TABLIGH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-purple-900/30">AMANAH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-orange-900/30">FATONAH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-pink-900/30">TOTAL</th>
                        </tr>
                        {/* Sub Header Row - Level 2 */}
                        <tr>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[60px]">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[60px]">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[60px]">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[60px]">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[80px]">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20 min-w-[60px]">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((record, index) => (
                            <tr
                                key={`${record.employeeId}-${record.monthKey}`}
                                className="border-b border-gray-700 hover:bg-white/5"
                            >
                                {/* Info Karyawan */}
                                <td className="px-4 py-3 whitespace-nowrap">{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.monthKey}</td>
                                <td className="px-4 py-3 whitespace-nowrap truncate" title={record.hospitalId || '-'}>{record.hospitalId || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.employeeId}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{record.employeeName}</td>
                                <td className="px-4 py-3 whitespace-nowrap truncate" title={record.unit}>{record.unit}</td>
                                <td className="px-4 py-3 whitespace-nowrap truncate" title={record.profession}>{record.profession}</td>
                                <td className="px-4 py-3 whitespace-nowrap truncate" title={record.mentorName || '-'}>{record.mentorName || '-'}</td>

                                {/* SIDIQ - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-semibold">{record.sidiqCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{record.sidiqTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${record.sidiqPercentage >= 100
                                            ? 'bg-green-500/20 text-green-300'
                                            : record.sidiqPercentage >= 50
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {record.sidiqPercentage}%
                                    </span>
                                </td>

                                {/* TABLIGH - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-semibold">{record.tablighCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{record.tablighTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${record.tablighPercentage >= 100
                                            ? 'bg-green-500/20 text-green-300'
                                            : record.tablighPercentage >= 50
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {record.tablighPercentage}%
                                    </span>
                                </td>

                                {/* AMANAH - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-semibold">{record.amanahCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{record.amanahTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${record.amanahPercentage >= 100
                                            ? 'bg-green-500/20 text-green-300'
                                            : record.amanahPercentage >= 50
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {record.amanahPercentage}%
                                    </span>
                                </td>

                                {/* FATONAH - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-semibold">{record.fatonahCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{record.fatonahTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${record.fatonahPercentage >= 100
                                            ? 'bg-green-500/20 text-green-300'
                                            : record.fatonahPercentage >= 50
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {record.fatonahPercentage}%
                                    </span>
                                </td>

                                {/* TOTAL - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-bold bg-white/5">{record.totalCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap bg-white/5">{record.totalTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap bg-white/5">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${record.totalPercentage >= 100
                                            ? 'bg-green-500/20 text-green-300'
                                            : record.totalPercentage >= 50
                                                ? 'bg-yellow-500/20 text-yellow-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {record.totalPercentage}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!isFetching && paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={22} className="text-center p-20">
                                    <p className="text-blue-200 opacity-60">Tidak ada data yang cocok dengan filter yang dipilih.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <SimplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={serverData.total}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                isLoading={isFetching}
            />

            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Total {serverData.total} data capaian mutaba&apos;ah tahunan
                </p>
            </div>
        </div>
    );
};

export default MutabaahReport;
