import React, { useMemo, useState, Fragment } from 'react';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Employee, type WeeklyReportSubmission, type DailyActivity, type Hospital } from '../types';
import { PdfIcon, ChartBarIcon, DocumentTextIcon, ArrowLeftIcon } from './Icons';

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

const generateTranscriptPdf = (
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

    const logoBase64 = hospital?.logo;
    const hospitalName = hospital?.name || 'RUMAH SAKIT ISLAM JAKARTA GROUP';
    const hospitalAddress = hospital?.address || 'Alamat tidak terdaftar';

    const headerTopMargin = 15;
    let headerTextX = pageWidth / 2;
    let logoBottomY = headerTopMargin;
    let textBlockBottomY = headerTopMargin;

    // 1. Header with LOGO logic
    if (logoBase64) {
        const logoSize = 20;
        const logoY = headerTopMargin - 5; // Position logo higher
        const logoX = pageMargin + 2; // Geser logo sedikit ke kanan
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
        logoBottomY = logoY + logoSize;

        const textStartX = logoX + logoSize + 10;
        headerTextX = textStartX + (pageWidth - textStartX - pageMargin) / 2;
    }

    const hospitalNameY = headerTopMargin + 5;
    const hospitalAddressY = hospitalNameY + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#115E59'); // Teal-800
    doc.text(hospitalName.toUpperCase(), headerTextX, hospitalNameY, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor('#475569'); // Slate-600
    doc.text(hospitalAddress, headerTextX, hospitalAddressY, { align: 'center' });

    const addressTextHeight = doc.getTextDimensions(hospitalAddress, { fontSize: 10 }).h;
    textBlockBottomY = hospitalAddressY + addressTextHeight;

    const headerBottom = Math.max(logoBottomY, textBlockBottomY);
    const lineY = headerBottom + 4; // Add padding below the lowest element

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
        ['PERIODE', 'INDEKS PRESTASI BULANAN (IPB)', 'PREDIKAT'],
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
                    { content: `- ${detail.title}`, styles: { cellPadding: { left: 8 } } },
                    `${detail.achieved}/${detail.target}`,
                    '', '', ''
                ]);
            });
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [[
                { content: 'Kategori & Indikator Penilaian', colSpan: 2 },
                { content: 'Nilai', styles: { halign: 'center' as const } }, { content: 'Huruf', styles: { halign: 'center' as const } }, { content: 'Bobot', styles: { halign: 'center' as const } }
            ]],
            body: tableBody,
            theme: 'grid',
            headStyles: { valign: 'middle' as const, fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: 'bold' as const, fontSize: 9, lineWidth: 0.1, lineColor: [203, 213, 225] },
            bodyStyles: { valign: 'middle' as const, fontSize: 9, lineWidth: 0.1, lineColor: [203, 213, 225] },
            columnStyles: { 1: { halign: 'center' as const } }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    // 6. Signatures
    let signatureY = finalY + 15;
    if (signatureY > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        signatureY = 30;
    }

    const todayForPdf = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const tableWidth = pageWidth - (pageMargin * 2);
    const leftX = pageMargin + (tableWidth * 0.25);
    const rightX = pageWidth - pageMargin - (tableWidth * 0.25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Date
    doc.text(`Jakarta, ${todayForPdf}`, rightX, signatureY, { align: 'center' });
    let currentY = signatureY + 5;

    // Titles
    doc.text(`${signatoryTitle},`, leftX, currentY, { align: 'center' });
    doc.text('Pegawai,', rightX, currentY, { align: 'center' });
    currentY += 30; // Space for signature

    // Signature image for employee
    if (employee.signature) {
        const imgWidth = 40, imgHeight = 20;
        const x = rightX - (imgWidth / 2);
        const y = currentY - 25;
    }

    // Names
    doc.setFont('helvetica', 'bold');
    doc.text(signatoryName, leftX, currentY, { align: 'center' });
    doc.text(employee.name, rightX, currentY, { align: 'center' });

    // Underlines for names
    doc.setLineWidth(0.2);
    const dirutNameWidth = doc.getTextWidth(signatoryName);
    doc.line(leftX - (dirutNameWidth / 2), currentY + 1.2, leftX + (dirutNameWidth / 2), currentY + 1.2);

    const employeeNameWidth = doc.getTextWidth(employee.name);
    doc.line(rightX - (employeeNameWidth / 2), currentY + 1.2, rightX + (employeeNameWidth / 2), currentY + 1.2);
    currentY += 5;

    // NIPs
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${signatoryNip}`, leftX, currentY, { align: 'center' });
    doc.text(`NIP. ${employee.id}`, rightX, currentY, { align: 'center' });

    doc.save(`transkrip_nilai_${employee.name.replace(/\s/g, '_')}_${selectedMonthLabel.replace(/\s/g, '_')}.pdf`);
};

const generateChecklistPdf = (
    employee: Employee,
    dailyActivitiesConfig: DailyActivity[],
    selectedMonth: Date,
    allUsersData: Record<string, { employee: Employee;[key: string]: Record<string, any>; }>,
    hospital: Hospital | null
) => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const pageMargin = 15; // Increased horizontal margin
    const pageWidth = doc.internal.pageSize.getWidth();
    let finalY = 0;

    const monthKey = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    // 🔥 FIX: Enrich progress data to match Dashboard logic
    // We use a consolidated approach: Base Monthly Items + Cached Reports (which includes Attendance, Team Sessions, etc.)
    const baseProgress = employee.monthlyActivities?.[monthKey] || {};
    const enrichedProgress = { ...baseProgress };

    // 2. Sync Reading History (Books)
    if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
        employee.readingHistory.forEach(history => {
            const date = history.dateCompleted; // YYYY-MM-DD
            if (date.startsWith(monthKey)) {
                const dayKey = date.substring(8, 10);
                if (!enrichedProgress[dayKey]) {
                    enrichedProgress[dayKey] = {};
                }
                enrichedProgress[dayKey]['baca_alquran_buku'] = true;
            }
        });
    }

    // 3. Sync Quran History
    if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
        employee.quranReadingHistory.forEach((history: any) => {
            const date = history.date; // YYYY-MM-DD
            if (date.startsWith(monthKey)) {
                const dayKey = date.substring(8, 10);
                if (!enrichedProgress[dayKey]) {
                    enrichedProgress[dayKey] = {};
                }
                enrichedProgress[dayKey]['baca_alquran_buku'] = true;
            }
        });
    }

    const progress = enrichedProgress;
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();

    const logoBase64 = hospital?.logo;
    const hospitalName = hospital?.name || 'RUMAH SAKIT ISLAM JAKARTA GROUP';
    const hospitalAddress = hospital?.address || 'Alamat tidak terdaftar';

    // Helper to get names
    const getUserName = (id?: string) => id ? allUsersData[id]?.employee.name || '.........................' : '.........................';
    const mentorName = getUserName(employee.mentorId);
    const supervisorName = getUserName(employee.supervisorId);
    const kaUnitName = getUserName(employee.kaUnitId);

    // 1. Header Section
    const headerTopMargin = 15;
    let headerTextX = pageWidth / 2;
    let logoBottomY = headerTopMargin;
    let textBlockBottomY = headerTopMargin;

    if (logoBase64) {
        const logoSize = 20;
        const logoY = headerTopMargin - 5; // Position logo higher
        const logoX = pageMargin + 2; // Geser logo sedikit ke kanan
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
        logoBottomY = logoY + logoSize;

        const textStartX = logoX + logoSize + 10;
        headerTextX = textStartX + (pageWidth - textStartX - pageMargin) / 2;
    }

    const hospitalNameY = headerTopMargin + 5;
    const hospitalAddressY = hospitalNameY + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#115E59'); // Teal-800
    doc.text(hospitalName.toUpperCase(), headerTextX, hospitalNameY, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor('#475569'); // Slate-600
    doc.text(hospitalAddress, headerTextX, hospitalAddressY, { align: 'center' });

    const addressTextHeight = doc.getTextDimensions(hospitalAddress, { fontSize: 10 }).h;
    textBlockBottomY = hospitalAddressY + addressTextHeight;

    const headerBottom = Math.max(logoBottomY, textBlockBottomY);
    const lineY = headerBottom + 4; // Add padding below the lowest element

    doc.setDrawColor('#0F766E'); // Teal-700
    doc.setLineWidth(1);
    doc.line(pageMargin, lineY, pageWidth - pageMargin, lineY);

    // 2. Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#334155'); // Slate-700
    const titleY = lineY + 8;
    doc.text('LEMBAR MUTABAAH HARIAN', pageWidth / 2, titleY, { align: 'center' });

    // 3. Employee Info
    autoTable(doc, {
        startY: titleY + 4,
        body: [
            ['Nama', `: ${employee.name}`, 'Bulan', `: ${selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`],
            ['Nopeg', `: ${employee.id}`, 'Unit', `: ${employee.unit}`],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1, textColor: '#1e293b' },
        columnStyles: {
            0: { fontStyle: 'bold' as const, textColor: '#64748b' },
            2: { fontStyle: 'bold' as const, textColor: '#64748b' },
        },
    });
    finalY = (doc as any).lastAutoTable.finalY;

    // 4. Table
    const groupedActivities = dailyActivitiesConfig.reduce((acc, activity) => {
        if (!acc[activity.category]) acc[activity.category] = [];
        acc[activity.category].push(activity);
        return acc;
    }, {} as Record<string, DailyActivity[]>);

    const tableHead = [['Indikator Penilaian', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))]];
    const tableBody: any[] = [];

    Object.entries(groupedActivities).forEach(([category, activities]) => {
        tableBody.push([
            { content: category.toUpperCase(), colSpan: daysInMonth + 1, styles: { fontStyle: 'bold' as const, fillColor: [241, 245, 249] } }
        ]);
        activities.forEach(activity => {
            const row = [activity.title];
            for (let i = 1; i <= daysInMonth; i++) {
                const dayKey = String(i).padStart(2, '0');
                const isChecked = (progress[dayKey]?.[activity.id] as any) === true || (progress[dayKey]?.[activity.id] as any) === 'hadir';
                row.push(isChecked ? '✓' : '✗');
            }
            tableBody.push(row);
        });
    });

    autoTable(doc, {
        startY: finalY + 5,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        margin: { left: pageMargin, right: pageMargin, bottom: 5 },
        headStyles: { valign: 'middle' as const, fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: 'bold' as const, fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [203, 213, 225] },
        bodyStyles: { valign: 'middle' as const, fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [203, 213, 225], minCellHeight: 6 },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' as const },
            ...Object.fromEntries(Array.from({ length: daysInMonth }, (_, i) => [i + 1, { cellWidth: 7, halign: 'center' as const }]))
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                if (data.cell.raw === '✓' || data.cell.raw === '✗') {
                    data.cell.text = ['']; // Clear the text to prevent font rendering issues
                }
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                const { cell, doc } = data;
                const isChecked = cell.raw === '✓';
                const isCrossed = cell.raw === '✗';

                if (isChecked) {
                    // Draw a green checkmark with fixed size
                    doc.setDrawColor(13, 148, 136); // Teal-600
                    doc.setLineWidth(0.5);
                    const x = cell.x + cell.width / 2;
                    const y = cell.y + cell.height / 2;
                    const size = 1.8; // Fixed size for aesthetics

                    doc.line(x - size, y, x - size / 2, y + size);
                    doc.line(x - size / 2, y + size, x + size, y - size * 0.8);

                } else if (isCrossed) {
                    // Draw a slate gray cross with fixed size
                    doc.setDrawColor(100, 116, 139); // Slate-500
                    doc.setLineWidth(0.5);
                    const padding = 1.8; // Fixed padding for aesthetics
                    const x1 = cell.x + padding;
                    const y1 = cell.y + padding;
                    const x2 = cell.x + cell.width - padding;
                    const y2 = cell.y + cell.height - padding;
                    doc.line(x1, y1, x2, y2);
                    doc.line(x2, y1, x1, y2);
                }
            }
        }
    });
    finalY = (doc as any).lastAutoTable.finalY;

    // 5. Signatures
    let signatureY = doc.internal.pageSize.getHeight() - 40;
    if (signatureY < finalY + 10) {
        signatureY = finalY + 10;
    }

    const signatureXPositions = [41, 113, 184, 256];
    const signatureTitles = ['Ka. Unit Kerja', 'Supervisor', 'Mentor', 'Pegawai'];
    const signatureNames = [kaUnitName, supervisorName, mentorName, employee.name];
    const signatureNips = [employee.kaUnitId || '', employee.supervisorId || '', employee.mentorId || '', employee.id];
    const signatures = [null, null, null, employee.signature]; // Only employee signature for now

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    signatureTitles.forEach((title, index) => {
        doc.text(title + ',', signatureXPositions[index], signatureY, { align: 'center' });
    });

    signatureNames.forEach((name, index) => {
        const yPos = signatureY + 25;

        if (signatures[index]) {
            const imgWidth = 40, imgHeight = 20;
            const x = signatureXPositions[index] - (imgWidth / 2);
            const y = yPos - 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(name, signatureXPositions[index], yPos, { align: 'center' });
        doc.setLineWidth(0.2);
        const nameWidth = doc.getTextWidth(name);
        doc.line(signatureXPositions[index] - (nameWidth / 2), yPos + 1, signatureXPositions[index] + (nameWidth / 2), yPos + 1);
        if (signatureNips[index]) {
            doc.setFont('helvetica', 'normal');
            doc.text(`NIP. ${signatureNips[index]}`, signatureXPositions[index], yPos + 5, { align: 'center' });
        }
    });

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

    // 🔥 FIX: Enrich progress data
    const progress = useMemo(() => {
        const baseProgress = employee.monthlyActivities?.[monthKey] || {};
        const enriched = { ...baseProgress };

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
    const daysInMonth = useMemo(() => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate(), [selectedMonth]);
    const today = useMemo(() => new Date(), []);
    const todayDay = today.getDate().toString().padStart(2, '0');
    const isCurrentMonthView = today.getFullYear() === selectedMonth.getFullYear() && today.getMonth() === selectedMonth.getMonth();

    const mentorName = useMemo(() => allUsersData[employee.mentorId || '']?.employee.name || '.........................', [allUsersData, employee.mentorId]);
    const supervisorName = useMemo(() => allUsersData[employee.supervisorId || '']?.employee.name || '.........................', [allUsersData, employee.supervisorId]);
    const kaUnitName = useMemo(() => allUsersData[employee.kaUnitId || '']?.employee.name || '.........................', [allUsersData, employee.kaUnitId]);

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, DailyActivity[]>);
    }, [dailyActivitiesConfig]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl text-slate-800 max-w-7xl mx-auto">
            {onBack && (
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg text-sm transition-colors shadow"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Kembali ke Daftar
                </button>
            )}
            <div className="text-center pb-4">
                <h3 className="text-xl font-extrabold text-teal-700">RUMAH SAKIT ISLAM JAKARTA SUKAPURA</h3>
                <p className="text-sm text-slate-600">Jl. Tipar Cakung No.5, Sukapura, Kec. Cilincing, Jakarta Utara</p>
            </div>
            <hr className="border-t-4 border-teal-600 mb-4" />
            <h4 className="text-center font-bold text-lg text-slate-700 mt-6">LEMBAR MUTABAAH HARIAN</h4>

            <div className="mt-6 text-sm grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                <strong className="text-slate-500">Nama</strong><span>: {employee.name}</span>
                <strong className="text-slate-500">Bulan</strong><span>: {selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                <strong className="text-slate-500">Nopeg</strong><span>: {employee.id}</span>
                <strong className="text-slate-500">Unit</strong><span>: {employee.unit}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-300 mt-6">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sticky left-0 z-20 bg-slate-100 border-b-2 border-slate-300 whitespace-nowrap">Indikator Penilaian</th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                <th key={day} scope="col" className={`px-2 py-3 font-bold text-center w-12 min-w-[48px] border-b-2 border-l border-slate-300 whitespace-nowrap ${isCurrentMonthView && day.toString().padStart(2, '0') === todayDay ? 'bg-teal-100 text-teal-800' : 'bg-slate-50'}`}>
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedActivities).map(([category, activities]) => (
                            <Fragment key={category}>
                                <tr><td colSpan={daysInMonth + 1} className="px-3 py-2 font-bold text-teal-700 sticky left-0 z-10 bg-slate-200 border-b border-slate-300 whitespace-nowrap">{category}</td></tr>
                                {activities.map((activity, actIndex) => (
                                    <tr key={activity.id} className={`border-b border-slate-200 ${actIndex === activities.length - 1 ? 'border-b-2 border-slate-300' : ''}`}>
                                        <td className="px-3 py-3 font-medium text-left sticky left-0 bg-white z-10 whitespace-nowrap">{activity.title}</td>
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const dayKey = (i + 1).toString().padStart(2, '0');
                                            const isChecked = (progress[dayKey]?.[activity.id] as any) === true || (progress[dayKey]?.[activity.id] as any) === 'hadir';
                                            return (
                                                <td key={dayKey} className={`text-center border-l border-slate-200 ${isCurrentMonthView && dayKey === todayDay ? 'bg-teal-50' : ''}`}>
                                                    <div className="w-full h-full flex items-center justify-center py-3 text-xl font-bold">
                                                        {isChecked ? <span className="text-green-700">✓</span> : <span className="text-slate-400">✗</span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-12 text-slate-800 text-sm">
                <div className="flex justify-end mb-4">
                    <div className="w-1/4 text-center"><p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                </div>
                <div className="flex justify-between">
                    {[
                        { title: 'Ka. Unit Kerja', name: kaUnitName, nip: employee.kaUnitId },
                        { title: 'Supervisor', name: supervisorName, nip: employee.supervisorId },
                        { title: 'Mentor', name: mentorName, nip: employee.mentorId },
                        { title: 'Pegawai', name: employee.name, nip: employee.id, signature: employee.signature }
                    ].map(signer => (
                        <div key={signer.title} className="w-1/4 text-center">
                            <p>{signer.title},</p>
                            <div className="h-20 flex items-center justify-center">
                                {signer.signature && <Image src={signer.signature} alt="Tanda Tangan" width={64} height={64} className="h-16" />}
                            </div>
                            <p className="font-bold underline">{signer.name}</p>
                            {signer.nip && <p>NIP. {signer.nip}</p>}
                        </div>
                    ))}
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

    const mentorName = useMemo(() => {
        if (!employee.mentorId) return 'Belum Diatur';
        return allUsersData[employee.mentorId]?.employee.name || 'Belum Diatur';
    }, [allUsersData, employee.mentorId]);

    const selectedMonthLabel = useMemo(() => {
        return selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }, [selectedMonth]);

    const todayForView = useMemo(() => new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }), []);

    return (
        <div className="bg-gray-900/50 p-2 sm:p-6 rounded-lg">
            <div className="flex justify-end items-center mb-6">
                <button
                    onClick={() => generateTranscriptPdf(employee, performanceData, ipForMonth, selectedMonthLabel, signatoryName, signatoryNip, signatoryTitle, mentorName, hospital)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-colors shadow"
                >
                    <PdfIcon className="w-5 h-5" />
                    Unduh PDF
                </button>
            </div>
            <div className="bg-slate-50 p-6 sm:p-10 rounded shadow-2xl text-gray-800" id="transcript-content">
                <div className="text-center pb-4 flex items-center justify-center">
                    {hospital?.logo && <Image src={hospital.logo} alt="Hospital Logo" width={80} height={80} className="h-20 mr-4" />}
                    <div>
                        <h3 className="text-xl sm:text-3xl font-extrabold text-teal-700">{(hospital?.name || 'Rumah Sakit Islam Jakarta Group').toUpperCase()}</h3>
                        <p className="text-sm text-gray-600">{hospital?.address || 'Alamat tidak terdaftar'}</p>
                    </div>
                </div>
                <hr className="border-t-4 border-teal-600 mb-4" />

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm sm:text-base">
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Nama</strong>: {employee.name}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Unit Kerja</strong>: {employee.unit}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Nopeg</strong>: {employee.id}</div>
                    <div><strong className="font-medium text-gray-500 w-24 inline-block">Mentor</strong>: {mentorName}</div>
                </div>

                <div className="mt-8 p-4 bg-slate-100 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border border-slate-200">
                    <div>
                        <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">PERIODE</p>
                        <p className="text-2xl sm:text-3xl font-bold text-teal-600">{selectedMonthLabel.toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">INDEKS PRESTASI BULANAN (IPB)</p>
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
                                    <Image src={employee.signature} alt="Tanda Tangan" width={64} height={64} className="h-16" />
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
        if (!hospitals || !employee.hospitalId) return null;
        return hospitals.find(h => h.id === employee.hospitalId) || null;
    }, [hospitals, employee.hospitalId]);

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
        if (!employee.monthlyActivities) return [];
        return Object.keys(employee.monthlyActivities)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [employee.monthlyActivities]);

    const currentMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    if (viewingChecklistFor) {
        return <CeklisMutabaahView employee={employee} dailyActivitiesConfig={dailyActivitiesConfig} selectedMonth={viewingChecklistFor} allUsersData={allUsersData} onBack={() => setViewingChecklistFor(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-white">APPI</h2>
            </div>

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
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Periode Penilaian</th>
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
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isCurrent ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                        {isCurrent ? 'AKTIF' : 'SELESAI'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => setViewingChecklistFor(monthDate)} className="p-2 text-blue-300 hover:text-white rounded-full hover:bg-white/10" title="Lihat Checklist">
                                                            <DocumentTextIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => generateChecklistPdf(employee, dailyActivitiesConfig, monthDate, allUsersData, hospital)} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10" title="Unduh PDF">
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
                                <span className="font-semibold text-base text-teal-300 px-2 grow text-center">{selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">&rarr;</button>
                            </div>
                        </div>
                        <TranskripNilaiView
                            employee={employee}
                            allUsersData={allUsersData}
                            selectedMonth={selectedMonth}
                            performanceData={performanceData}
                            ipForMonth={performanceData.ipForMonth}
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