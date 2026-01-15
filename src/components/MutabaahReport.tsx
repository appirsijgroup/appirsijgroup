import React, { useState, useMemo, useEffect } from 'react';
import { type Employee, type MonthlyActivityProgress, type DailyActivity, type Hospital } from '../types';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import * as XLSX from 'xlsx';
import { PdfIcon, ExcelIcon, SearchIcon } from './Icons';

interface MutabaahReportProps {
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
    hospitals: Hospital[];
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

const MutabaahReport: React.FC<MutabaahReportProps> = ({ allUsersData, hospitals }) => {
    const [yearFilter, setYearFilter] = useState<string>('');
    const [hospitalFilter, setHospitalFilter] = useState<string>('all');
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

    // Aggregate mutaba'ah data per YEAR (akumulasi semua bulan dalam tahun)
    const mutabaahData: MutabaahReportRecord[] = useMemo(() => {
        const records: MutabaahReportRecord[] = [];
        const userMap = new Map(Object.values(allUsersData).map((d) => [d.employee.id, d.employee]));

        // Get activity categories
        const sidiqActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'SIDIQ (Integritas)');
        const tablighActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'TABLIGH (Teamwork)');
        const amanahActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'AMANAH (Disiplin)');
        const fatonahActivities = DAILY_ACTIVITIES.filter((a) => a.category === 'FATONAH (Belajar)');

        // Calculate MONTHLY target dari DAILY_ACTIVITIES
        const monthlySidiqTarget = sidiqActivities.reduce((sum, a) => sum + a.monthlyTarget, 0); // = 6
        const monthlyTablighTarget = tablighActivities.reduce((sum, a) => sum + a.monthlyTarget, 0); // = 41
        const monthlyAmanahTarget = amanahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0); // = 41
        const monthlyFatonahTarget = fatonahActivities.reduce((sum, a) => sum + a.monthlyTarget, 0); // = 25

        // Accumulator untuk mengumpulkan data per employee per year
        type YearlyAccumulator = {
            hospitalId?: string;
            hospitalName?: string;
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
            year: string;
            sidiqCount: number;
            tablighCount: number;
            amanahCount: number;
            fatonahCount: number;
            monthsCount: number;
        };

        // Accumulator untuk mengumpulkan data per employee per year
        const yearlyAccumulator = new Map<string, YearlyAccumulator>();

        // DEBUG: Log untuk cek hospitalId
        console.log('🔍 DEBUG - Filter RS:', hospitalFilter);
        console.log('🔍 DEBUG - Total Hospitals:', hospitals.length);
        console.table(hospitals.map(h => ({ id: h.id, brand: h.brand, name: h.name })));
        console.log('🔍 DEBUG - Hospitals JSON:', JSON.stringify(hospitals.map(h => ({ id: h.id, brand: h.brand }))));

        // Loop 1: Initialize SEMUA employees (tanpa filter RS di sini)
        Object.values(allUsersData).forEach(({ employee }) => {
            const key = `${employee.id}-${yearFilter}`;

            if (!yearlyAccumulator.has(key)) {
                const mentor = employee.mentorId ? userMap.get(employee.mentorId) : undefined;
                // Match hospital by both id and brand (employee.hospitalId might be brand code like "RSIJSP")
                const hospital = employee.hospitalId
                    ? hospitals.find(h => h.id === employee.hospitalId || h.brand === employee.hospitalId)
                    : undefined;
                const supervisor = employee.supervisorId ? userMap.get(employee.supervisorId) : undefined;
                const kaUnit = employee.kaUnitId ? userMap.get(employee.kaUnitId) : undefined;

                // DEBUG: Log untuk setiap 10 employee
                if (yearlyAccumulator.size % 100 === 0) {
                    console.log(`Employee: ${employee.name}, hospitalId:`, employee.hospitalId, `Found hospital:`, hospital ? `${hospital.brand} (id: ${hospital.id})` : 'none');
                }

                yearlyAccumulator.set(key, {
                    hospitalId: employee.hospitalId,
                    hospitalName: hospital?.name,
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
                    year: yearFilter,
                    sidiqCount: 0,
                    tablighCount: 0,
                    amanahCount: 0,
                    fatonahCount: 0,
                    monthsCount: 0,
                });
            }
        });

        // Loop 2: Accumulate capaian dari monthlyActivities (untuk employees yang punya data)
        Object.values(allUsersData).forEach(({ employee }) => {
            // Skip jika tidak ada monthlyActivities (belum aktivasi/isi)
            if (!employee.monthlyActivities) return;

            Object.entries(employee.monthlyActivities).forEach(([monthKey, monthProgress]) => {
                const year = monthKey.split('-')[0];

                // Skip jika bukan tahun yang dipilih
                if (yearFilter && year !== yearFilter) return;

                const key = `${employee.id}-${year}`;
                const accumulator = yearlyAccumulator.get(key);
                
                if (!accumulator) return; // Skip jika record tidak ditemukan

                const allDaysProgress = Object.values(monthProgress);

                const countProgress = (activityIds: string[]) => {
                    return allDaysProgress.reduce((total, dayProgress) => {
                        return total + activityIds.filter((id) => dayProgress[id]).length;
                    }, 0);
                };

                // Accumulate capaian dari bulan ini
                accumulator.sidiqCount += countProgress(sidiqActivities.map((a) => a.id));
                accumulator.tablighCount += countProgress(tablighActivities.map((a) => a.id));
                accumulator.amanahCount += countProgress(amanahActivities.map((a) => a.id));
                accumulator.fatonahCount += countProgress(fatonahActivities.map((a) => a.id));
                accumulator.monthsCount += 1;
            });
        });

        // Loop 2: Convert accumulator ke final records dengan target tahunan
        yearlyAccumulator.forEach((data) => {
            // Target TAHUNAN = target bulanan × jumlah bulan dengan data
            const sidiqTarget = monthlySidiqTarget * data.monthsCount;
            const tablighTarget = monthlyTablighTarget * data.monthsCount;
            const amanahTarget = monthlyAmanahTarget * data.monthsCount;
            const fatonahTarget = monthlyFatonahTarget * data.monthsCount;
            const totalTarget = sidiqTarget + tablighTarget + amanahTarget + fatonahTarget;

            const totalCount = data.sidiqCount + data.tablighCount + data.amanahCount + data.fatonahCount;

            records.push({
                hospitalId: data.hospitalId,
                hospitalName: data.hospitalName,
                employeeId: data.employeeId,
                employeeName: data.employeeName,
                unit: data.unit,
                profession: data.profession,
                professionCategory: data.professionCategory,
                mentorId: data.mentorId,
                mentorName: data.mentorName,
                supervisorId: data.supervisorId,
                supervisorName: data.supervisorName,
                kaUnitId: data.kaUnitId,
                kaUnitName: data.kaUnitName,
                monthKey: data.year, // Gunakan tahun sebagai identifier
                sidiqCount: data.sidiqCount,
                sidiqTarget,
                sidiqPercentage: Math.min(100, Math.round((data.sidiqCount / sidiqTarget) * 100) || 0),
                tablighCount: data.tablighCount,
                tablighTarget,
                tablighPercentage: Math.min(100, Math.round((data.tablighCount / tablighTarget) * 100) || 0),
                amanahCount: data.amanahCount,
                amanahTarget,
                amanahPercentage: Math.min(100, Math.round((data.amanahCount / amanahTarget) * 100) || 0),
                fatonahCount: data.fatonahCount,
                fatonahTarget,
                fatonahPercentage: Math.min(100, Math.round((data.fatonahCount / fatonahTarget) * 100) || 0),
                totalCount,
                totalTarget,
                totalPercentage: Math.min(100, Math.round((totalCount / totalTarget) * 100) || 0),
            });
        });

        return records.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }, [allUsersData, yearFilter]);

    // Apply filters
    const filteredData = useMemo(() => {
        return mutabaahData.filter((record) => {
            // Filter RS: Show all if 'all', otherwise filter by hospitalId
            // Employees without hospitalId only shown when hospitalFilter is 'all'
            if (hospitalFilter !== 'all') {
                // User selected specific RS
                if (!record.hospitalId) return false; // Employee without RS - skip

                // hospitalFilter is the id from the selected hospital in dropdown
                // record.hospitalId might be brand code (like "RSIJSP") or UUID
                // So we need to check if the selected hospital matches by id or brand
                const selectedHospital = hospitals.find(h => h.id === hospitalFilter);
                if (!selectedHospital) return false; // Invalid hospital selection

                // Check if employee's hospitalId matches either the hospital's id or brand
                if (record.hospitalId !== selectedHospital.id && record.hospitalId !== selectedHospital.brand) {
                    return false; // Employee from different RS - skip
                }
            }

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
    }, [mutabaahData, hospitalFilter, unitFilter, professionFilter, nameOrNipFilter, hospitals]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [yearFilter, hospitalFilter, unitFilter, professionFilter, nameOrNipFilter]);

    // Excel export
    const handleDownloadXlsx = () => {
        // Multi-row header untuk Excel (mirip dengan tabel HTML)
        const headerRow1 = [
            'No', 'Tahun', 'RS ID', 'NIP', 'Nama', 'Unit', 'Profesi', 'Mentor',
            'SIDIQ', '', '', 'TABLIGH', '', '', 'AMANAH', '', '', 'FATONAH', '', '', 'TOTAL', '', ''
        ];
        const headerRow2 = [
            '', '', '', '', '', '', '', '',
            'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%', 'Capaian', 'Target', '%'
        ];

        const data = filteredData.map((record, index) => [
            index + 1,
            record.monthKey,
            record.hospitalId || '-',
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

        // Merge cells untuk header categories
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 8 }, e: { r: 0, c: 10 } }); // SIDIQ
        ws['!merges'].push({ s: { r: 0, c: 11 }, e: { r: 0, c: 13 } }); // TABLIGH
        ws['!merges'].push({ s: { r: 0, c: 14 }, e: { r: 0, c: 16 } }); // AMANAH
        ws['!merges'].push({ s: { r: 0, c: 17 }, e: { r: 0, c: 19 } }); // FATONAH
        ws['!merges'].push({ s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }); // TOTAL

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Mutabaah');

        const fileName = `Laporan_Mutabaah_Tahun_${yearFilter}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 bg-black/20 rounded-lg">
                <div className="lg:col-span-1">
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
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                        Rumah Sakit
                    </label>
                    <select
                        value={hospitalFilter}
                        onChange={(e) => setHospitalFilter(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    >
                        <option value="all" className="text-black bg-white">Semua RS</option>
                        {hospitals.map((hospital) => (
                            <option key={hospital.id} value={hospital.id} className="text-black bg-white">
                                {hospital.brand}
                            </option>
                        ))}
                    </select>
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
            {/* Mobile scroll indicator */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 animate-pulse">
                <span>← Geser untuk melihat kolom →</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20 -mx-2 sm:mx-0">
                <table className="min-w-[1500px] w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200 sticky top-0">
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
                                <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
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
