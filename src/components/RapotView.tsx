import React, { useMemo, useState, Fragment } from 'react';
import NextImage from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Employee, type DailyActivity, type Hospital } from '../types';
import { PdfIcon, ChartBarIcon, DocumentTextIcon, ArrowLeftIcon } from './Icons';
import { imageUrlToBase64 } from '@/utils/imageUtils';

interface RapotViewProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    allUsersData: Record<string, { employee: Employee; attendance: Record<string, any>; history: Record<string, any>; }>;
    hospitals?: Hospital[];
}

const getGradeDetails = (score: number) => {
    if (score >= 90) return { grade: 'A', bobot: 4.0 };
    if (score >= 80) return { grade: 'B', bobot: 3.0 };
    if (score >= 70) return { grade: 'C', bobot: 2.0 };
    if (score >= 60) return { grade: 'D', bobot: 1.0 };
    return { grade: 'E', bobot: 0.0 };
};

const getPredicate = (ipk: number) => {
    if (ipk >= 3.51) return 'Dengan Pujian';
    if (ipk >= 3.01) return 'Sangat Memuaskan';
    if (ipk >= 2.51) return 'Memuaskan';
    if (ipk >= 2.00) return 'Cukup';
    return 'Kurang  ';
};

const generateTranscriptPdf = async (
    employee: Employee,
    performanceData: {
        categories: {
            name: string;
            score: number;
            grade: string;
            bobot: number;
            details: {
                title: string;
                target: number;
                achieved: number;
                percentage: number;
            }[];
        }[];
    },
    ipForMonth: number,
    selectedMonthLabel: string,
    signatoryName: string,
    signatoryNip: string,
    signatoryTitle: string,
    mentorName: string,
    hospital: Hospital | null
) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let finalY = 0;

    const groupName = 'RUMAH SAKIT ISLAM JAKARTA GROUP';
    const hospitalName = (hospital?.name && hospital.name.toUpperCase() !== groupName)
        ? hospital.name.toUpperCase()
        : '';
    const hospitalAddress = hospital?.address || 'Alamat Terdaftar di Sistem';

    const headerTopMargin = 15;
    let logoBottomY = headerTopMargin;
    let textBlockBottomY = headerTopMargin;

    const logoSize = 25;
    const logoY = headerTopMargin - 4;
    const logoX = pageMargin;

    // 1. Header with LOGO logic (Standard Kop Surat - Logo on Left)
    if (hospital?.logo) {
        try {
            // 🔥 FIX: Convert URL to Base64 for jsPDF reliability
            const logoBase64 = hospital.logo.startsWith('http')
                ? await imageUrlToBase64(hospital.logo)
                : hospital.logo;

            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
            logoBottomY = logoY + logoSize;
        } catch (e) {
            console.error('Failed to add logo to PDF', e);
        }
    }

    const groupNameY = headerTopMargin + 2;
    const hospitalNameY = groupNameY + 7;
    const hospitalAddressY = hospitalNameY + 6;

    // Header Text is centered relative to the PAGE width
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#115E59'); // Teal-800
    doc.text(groupName, pageWidth / 2, groupNameY, { align: 'center' });

    if (hospitalName) {
        doc.setFontSize(12);
        doc.setTextColor('#0D9488'); // Teal-600
        doc.text(hospitalName, pageWidth / 2, hospitalNameY, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#475569'); // Slate-600
    doc.text(hospitalAddress, pageWidth / 2, hospitalAddressY, { align: 'center' });

    const addressTextHeight = doc.getTextDimensions(hospitalAddress, { fontSize: 9 }).h;
    textBlockBottomY = hospitalAddressY + addressTextHeight;

    const headerBottom = Math.max(logoBottomY, textBlockBottomY);
    const lineY = headerBottom + 5;

    doc.setDrawColor('#0F766E'); // Teal-700
    doc.setLineWidth(1);
    doc.line(pageMargin, lineY, pageWidth - pageMargin, lineY);

    // 2. Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#334155'); // Slate-700
    doc.text('TRANSKRIP NILAI APPI', pageWidth / 2, lineY + 8, { align: 'center' });

    // 3. Employee Info
    autoTable(doc, {
        startY: lineY + 12,
        body: [
            ['Nama', `: ${employee.name}`, 'Unit Kerja', `: ${employee.unit}`],
            ['Nopeg', `: ${employee.id}`, 'Mentor', `: ${mentorName}`],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1, textColor: '#1e293b', valign: 'middle' as const },
        columnStyles: {
            0: { fontStyle: 'bold' as const, textColor: '#64748b' },
            2: { fontStyle: 'bold' as const, textColor: '#64748b' },
        },
    });
    finalY = (doc as any).lastAutoTable.finalY;

    // 4. IPK Summary Table
    const ipkSummaryBody = [
        ['PERIODE', 'INDEKS PRESTASI TAHUNAN (IPA)', 'PREDIKAT'],
        [selectedMonthLabel.toUpperCase(), ipForMonth.toFixed(2), getPredicate(ipForMonth)]
    ];
    autoTable(doc, {
        startY: finalY + 2,
        head: [ipkSummaryBody[0]],
        body: [ipkSummaryBody[1]],
        theme: 'grid',
        headStyles: { valign: 'middle' as const, fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [203, 213, 225] },
        bodyStyles: { valign: 'middle' as const, halign: 'center' as const, textColor: [13, 148, 136], fontStyle: 'bold' as const, fontSize: 16, cellPadding: 3, lineWidth: 0.1, lineColor: [203, 213, 225] },
    });
    finalY = (doc as any).lastAutoTable.finalY;

    // 5. Monthly Details
    if (performanceData && performanceData.categories.length > 0) {
        const tableBody: any[] = [];
        performanceData.categories.forEach((cat: any) => {
            tableBody.push([
                { content: cat.name.toUpperCase(), colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] } },
                { content: cat.score, styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] } },
                { content: cat.grade, styles: { halign: 'center' as const, fontStyle: 'bold' as const, textColor: [13, 148, 136], fillColor: [241, 245, 249] } },
                { content: cat.bobot.toFixed(1), styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [241, 245, 249] } },
            ]);
            cat.details.forEach((detail: {
                title: string;
                target: number;
                achieved: number;
                percentage: number;
            }) => {
                tableBody.push([
                    { content: `- ${detail.title}`, styles: { cellPadding: { left: 6 } } },
                    { content: `${detail.achieved}/${detail.target}`, styles: { halign: 'right' as const } },
                    '', '', ''
                ]);
            });
        });

        autoTable(doc, {
            startY: finalY + 6,
            head: [['Kategori & Indikator Penilaian', 'Detail Capaian', 'Nilai', 'Huruf', 'Bobot']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' as const, fontSize: 8, halign: 'left' as const },
            styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, lineColor: [226, 232, 240] },
            columnStyles: {
                1: { cellWidth: 30 },
                2: { cellWidth: 15, fontStyle: 'bold' as const },
                3: { cellWidth: 15, fontStyle: 'bold' as const },
                4: { cellWidth: 15, fontStyle: 'bold' as const }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    // 6. Signatures
    const signatureY = finalY + 15;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(9);
    doc.setTextColor('#1e293b');
    doc.text(`Jakarta, ${today}`, pageWidth - pageMargin - 15, signatureY, { align: 'center' });

    const tableSignBody = [
        [signatoryTitle + ',', 'Pegawai,'],
        ['', ''],
        ['', ''],
        [signatoryName, employee.name],
        [`NIP. ${signatoryNip}`, `NIP. ${employee.id}`],
    ];

    // Pre-load signature Base64 if it's a URL
    let signatureBase64 = null;
    if (employee.signature) {
        try {
            signatureBase64 = employee.signature.startsWith('http')
                ? await imageUrlToBase64(employee.signature)
                : employee.signature;
        } catch (e) {
            console.error('Failed to load signature for PDF', e);
        }
    }

    autoTable(doc, {
        startY: signatureY + 4,
        body: tableSignBody,
        theme: 'plain',
        styles: { fontSize: 9, halign: 'center' as const, cellPadding: 1 },
        columnStyles: {
            0: { cellWidth: pageWidth / 2 - pageMargin },
            1: { cellWidth: pageWidth / 2 - pageMargin },
        },
        willDrawCell: (data) => {
            if (data.row.index === 3) {
                doc.setFont('helvetica', 'bold');
                doc.setDrawColor('#000');
                const textWidth = doc.getTextWidth(data.cell.text[0]);
                const x = data.cell.x + (data.cell.width - textWidth) / 2;
                doc.line(x, data.cell.y + data.cell.height - 1, x + textWidth, data.cell.y + data.cell.height - 1);
            }
        },
        didDrawCell: (data) => {
            if (data.row.index === 1 && data.column.index === 1 && signatureBase64) {
                try {
                    doc.addImage(signatureBase64, 'PNG', data.cell.x + data.cell.width / 2 - 10, data.cell.y, 20, 15);
                } catch (e) { }
            }
        }
    });

    doc.save(`transkrip_nilai_${employee.name.replace(/\s/g, '_')}_${selectedMonthLabel.replace(/\s/g, '_')}.pdf`);
};

const generateChecklistPdf = async (
    employee: Employee,
    dailyActivitiesConfig: DailyActivity[],
    selectedMonth: Date,
    allUsersData: Record<string, { employee: Employee; attendance: Record<string, any>; history: Record<string, any>; }>,
    hospital: Hospital | null
) => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const monthKey = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthLabel = selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const hospitalName = hospital?.name || 'RUMAH SAKIT ISLAM JAKARTA GROUP';

    // Header
    if (hospital?.logo) {
        try {
            const logoBase64 = hospital.logo.startsWith('http')
                ? await imageUrlToBase64(hospital.logo)
                : hospital.logo;
            doc.addImage(logoBase64, 'PNG', pageMargin, 10, 15, 15);
        } catch (e) { }
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(hospitalName.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('LEMBAR MUTABAAH HARIAN KARYAWAN', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Periode: ${monthLabel.toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });

    // Info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama: ${employee.name}`, pageMargin, 38);
    doc.text(`Bagian/Unit: ${employee.bagian}/${employee.unit}`, pageMargin, 43);
    doc.text(`Nopeg: ${employee.id}`, pageWidth - pageMargin - 40, 38);

    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const headers = [['No', 'Indikator Penilaian', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()), 'Total']];

    const data = dailyActivitiesConfig.map((activity, idx) => {
        const row = [
            (idx + 1).toString(),
            activity.title,
        ];

        let total = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const dayKey = i.toString().padStart(2, '0');
            const progress = employee.monthlyActivities?.[monthKey]?.[dayKey];
            const val = (progress as any)?.[activity.id];
            const isDone = val === true || val === 'hadir';
            row.push(isDone ? 'v' : '');
            if (isDone) total++;
        }
        row.push(total.toString());
        return row;
    });

    autoTable(doc, {
        startY: 48,
        head: headers,
        body: data,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1, halign: 'center' },
        columnStyles: {
            1: { halign: 'left', cellWidth: 50 },
            [daysInMonth + 2]: { fontStyle: 'bold' }
        },
        headStyles: { fillColor: [13, 148, 136] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text('Mengetahui,', pageMargin + 20, finalY);
    doc.text('Mentor,', pageMargin + 20, finalY + 5);
    doc.text('Karyawan,', pageWidth - pageMargin - 40, finalY + 5);

    const mentorName = employee.mentorId ? allUsersData[employee.mentorId]?.employee.name : '.........................';
    doc.text(mentorName, pageMargin + 20, finalY + 25);
    doc.text(employee.name, pageWidth - pageMargin - 40, finalY + 25);

    doc.save(`mutabaah_${employee.name.replace(/\s/g, '_')}_${monthKey}.pdf`);
};

interface CeklisMutabaahViewProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    selectedMonth: Date;
    allUsersData: Record<string, { employee: Employee;[key: string]: Record<string, any>; }>;
    onBack?: () => void;
}

const CeklisMutabaahView: React.FC<CeklisMutabaahViewProps> = ({ employee, dailyActivitiesConfig, selectedMonth, allUsersData, onBack }) => {
    const monthKey = useMemo(() => `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`, [selectedMonth]);

    const daysInMonth = useMemo(() => {
        return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    }, [selectedMonth]);

    const isCurrentMonthView = useMemo(() => {
        const now = new Date();
        return now.getFullYear() === selectedMonth.getFullYear() && now.getMonth() === selectedMonth.getMonth();
    }, [selectedMonth]);

    const today = new Date().getDate();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h2 className="text-xl font-bold text-white">
                    Checklist Mutabaah - {selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
            </div>

            <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="min-w-full text-[10px] sm:text-xs text-left text-white border-collapse">
                        <thead className="sticky top-0 z-20 bg-[#1e293b]">
                            <tr>
                                <th className="p-2 border border-white/20 bg-[#1e293b] sticky left-0 z-30">No</th>
                                <th className="p-2 border border-white/20 bg-[#1e293b] sticky left-[30px] z-30 min-w-[150px]">Indikator Penilaian</th>
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                    <th key={i} className={`p-1 border border-white/20 text-center min-w-[25px] ${isCurrentMonthView && (i + 1) === today ? 'bg-teal-500/30' : ''}`}>
                                        {i + 1}
                                    </th>
                                ))}
                                <th className="p-2 border border-white/20 text-center font-bold bg-[#1e293b] sticky right-0 z-30">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyActivitiesConfig.map((activity, index) => {
                                let rowTotal = 0;
                                return (
                                    <tr key={activity.id} className="hover:bg-white/5 group">
                                        <td className="p-2 border border-white/20 text-center sticky left-0 bg-[#28364d] group-hover:bg-[#32435e]">{index + 1}</td>
                                        <td className="p-2 border border-white/20 sticky left-[30px] bg-[#28364d] group-hover:bg-[#32435e]">{activity.title}</td>
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const dayKey = (i + 1).toString().padStart(2, '0');
                                            const progress = employee.monthlyActivities?.[monthKey]?.[dayKey];
                                            const val = (progress as any)?.[activity.id];
                                            const isDone = val === true || val === 'hadir';
                                            if (isDone) rowTotal++;
                                            return (
                                                <td key={i} className={`p-1 border border-white/20 text-center ${isCurrentMonthView && (i + 1) === today ? 'bg-teal-500/10' : ''}`}>
                                                    {isDone ? <span className="text-teal-400 font-bold">✓</span> : <span className="text-white/10">-</span>}
                                                </td>
                                            );
                                        })}
                                        <td className="p-2 border border-white/20 text-center font-bold sticky right-0 bg-[#28364d] group-hover:bg-[#32435e] text-teal-300">
                                            {rowTotal}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><span className="text-teal-400 font-bold">✓</span> Terisi/Hadir</div>
                    <div className="flex items-center gap-1"><span className="text-white/10">-</span> Belum Terisi/Tidak Hadir</div>
                    {isCurrentMonthView && <div className="flex items-center gap-1"><div className="w-2 h-2 bg-teal-500/30 border border-teal-500/50"></div> Hari Ini</div>}
                </div>
            </div>
        </div>
    );
};

interface TranskripNilaiViewProps {
    employee: Employee;
    allUsersData: Record<string, { employee: Employee;[key: string]: Record<string, any>; }>;
    selectedMonth: Date;
    performanceData: {
        categories: {
            name: string;
            score: number;
            grade: string;
            bobot: number;
            details: {
                title: string;
                target: number;
                achieved: number;
                percentage: number;
            }[];
        }[];
    };
    ipForMonth: number;
    signatoryName: string;
    signatoryNip: string;
    signatoryTitle: string;
    hospital: Hospital | null;
}

const TranskripNilaiView: React.FC<TranskripNilaiViewProps> = ({ employee, allUsersData, selectedMonth, performanceData, ipForMonth, signatoryName, signatoryNip, signatoryTitle, hospital }) => {

    const bossInfo = useMemo(() => {
        const getBossName = (id?: string) => (id && allUsersData[id]) ? allUsersData[id].employee.name : 'Belum Diatur';
        return {
            mentor: getBossName(employee.mentorId),
            kaUnit: getBossName(employee.kaUnitId),
            supervisor: getBossName(employee.supervisorId),
            manager: getBossName(employee.managerId)
        };
    }, [allUsersData, employee.mentorId, employee.kaUnitId, employee.supervisorId, employee.managerId]);

    const selectedMonthLabel = useMemo(() => {
        return `JANUARI - DESEMBER ${selectedMonth.getFullYear()}`;
    }, [selectedMonth]);

    const todayForView = useMemo(() => new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }), []);

    return (
        <div className="bg-gray-900/50 p-2 sm:p-6 rounded-lg">
            <div className="flex justify-end items-center mb-6">
                <button
                    onClick={async () => await generateTranscriptPdf(
                        employee,
                        performanceData,
                        ipForMonth,
                        selectedMonthLabel,
                        signatoryName,
                        signatoryNip,
                        signatoryTitle,
                        bossInfo.mentor,
                        hospital
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-colors shadow"
                >
                    <PdfIcon className="w-5 h-5" />
                    Unduh PDF
                </button>
            </div>
            <div className="bg-slate-50 p-6 sm:p-10 rounded shadow-2xl text-gray-800" id="transcript-content">
                {/* Standard Letterhead (Kop Surat) Layout */}
                <div className="flex items-start gap-4 pb-4 border-b-4 border-teal-600 mb-6">
                    {hospital?.logo && (
                        <div className="shrink-0 pt-2">
                            <NextImage src={hospital.logo} alt="Hospital Logo" width={100} height={100} className="h-24 w-auto" />
                        </div>
                    )}
                    <div className="flex-1 text-center">
                        <h3 className="text-xl sm:text-3xl font-extrabold text-teal-800 leading-tight">RUMAH SAKIT ISLAM JAKARTA GROUP</h3>
                        {hospital?.name && hospital.name.toUpperCase() !== 'RUMAH SAKIT ISLAM JAKARTA GROUP' && (
                            <h4 className="text-lg sm:text-2xl font-bold text-teal-600 mt-1">{hospital.name.toUpperCase()}</h4>
                        )}
                        <p className="text-sm sm:text-base text-gray-500 font-medium mt-1 italic">{hospital?.address || 'Alamat RS belum diatur di Manajemen RS'}</p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm sm:text-base">
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Nama</strong>: {employee.name}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Unit Kerja</strong>: {employee.unit}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Nopeg</strong>: {employee.id}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Mentor</strong>: {bossInfo.mentor}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Ka. Unit</strong>: {bossInfo.kaUnit}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Supervisor</strong>: {bossInfo.supervisor}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Manajer</strong>: {bossInfo.manager}</div>
                </div>

                <div className="mt-8 p-4 bg-slate-100 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border border-slate-200">
                    <div>
                        <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">PERIODE</p>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-600">{selectedMonthLabel.toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">INDEKS PRESTASI TAHUNAN (IPA)</p>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-600">{ipForMonth.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">PREDIKAT</p>
                        <p className="text-xl sm:text-2xl font-bold text-teal-600">{getPredicate(ipForMonth)}</p>
                    </div>
                </div>

                {performanceData && performanceData.categories.length > 0 ? (
                    <div className="mt-8">
                        <h4 className="text-lg sm:text-xl font-bold text-center tracking-widest text-gray-700 mb-4">TRANSKRIP NILAI APPI</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border-collapse border border-slate-300">
                                <thead className="bg-slate-100 text-slate-600 text-left">
                                    <tr>
                                        <th className="border border-slate-300 p-2 w-[50%] whitespace-nowrap">Kategori & Indikator Penilaian</th>
                                        <th className="border border-slate-300 p-2 w-[35%] text-center whitespace-nowrap">Detail Capaian</th>
                                        <th className="border border-slate-300 p-2 text-center whitespace-nowrap">Nilai</th>
                                        <th className="border border-slate-300 p-2 text-center whitespace-nowrap">Huruf</th>
                                        <th className="border border-slate-300 p-2 text-center whitespace-nowrap">Bobot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceData.categories.map((cat: {
                                        name: string;
                                        score: number;
                                        grade: string;
                                        bobot: number;
                                        details: {
                                            title: string;
                                            target: number;
                                            achieved: number;
                                            percentage: number;
                                        }[];
                                    }) => (
                                        <Fragment key={cat.name}>
                                            <tr className="bg-slate-100 font-bold">
                                                <td className="border border-slate-300 p-2 text-slate-700 whitespace-nowrap">{cat.name.toUpperCase()}</td>
                                                <td className="border border-slate-300 p-2 text-center"></td>
                                                <td className="border border-slate-300 p-2 text-center text-slate-700 whitespace-nowrap">{cat.score}</td>
                                                <td className="border border-slate-300 p-2 text-center text-teal-600 font-extrabold text-base whitespace-nowrap">{cat.grade}</td>
                                                <td className="border border-slate-300 p-2 text-center text-slate-700 whitespace-nowrap">{cat.bobot.toFixed(1)}</td>
                                            </tr>
                                            {cat.details.map((detail: {
                                                title: string;
                                                target: number;
                                                achieved: number;
                                                percentage: number;
                                            }) => (
                                                <tr key={detail.title}>
                                                    <td className="border-x border-b border-slate-300 p-2 pl-6 text-sm text-gray-600 whitespace-nowrap">- {detail.title}</td>
                                                    <td className="border-x border-b border-slate-300 p-2 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2"><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full" style={{ width: `${detail.percentage}%` }}></div></div><span className="font-semibold w-16 text-right">{detail.achieved}/{detail.target}</span></div>
                                                    </td>
                                                    <td className="border-x border-b border-slate-300"></td>
                                                    <td className="border-x border-b border-slate-300"></td>
                                                    <td className="border-x border-b border-slate-300"></td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 mt-8 bg-slate-100 rounded-lg">
                        <p className="text-gray-600">Tidak ada data untuk periode yang dipilih.</p>
                        <p className="text-sm text-gray-500">Pastikan lembar mutaba{'\''}ah untuk bulan ini sudah diaktifkan dan diisi.</p>
                    </div>
                )}

                <div className="mt-12 text-gray-800 text-sm">
                    <div className="flex justify-end mb-4">
                        <div className="w-1/3 text-center">
                            <p>Jakarta, {todayForView}</p>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div className="w-1/3 text-center">
                            <p>{signatoryTitle},</p>
                            <div className="h-20"></div>
                            <p className="font-bold underline">{signatoryName}</p>
                            <p>NIP. {signatoryNip}</p>
                        </div>
                        <div className="w-1/3 text-center">
                            <p>Pegawai,</p>
                            <div className="h-20 flex items-center justify-center">
                                {employee.signature && (
                                    <NextImage src={employee.signature} alt="Tanda Tangan" width={64} height={64} className="h-16" />
                                )}
                            </div>
                            <p className="font-bold underline">{employee.name}</p>
                            <p>NIP. {employee.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{
    label: string;
    icon: React.FC<{ className: string }>;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
    </button>
);

const RapotView: React.FC<RapotViewProps> = ({ employee, dailyActivitiesConfig, allUsersData, hospitals }) => {
    const [activeTab, setActiveTab] = useState<'mutabaah' | 'transkrip'>('mutabaah');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [viewingChecklistFor, setViewingChecklistFor] = useState<Date | null>(null);

    const hospital = useMemo(() => {
        // Gabungkan pemeriksaan hospitalId (frontend) dan hospital_id (backend/Supabase)
        const targetId = employee.hospitalId || (employee as any).hospital_id;

        if (!hospitals || hospitals.length === 0 || !targetId) return null;

        // Cari berdasarkan ID atau Brand (Contoh: RSIJSP) secara case-insensitive
        return hospitals.find(h =>
            String(h.id).toUpperCase() === String(targetId).toUpperCase() ||
            String(h.brand).toUpperCase() === String(targetId).toUpperCase()
        ) || null;
    }, [hospitals, employee.hospitalId, (employee as any).hospital_id]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setSelectedMonth(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    const isNextMonthFuture = () => {
        const nextMonth = new Date(selectedMonth);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
    };

    const monthKey = useMemo(() => `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`, [selectedMonth]);

    // 🔥 FIX: Enrich progress data for Transcript
    const enrichedProgress = useMemo(() => {
        const baseProgress = employee.monthlyActivities?.[monthKey] || {};
        const enriched = { ...baseProgress };

        // 1. Sync Manual Reports
        const monthlyReports = (employee as any)._monthlyReportsDataCache?.[monthKey] || {};
        Object.entries(monthlyReports).forEach(([dayKey, dayData]: [string, any]) => {
            if (!enriched[dayKey]) {
                enriched[dayKey] = {};
            }
            Object.assign(enriched[dayKey], dayData);
        });

        // 2. Sync Reading History (Books)
        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            employee.readingHistory.forEach(history => {
                const date = history.dateCompleted;
                if (date.startsWith(monthKey)) {
                    const dayKey = date.substring(8, 10);
                    if (!enriched[dayKey]) {
                        enriched[dayKey] = {};
                    }
                    enriched[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        // 3. Sync Quran History
        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            employee.quranReadingHistory.forEach((history: any) => {
                const date = history.date;
                if (date.startsWith(monthKey)) {
                    const dayKey = date.substring(8, 10);
                    if (!enriched[dayKey]) {
                        enriched[dayKey] = {};
                    }
                    enriched[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        return enriched;
    }, [employee, monthKey]);

    // 🔥 NEW: Yearly Performance Data Calculation (Jan - Dec accumulation)
    const yearlyPerformanceData = useMemo(() => {
        const year = selectedMonth.getFullYear();
        const yearPrefix = `${year}-`;

        // 🔥 Akumulasi dari Januari sampai Bulan Ini (Bukan hanya yang diaktivasi)
        const now = new Date();
        const isCurrentYear = year === now.getFullYear();
        const maxMonthIdx = isCurrentYear ? (now.getMonth() + 1) : 12; // Jan=1

        // Generate list semu Januari - Bulan Aktif untuk memastikan target terkalkulasi secara tahunan (PRO-RATA)
        const monthsToCalculate = Array.from({ length: maxMonthIdx }, (_, i) =>
            `${year}-${(i + 1).toString().padStart(2, '0')}`
        );

        if (monthsToCalculate.length === 0) return { categories: [], ipResult: 0 };

        const categoriesRaw: Record<string, {
            name: string;
            details: Record<string, { title: string; yearlyTarget: number; yearlyAchieved: number }>;
        }> = {};

        // Loop setiap bulan untuk menjumlahkan target dan capaian
        monthsToCalculate.forEach((mKey: string) => {
            const mProgress = employee.monthlyActivities?.[mKey] || {};
            // Sync with cached reports if available
            const monthlyReports = (employee as any)._monthlyReportsDataCache?.[mKey] || {};

            dailyActivitiesConfig.forEach(act => {
                if (!categoriesRaw[act.category]) {
                    categoriesRaw[act.category] = { name: act.category, details: {} };
                }
                if (!categoriesRaw[act.category].details[act.id]) {
                    categoriesRaw[act.category].details[act.id] = { title: act.title, yearlyTarget: 0, yearlyAchieved: 0 };
                }

                // Tambahkan target bulanan ke akumulasi tahunan
                categoriesRaw[act.category].details[act.id].yearlyTarget += act.monthlyTarget;

                // Hitung capaian di bulan ini (gabungan base progress + cached reports)
                const combinedMonthProgress = { ...mProgress };
                if (monthlyReports) {
                    Object.entries(monthlyReports).forEach(([day, data]: [string, any]) => {
                        combinedMonthProgress[day] = { ...(combinedMonthProgress[day] || {}), ...data };
                    });
                }

                const achievedInMonth = Object.values(combinedMonthProgress).reduce((count: number, daily: any) => {
                    const val = daily[act.id];
                    return count + (val === true || val === 'hadir' ? 1 : 0);
                }, 0);

                categoriesRaw[act.category].details[act.id].yearlyAchieved += achievedInMonth;
            });
        });

        // Convert raw stats to standard performanceData format
        let totalBobot = 0;
        const finalCategories = Object.values(categoriesRaw).map(cat => {
            const details = Object.values(cat.details).map(d => ({
                title: d.title,
                target: d.yearlyTarget,
                achieved: d.yearlyAchieved,
                percentage: d.yearlyTarget > 0 ? Math.min(100, Math.round((d.yearlyAchieved / d.yearlyTarget) * 100)) : 0
            }));

            const totalPercentage = details.reduce((sum, d) => sum + d.percentage, 0);
            const averageScore = details.length > 0 ? Math.round(totalPercentage / details.length) : 0;
            const { grade, bobot } = getGradeDetails(averageScore);
            totalBobot += bobot;

            return {
                name: cat.name,
                details,
                score: averageScore,
                grade,
                bobot
            };
        });

        const ipResult = finalCategories.length > 0 ? totalBobot / finalCategories.length : 0;

        return { categories: finalCategories, ipResult };
    }, [employee, dailyActivitiesConfig, selectedMonth]);

    const performanceData = useMemo(() => {
        const monthProgress = enrichedProgress;
        const categories: Record<string, {
            name: string;
            details: {
                title: string;
                target: number;
                achieved: number;
                percentage: number;
            }[];
            totalAchieved: number;
            totalTarget: number;
        }> = {};

        dailyActivitiesConfig.forEach(activity => {
            if (!categories[activity.category]) {
                categories[activity.category] = {
                    name: activity.category,
                    details: [],
                    totalAchieved: 0,
                    totalTarget: 0,
                };
            }
            const achieved = Object.values(monthProgress).reduce((dayCount: number, dailyProgress: Record<string, boolean>) => {
                const val = (dailyProgress as any)[activity.id];
                return dayCount + (val === true || val === 'hadir' ? 1 : 0);
            }, 0);

            const percentage = activity.monthlyTarget > 0 ? Math.min(100, Math.round((achieved / activity.monthlyTarget) * 100)) : 0;

            categories[activity.category].details.push({
                title: activity.title,
                target: activity.monthlyTarget,
                achieved,
                percentage,
            });
        });

        let totalBobot = 0;
        const categoryResults = Object.values(categories).map(cat => {
            const totalPercentage = cat.details.reduce((sum: number, detail: {
                title: string;
                target: number;
                achieved: number;
                percentage: number;
            }) => sum + detail.percentage, 0);
            const averageScore = cat.details.length > 0 ? Math.round(totalPercentage / cat.details.length) : 0;
            const { grade, bobot } = getGradeDetails(averageScore);
            totalBobot += bobot;
            return { ...cat, score: averageScore, grade, bobot };
        });

        const ipForMonth = categoryResults.length > 0 ? totalBobot / categoryResults.length : 0;

        return { categories: categoryResults, ipForMonth };
    }, [enrichedProgress, dailyActivitiesConfig]);

    const { signatory } = useMemo(() => {
        const allUsersList = Object.values(allUsersData).map(d => d.employee);
        const managers = allUsersList.filter(u => u.functionalRoles?.includes('MANAJER'));

        let foundManager: Employee | undefined;
        for (const manager of managers) {
            const scope = manager.managerScope;
            if (scope) {
                if (scope.managedBagians?.includes(employee.bagian)) {
                    foundManager = manager;
                    break;
                }
                if (scope.managedUnits?.includes(employee.unit)) {
                    foundManager = manager;
                    break;
                }
                if (scope.additionalManagedUserIds?.includes(employee.id)) {
                    foundManager = manager;
                    break;
                }
            }
        }

        const dirut = allUsersList.find(u => u.canBeDirut);
        if (foundManager) {
            return { signatory: { name: foundManager.name, nip: foundManager.id, title: 'Manajer' } };
        }
        if (dirut) {
            return { signatory: { name: dirut.name, nip: dirut.id, title: 'Direktur Utama' } };
        }
        return { signatory: { name: '.........................', nip: '.........................', title: 'Direktur Utama' } };
    }, [allUsersData, employee]);

    const availableMonths = useMemo(() => {
        // Collect months from both activity history AND manual activation list
        const activityMonths = employee.monthlyActivities ? Object.keys(employee.monthlyActivities) : [];
        const activatedMonths = employee.activatedMonths || (employee as any).activated_months || [];

        // Merge and deduplicate
        const allUniqueMonths = Array.from(new Set([...activityMonths, ...activatedMonths]))
            .filter(m => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m));

        // Sort chronologically (Oldest to Newest) "berurutan"
        return allUniqueMonths.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [employee.monthlyActivities, employee.activatedMonths, (employee as any).activated_months]);

    const currentMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    if (viewingChecklistFor) {
        return <CeklisMutabaahView employee={employee} dailyActivitiesConfig={dailyActivitiesConfig} selectedMonth={viewingChecklistFor} allUsersData={allUsersData} onBack={() => setViewingChecklistFor(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-white/10">
                <nav className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 -mb-px min-w-max">
                        <TabButton label="Lembar Mutabaah" icon={DocumentTextIcon} active={activeTab === 'mutabaah'} onClick={() => setActiveTab('mutabaah')} />
                        <TabButton label="Transkrip Nilai" icon={ChartBarIcon} active={activeTab === 'transkrip'} onClick={() => setActiveTab('transkrip')} />
                    </div>
                </nav>
            </div>

            <div className="animate-view-change">
                {activeTab === 'mutabaah' && (
                    <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
                        <div className="overflow-x-auto rounded-lg border border-white/20">
                            <table className="min-w-full text-sm text-left text-white">
                                <thead className="bg-white/10 text-xs uppercase text-blue-200">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">No</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Deskripsi</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Bulan</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Tahun</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Status</th>
                                        <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableMonths.map((monthKey, index) => {
                                        const monthDate = new Date(monthKey + '-02T12:00:00Z');
                                        const isCurrent = monthKey === currentMonthKey;
                                        return (
                                            <tr key={monthKey} className="border-b border-gray-700 hover:bg-white/5">
                                                <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">Lembar Mutabaah Karyawan</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{monthDate.toLocaleDateString('id-ID', { month: 'long' })}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{monthDate.getFullYear()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm ${isCurrent
                                                        ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                                        : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${isCurrent ? 'bg-teal-400 animate-pulse' : 'bg-blue-400'}`}></div>
                                                        {isCurrent ? 'Aktif' : 'Selesai'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => setViewingChecklistFor(monthDate)} className="p-2 text-blue-300 hover:text-white rounded-full hover:bg-white/10" title="Lihat Checklist">
                                                            <DocumentTextIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={async () => await generateChecklistPdf(employee, dailyActivitiesConfig, monthDate, allUsersData, hospital)} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10" title="Unduh PDF">
                                                            <PdfIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {availableMonths.length === 0 && (
                                        <tr><td colSpan={6} className="text-center p-8 text-blue-200">Tidak ada data mutabaah yang tersedia.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'transkrip' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="shrink-0 flex items-center justify-between bg-black/20 p-1 rounded-full w-full sm:w-auto max-w-sm">
                                <button onClick={() => navigateMonth('prev')} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">&larr;</button>
                                <span className="font-semibold text-base text-teal-300 px-2 grow text-center">Tahun {selectedMonth.getFullYear()} (Jan - Des)</span>
                                <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">&rarr;</button>
                            </div>
                        </div>
                        <TranskripNilaiView
                            employee={employee}
                            allUsersData={allUsersData}
                            selectedMonth={selectedMonth}
                            performanceData={yearlyPerformanceData}
                            ipForMonth={yearlyPerformanceData.ipResult}
                            signatoryName={signatory.name}
                            signatoryNip={signatory.nip}
                            signatoryTitle={signatory.title}
                            hospital={hospital}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RapotView;