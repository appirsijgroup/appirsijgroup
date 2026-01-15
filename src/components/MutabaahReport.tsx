import React, { useState, useMemo, useEffect } from 'react';
import { type Employee, type MonthlyActivityProgress, type DailyActivity } from '../types';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import * as XLSX from 'xlsx';
import { PdfIcon, ExcelIcon, SearchIcon } from './Icons';

interface MutabaahReportProps {
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
}

interface MutabaahReportRecord {
    employeeId: string;
    employeeName: string;
    unit: string;
    profession: string;
    professionCategory: 'MEDIS' | 'NON MEDIS';
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

const MutabaahReport: React.FC<MutabaahReportProps> = ({ allUsersData }) => {
    const [dateFilterType, setDateFilterType] = useState<'monthly' | 'yearly' | 'all'>('monthly');
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
    const [yearFilter, setYearFilter] = useState<string>('');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [professionFilter, setProfessionFilter] = useState<string>('all');
    const [nameOrNipFilter, setNameOrNipFilter] = useState<string>('');

    // Get all available filters
    const { allUnits, allProfessions, allYearsWithData } = useMemo(() => {
        const units = new Set<string>();
        const professions = new Set<string>();
        const years = new Set<number>();

        Object.values(allUsersData).forEach(({ employee }) => {
            units.add(employee.unit);
            professions.add(employee.profession);

            // Get years from monthly activities
            if (employee.monthlyActivities) {
                Object.keys(employee.monthlyActivities).forEach((monthKey) => {
                    const year = parseInt(monthKey.split('-')[0]);
                    years.add(year);
                });
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a);

        return {
            allUnits: Array.from(units).sort(),
            allProfessions: Array.from(professions).sort(),
            allYearsWithData: sortedYears,
        };
    }, [allUsersData]);

    useEffect(() => {
        if (allYearsWithData.length > 0 && !yearFilter) {
            setYearFilter(String(allYearsWithData[0]));
        }
    }, [allYearsWithData, yearFilter]);

    // Aggregate mutaba'ah data
    const mutabaahData: MutabaahReportRecord[] = useMemo(() => {
        const records: MutabaahReportRecord[] = [];
        const userMap = new Map(Object.values(allUsersData).map((d) => [d.employee.id, d.employee]));

        // Get activity categories
        const sidiqActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'SIDIQ (Integritas)');
        const tablighActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'TABLIGH (Teamwork)');
        const amanahActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'AMANAH (Disiplin)');
        const fatonahActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'FATONAH (Belajar)');

        const getTargetTotal = (activities: DailyActivity[]) =>
            activities.reduce((sum, a) => sum + a.monthlyTarget, 0);

        const sidiqTarget = getTargetTotal(sidiqActivities);
        const tablighTarget = getTargetTotal(tablighActivities);
        const amanahTarget = getTargetTotal(amanahActivities);
        const fatonahTarget = getTargetTotal(fatonahActivities);

        Object.values(allUsersData).forEach(({ employee }) => {
            if (!employee.monthlyActivities) return;

            Object.entries(employee.monthlyActivities).forEach(([monthKey, monthProgress]) => {
                // Date filter
                if (dateFilterType !== 'all') {
                    if (dateFilterType === 'monthly' && monthKey !== monthFilter) return;
                    if (dateFilterType === 'yearly') {
                        const year = monthKey.split('-')[0];
                        if (year !== yearFilter) return;
                    }
                }

                // Calculate progress for each category
                const allDaysProgress = Object.values(monthProgress);

                const countProgress = (activityIds: string[]) => {
                    return allDaysProgress.reduce((total, dayProgress) => {
                        return (
                            total +
                            activityIds.filter((id) => dayProgress[id]).length
                        );
                    }, 0);
                };

                const sidiqCount = countProgress(sidiqActivities.map((a) => a.id));
                const tablighCount = countProgress(tablighActivities.map((a) => a.id));
                const amanahCount = countProgress(amanahActivities.map((a) => a.id));
                const fatonahCount = countProgress(fatonahActivities.map((a) => a.id));

                const totalCount = sidiqCount + tablighCount + amanahCount + fatonahCount;
                const totalTarget = sidiqTarget + tablighTarget + amanahTarget + fatonahTarget;

                // Get hierarchy info
                const mentor = employee.mentorId ? userMap.get(employee.mentorId) : undefined;
                const supervisor = employee.supervisorId ? userMap.get(employee.supervisorId) : undefined;
                const kaUnit = employee.kaUnitId ? userMap.get(employee.kaUnitId) : undefined;

                records.push({
                    employeeId: employee.id,
                    employeeName: employee.name,
                    unit: employee.unit,
                    profession: employee.profession,
                    professionCategory: employee.professionCategory,
                    mentorId: employee.mentorId,
                    mentorName: mentor?.name,
                    supervisorId: employee.supervisorId,
                    supervisorName: supervisor?.name,
                    kaUnitId: employee.kaUnitId,
                    kaUnitName: kaUnit?.name,
                    monthKey,
                    sidiqCount,
                    sidiqTarget,
                    sidiqPercentage: Math.round((sidiqCount / sidiqTarget) * 100) || 0,
                    tablighCount,
                    tablighTarget,
                    tablighPercentage: Math.round((tablighCount / tablighTarget) * 100) || 0,
                    amanahCount,
                    amanahTarget,
                    amanahPercentage: Math.round((amanahCount / amanahTarget) * 100) || 0,
                    fatonahCount,
                    fatonahTarget,
                    fatonahPercentage: Math.round((fatonahCount / fatonahTarget) * 100) || 0,
                    totalCount,
                    totalTarget,
                    totalPercentage: Math.round((totalCount / totalTarget) * 100) || 0,
                });
            });
        });

        return records.sort(
            (a, b) => b.monthKey.localeCompare(a.monthKey) || a.employeeName.localeCompare(b.employeeName)
        );
    }, [allUsersData, dateFilterType, monthFilter, yearFilter]);

    // Apply filters
    const filteredData = useMemo(() => {
        return mutabaahData.filter((record) => {
            if (unitFilter !== 'all' && record.unit !== unitFilter) return false;
            if (professionFilter !== 'all' && record.profession !== professionFilter) return false;
            if (nameOrNipFilter) {
                const searchTerm = nameOrNipFilter.toLowerCase();
                const nameMatch = record.employeeName.toLowerCase().includes(searchTerm);
                const idMatch = record.employeeId.toLowerCase().includes(searchTerm);
                if (!nameMatch && !idMatch) return false;
            }
            return true;
        });
    }, [mutabaahData, unitFilter, professionFilter, nameOrNipFilter]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilterType, monthFilter, yearFilter, unitFilter, professionFilter, nameOrNipFilter]);

    // Excel export
    const handleDownloadXlsx = () => {
        // Multi-row header untuk Excel (mirip dengan tabel HTML)
        const headerRow1 = [
            'No', 'Bulan', 'NIP', 'Nama', 'Unit', 'Profesi', 'Mentor',
            'SIDIQ', '', '', 'TABLIGH', '', '', 'AMANAH', '', '', 'FATONAH', '', '', 'TOTAL', '', ''
        ];
        const headerRow2 = [
            '', '', '', '', '', '', '',
            'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%'
        ];

        const data = filteredData.map((record, index) => [
            index + 1,
            record.monthKey,
            record.employeeId,
            record.employeeName,
            record.unit,
            record.profession,
            record.mentorName || '-',
            // SIDIQ
            record.sidiqCount,
            record.sidiqTarget,
            `${record.sidiqPercentage}%`,
            // TABLIGH
            record.tablighCount,
            record.tablighTarget,
            `${record.tablighPercentage}%`,
            // AMANAH
            record.amanahCount,
            record.amanahTarget,
            `${record.amanahPercentage}%`,
            // FATONAH
            record.fatonahCount,
            record.fatonahTarget,
            `${record.fatonahPercentage}%`,
            // TOTAL
            record.totalCount,
            record.totalTarget,
            `${record.totalPercentage}%`,
        ]);

        // Merge cells untuk header utama
        const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...data]);

        // Merge cells untuk SIDIQ (column H-J)
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 7 }, e: { r: 0, c: 9 } }); // SIDIQ
        ws['!merges'].push({ s: { r: 0, c: 10 }, e: { r: 0, c: 12 } }); // TABLIGH
        ws['!merges'].push({ s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }); // AMANAH
        ws['!merges'].push({ s: { r: 0, c: 16 }, e: { r: 0, c: 18 } }); // FATONAH
        ws['!merges'].push({ s: { r: 0, c: 19 }, e: { r: 0, c: 21 } }); // TOTAL

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Mutabaah');

        const fileName = `Laporan_Mutabaah_${dateFilterType === 'monthly' ? monthFilter : dateFilterType === 'yearly' ? yearFilter : 'Semua'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const DateFilterInputs = () => {
        switch (dateFilterType) {
            case 'monthly':
                return (
                    <div>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">
                            Pilih Bulan
                        </label>
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                );
            case 'yearly':
                return (
                    <div>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">
                            Pilih Tahun
                        </label>
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                        >
                            {allYearsWithData.map((year) => (
                                <option key={year} value={year} className="text-black bg-white">
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                );
            case 'all':
            default:
                return (
                    <div className="h-[54px] flex items-center justify-center text-sm text-gray-400 italic bg-black/20 rounded-md border border-white/10">
                        Semua data
                    </div>
                );
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 bg-black/20 rounded-lg">
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                        Jenis Periode
                    </label>
                    <select
                        value={dateFilterType}
                        onChange={(e) =>
                            setDateFilterType(e.target.value as 'monthly' | 'yearly' | 'all')
                        }
                        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    >
                        <option value="monthly" className="text-black bg-white">
                            Bulanan
                        </option>
                        <option value="yearly" className="text-black bg-white">
                            Tahunan
                        </option>
                        <option value="all" className="text-black bg-white">
                            Semua
                        </option>
                    </select>
                </div>
                <div className="lg:col-span-3">
                    <DateFilterInputs />
                </div>
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                        Unit Kerja
                    </label>
                    <SelectFilter
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        options={allUnits}
                        defaultLabel="Semua Unit"
                    />
                </div>
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                        Profesi
                    </label>
                    <SelectFilter
                        value={professionFilter}
                        onChange={(e) => setProfessionFilter(e.target.value)}
                        options={allProfessions}
                        defaultLabel="Semua Profesi"
                    />
                </div>
                <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                        Cari Nama atau NIP
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={nameOrNipFilter}
                            onChange={(e) => setNameOrNipFilter(e.target.value)}
                            placeholder="Ketik nama atau NIP..."
                            className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm pl-9 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        />
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="lg:col-span-4 flex justify-end">
                    <button onClick={() => {}} disabled={filteredData.length === 0} className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-white transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" title="Download PDF (Segera)"><PdfIcon className="w-5 h-5" /></button>
                    <button onClick={handleDownloadXlsx} disabled={filteredData.length === 0} className="flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-white transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" title="Download Excel"><ExcelIcon className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        {/* Main Header Row - Level 1 */}
                        <tr>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">No</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">Bulan</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">NIP</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">Nama</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">Unit</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">Profesi</th>
                            <th rowSpan={2} className="px-4 py-3 whitespace-nowrap border-b-2 border-white/20">Mentor</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-teal-900/30">SIDIQ</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-blue-900/30">TABLIGH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-purple-900/30">AMANAH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-orange-900/30">FATONAH</th>
                            <th colSpan={3} className="px-4 py-3 text-center whitespace-nowrap border-b-2 border-white/20 bg-pink-900/30">TOTAL</th>
                        </tr>
                        {/* Sub Header Row - Level 2 */}
                        <tr>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">%</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Capaian</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">Target</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap border-b-2 border-white/20">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((record, index) => (
                            <tr
                                key={`${record.employeeId}-${record.monthKey}`}
                                className="border-b border-gray-700 hover:bg-white/5"
                            >
                                {/* Info Karyawan */}
                                <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.monthKey}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.employeeId}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                    {record.employeeName}
                                </td>
                                <td className="px-4 py-3">{record.unit}</td>
                                <td className="px-4 py-3">{record.profession}</td>
                                <td className="px-4 py-3">{record.mentorName || '-'}</td>

                                {/* SIDIQ - 3 kolom terpisah */}
                                <td className="px-3 py-3 text-center whitespace-nowrap font-semibold">{record.sidiqCount}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{record.sidiqTarget}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            record.sidiqPercentage >= 100
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
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            record.tablighPercentage >= 100
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
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            record.amanahPercentage >= 100
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
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            record.fatonahPercentage >= 100
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
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            record.totalPercentage >= 100
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
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={22} className="text-center p-8 text-blue-200">
                                    Tidak ada data yang cocok dengan filter yang dipilih.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                                        currentPage === pageNum
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
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                                        currentPage === totalPages
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
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
};

export default MutabaahReport;
