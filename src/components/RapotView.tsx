import React, { useMemo, useState, useEffect, Fragment } from 'react';
import NextImage from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Employee, type DailyActivity, type Hospital, type MonthlyReportSubmission } from '../types';
import { PdfIcon, ChartBarIcon, DocumentTextIcon, ArrowLeftIcon, CheckIcon, XIcon, ClockIcon } from './Icons';
import { imageUrlToBase64, flattenImageWithWhiteBackground } from '@/utils/imageUtils';
import { getUserMonthlyReports } from '@/services/monthlySubmissionService';

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
    hospital: Hospital | null,
    signatorySignature: string | null
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
            const rawLogo = hospital.logo.startsWith('http')
                ? await imageUrlToBase64(hospital.logo)
                : hospital.logo;

            // 🔥 FIX: Flatten logo to white background JPEG
            const logoBase64 = await flattenImageWithWhiteBackground(rawLogo);
            doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
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

    doc.setDrawColor(204, 251, 241); // Teal-200
    doc.setLineWidth(0.3);
    // doc.roundedRect(pageMargin, infoY, pageWidth - 2 * pageMargin, 16, 2, 2, 'S');

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

    // Helper for auto-scaling font size to fit width
    const drawTextFitWidth = (text: string, x: number, y: number, maxWidth: number, options: any) => {
        let fontSize = options.fontSize || 9;
        doc.setFontSize(fontSize);
        while (doc.getTextWidth(text) > maxWidth && fontSize > 5) {
            fontSize -= 0.5;
            doc.setFontSize(fontSize);
        }
        doc.text(text, x, y, options);
    };

    // Pre-load signatures with white background flattening
    let employeeSignatureBase64 = null;
    if (employee.signature) {
        try {
            const rawSig = employee.signature.startsWith('http')
                ? await imageUrlToBase64(employee.signature)
                : employee.signature;
            employeeSignatureBase64 = await flattenImageWithWhiteBackground(rawSig);
        } catch (e) {
            console.error('Failed to load employee signature for PDF', e);
        }
    }

    let bossSignatureBase64 = null;
    if (signatorySignature) {
        try {
            const rawSig = signatorySignature.startsWith('http')
                ? await imageUrlToBase64(signatorySignature)
                : signatorySignature;
            bossSignatureBase64 = await flattenImageWithWhiteBackground(rawSig);
        } catch (e) {
            console.error('Failed to load signatory signature for PDF', e);
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
        didParseCell: (data) => {
            // Set height for signature row
            if (data.row.index === 1) {
                data.cell.styles.minCellHeight = 25;
            }
        },
        willDrawCell: (data) => {
            if (data.row.index === 3) {
                doc.setFont('helvetica', 'bold');
                doc.setDrawColor('#000');
                const cellText = data.cell.text[0] || '';

                // Adjust font size if name is too long
                let fontSize = 9;
                doc.setFontSize(fontSize);
                const maxWidth = data.cell.width - 4;
                while (doc.getTextWidth(cellText) > maxWidth && fontSize > 5) {
                    fontSize -= 0.5;
                    doc.setFontSize(fontSize);
                }
                data.cell.styles.fontSize = fontSize;

                const textWidth = doc.getTextWidth(cellText);
                const x = data.cell.x + (data.cell.width - textWidth) / 2;
                doc.line(x, data.cell.y + data.cell.height - 1, x + textWidth, data.cell.y + data.cell.height - 1);
            }
        },
        didDrawCell: (data) => {
            // Signatory Signature (Row 1, Column 0)
            if (data.row.index === 1 && data.column.index === 0 && bossSignatureBase64) {
                try {
                    const imgW = 25;
                    const imgH = 18;
                    const x = data.cell.x + (data.cell.width - imgW) / 2;
                    const y = data.cell.y + (data.cell.height - imgH) / 2;
                    doc.addImage(bossSignatureBase64, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
                } catch (e) { }
            }
            // Employee Signature (Row 1, Column 1)
            if (data.row.index === 1 && data.column.index === 1 && employeeSignatureBase64) {
                try {
                    const imgW = 25;
                    const imgH = 18;
                    const x = data.cell.x + (data.cell.width - imgW) / 2;
                    const y = data.cell.y + (data.cell.height - imgH) / 2;
                    doc.addImage(employeeSignatureBase64, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
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
    hospital: Hospital | null,
    isMentorApproved: boolean
) => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const marginLeft = 10;
    const marginRight = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - marginLeft - marginRight;
    const pageHeight = doc.internal.pageSize.getHeight();
    const monthKey = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthLabel = selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // HEADER SECTION
    // 1. Logo
    let startY = 6;
    if (hospital?.logo) {
        try {
            const rawLogo = hospital.logo.startsWith('http')
                ? await imageUrlToBase64(hospital.logo)
                : hospital.logo;
            const logoBase64 = await flattenImageWithWhiteBackground(rawLogo);
            // Reduced size slightly to 18x18 and kept startY at 6 to prevent overlap
            doc.addImage(logoBase64, 'JPEG', marginLeft, startY, 18, 18, undefined, 'FAST');
        } catch (e) { }
    }

    // 2. Hospital Name & Address
    const hospitalNameUpper = (hospital?.name || 'RUMAH SAKIT ISLAM JAKARTA GROUP').toUpperCase();

    // Ensure "RUMAH SAKIT" is fully spelled out if it starts with "RS "
    const formattedHospitalName = hospitalNameUpper.startsWith('RS ')
        ? hospitalNameUpper.replace('RS ', 'RUMAH SAKIT ')
        : hospitalNameUpper;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#0F766E'); // Teal-700
    // Adjusted Y position to align with smaller logo
    doc.text(formattedHospitalName, pageWidth / 2, startY + 7, { align: 'center' });

    // Address
    const address = hospital?.address || 'Jl. Tipar Cakung No.5, RT.5/RW.5, Sukapura, Kec. Cilincing, Jkt Utara, Daerah Khusus Ibukota Jakarta 14140';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#64748B'); // Slate-500
    doc.text(address, pageWidth / 2, startY + 13, { align: 'center' });

    // 3. Line Separator (Double Line Standard for Official Documents)
    // Moved lineY down to 22 (from 20) to give extra breathing room for the logo
    const lineY = startY + 22;
    doc.setDrawColor('#000000'); // Black standard
    doc.setLineWidth(1);
    doc.line(marginLeft, lineY, pageWidth - marginRight, lineY); // Thick line
    doc.setLineWidth(0.5);
    doc.line(marginLeft, lineY + 1.5, pageWidth - marginRight, lineY + 1.5); // Thin line below

    // 4. Report Title & Period (Below Line)
    const titleY = lineY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#000000'); // Black
    doc.text('LEMBAR MUTABA\'AH HARIAN KARYAWAN', pageWidth / 2, titleY, { align: 'center' });

    const periodY = titleY + 6;
    doc.setFont('helvetica', 'bold'); // Bold for emphasis
    doc.setFontSize(11);
    doc.setTextColor('#000000'); // Black
    doc.text(`PERIODE: ${monthLabel.toUpperCase()}`, pageWidth / 2, periodY, { align: 'center' });


    // Employee Info Section - Official Clean Style (No Colored Box)
    const infoY = periodY + 15;

    // Coordinates for alignment
    const col1X = marginLeft + 5;
    const col1SepX = marginLeft + 35; // Wider for better spacing
    const col1ValX = marginLeft + 38;

    const centerPage = pageWidth / 2;
    const col2X = centerPage + 5;
    const col2SepX = centerPage + 35;
    const col2ValX = centerPage + 38;

    doc.setFont('helvetica', 'normal'); // Standard font weight
    doc.setFontSize(10); // Standard readable size
    doc.setTextColor('#000000'); // Black standard

    // Left Column Labels
    doc.text('Nama', col1X, infoY);
    doc.text('NIP', col1X, infoY + 6);
    // Separators
    doc.text(':', col1SepX, infoY);
    doc.text(':', col1SepX, infoY + 6);

    // Right Column Labels
    doc.text('Unit Kerja', col2X, infoY);
    doc.text('Bagian', col2X, infoY + 6);
    // Separators
    doc.text(':', col2SepX, infoY);
    doc.text(':', col2SepX, infoY + 6);

    doc.setFont('helvetica', 'bold'); // Bold for values

    // Values
    doc.text(employee.name, col1ValX, infoY);
    doc.text(employee.id, col1ValX, infoY + 6);
    doc.text(employee.unit, col2ValX, infoY);
    doc.text(employee.bagian, col2ValX, infoY + 6);

    // Table
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
            row.push(isDone ? 'CHECK' : ''); // Marker for custom drawing
            if (isDone) total++;
        }
        row.push(total.toString());
        return row;
    });

    // Generate column styles for fixed date column widths
    const dateColumnStyles: Record<string, any> = {};
    for (let i = 2; i < daysInMonth + 2; i++) {
        dateColumnStyles[i] = { cellWidth: 7, halign: 'center' }; // Fixed width for date columns
    }

    autoTable(doc, {
        startY: infoY + 22,
        margin: { left: marginLeft, right: marginRight, bottom: 35 },
        head: headers,
        body: data,
        theme: 'grid',
        styles: {
            fontSize: 6.5, // Slightly smaller to fit vertical space
            cellPadding: 0.8, // Reduced padding
            halign: 'center',
            valign: 'middle',
            lineColor: [203, 213, 225], // Slate-300
            lineWidth: 0.1,
            textColor: [30, 41, 59] // Slate-800
        },
        columnStyles: {
            0: { cellWidth: 8, fontStyle: 'bold', fillColor: [241, 245, 249] }, // No column
            1: { halign: 'left', cellWidth: 50, fillColor: [241, 245, 249] }, // Indikator column
            ...dateColumnStyles, // Apply fixed widths for all date columns
            [daysInMonth + 2]: { fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [13, 148, 136], cellWidth: 10 } // Total column
        },
        headStyles: {
            fillColor: [13, 148, 136], // Teal-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6.5,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        didDrawCell: (data) => {
            // Custom drawing for checkmarks to make them larger
            if (data.section === 'body' && data.column.index >= 2 && data.column.index < daysInMonth + 2) {
                if (data.cell.raw === 'CHECK') {
                    const cell = data.cell;
                    const x = cell.x + cell.width / 2;
                    const y = cell.y + cell.height / 2;

                    // Draw a large checkmark
                    doc.setDrawColor('#0D9488'); // Teal-600
                    doc.setLineWidth(0.5);

                    // Scaling factor for the checkmark
                    const scale = 1.2;

                    // Draw checkmark lines manually
                    doc.line(x - 1 * scale, y, x - 0.3 * scale, y + 1.2 * scale); // Short leg
                    doc.line(x - 0.3 * scale, y + 1.2 * scale, x + 1.5 * scale, y - 1.5 * scale); // Long leg
                }
            }
        },
        willDrawCell: (data) => {
            if (data.section === 'body' && data.cell.raw === 'CHECK') {
                data.cell.text = []; // Clear text so we only see our custom drawing
            }
        },
    });

    // Signature Section - Modern 4-Column Layout
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Section Title Removed


    // Helper to get names
    const getName = (id?: string) => {
        if (!id) return null;
        const strId = String(id).trim();
        if (allUsersData[strId]) return allUsersData[strId].employee.name;
        const foundData = Object.values(allUsersData).find(d => String(d.employee?.id).trim() === strId);
        return foundData ? foundData.employee.name : null;
    };

    // Logic: If ID exists but Name not found -> Return '-' (Don't use 'Belum Diatur' if NIP exists)
    // If ID is missing -> Return 'Belum Diatur'
    const getDisplayName = (id?: string) => {
        if (!id) return 'Belum Diatur';
        const name = getName(id);
        return name || '-';
    };

    const kaUnitName = getDisplayName(employee.kaUnitId);
    const supervisorName = getDisplayName(employee.supervisorId);
    const mentorName = getDisplayName(employee.mentorId);

    // Calculate column width for 4 signatures
    const sigSectionWidth = pageWidth - marginLeft - marginRight;
    const colWidth = sigSectionWidth / 4;
    const sigStartY = finalY + 5;

    // Signature data
    const signatures = [
        { title: 'Kepala Unit', name: kaUnitName, nip: employee.kaUnitId || '-', signature: employee.kaUnitId ? allUsersData[employee.kaUnitId]?.employee?.signature : null },
        { title: 'Supervisor', name: supervisorName, nip: employee.supervisorId || '-', signature: employee.supervisorId ? allUsersData[employee.supervisorId]?.employee?.signature : null },
        { title: 'Mentor', name: mentorName, nip: employee.mentorId || '-', signature: isMentorApproved && employee.mentorId ? allUsersData[employee.mentorId]?.employee?.signature : null },
        { title: 'Karyawan', name: employee.name, nip: employee.id, signature: employee.signature }
    ];

    // Draw each signature column
    for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        const x = marginLeft + i * colWidth;
        const centerX = x + colWidth / 2;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor('#0F766E'); // Teal-700
        doc.text(sig.title, centerX, sigStartY, { align: 'center' });

        // Signature image
        if (sig.signature) {
            try {
                const rawSig = sig.signature.startsWith('http') ? await imageUrlToBase64(sig.signature) : sig.signature;
                const sigBase64 = await flattenImageWithWhiteBackground(rawSig);
                const imgW = 20;
                const imgH = 12;
                doc.addImage(sigBase64, 'JPEG', centerX - imgW / 2, sigStartY + 3, imgW, imgH, undefined, 'FAST');
            } catch (e) { }
        }

        // Name with underline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor('#1E293B'); // Slate-800

        // Auto-scale name if too long
        let fontSize = 7.5;
        doc.setFontSize(fontSize);
        while (doc.getTextWidth(sig.name) > colWidth - 6 && fontSize > 5) {
            fontSize -= 0.3;
            doc.setFontSize(fontSize);
        }

        const nameY = sigStartY + 18;
        doc.text(sig.name, centerX, nameY, { align: 'center' });

        // Underline for name (Spaced nicely)
        const nameWidth = doc.getTextWidth(sig.name);
        doc.setDrawColor('#1E293B');
        doc.setLineWidth(0.3);
        doc.line(centerX - nameWidth / 2, nameY + 1.5, centerX + nameWidth / 2, nameY + 1.5);

        // NIP
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor('#64748B'); // Slate-500
        doc.text(`NIP. ${sig.nip}`, centerX, nameY + 4, { align: 'center' });
    }

    doc.save(`mutabaah_${employee.name.replace(/\s/g, '_')}_${monthKey}.pdf`);
};


interface CeklisMutabaahViewProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    selectedMonth: Date;
    allUsersData: Record<string, { employee: Employee;[key: string]: Record<string, any>; }>;
    onBack?: () => void;
    hospital: Hospital | null;
    isMentorApproved: boolean;
}

const CeklisMutabaahView: React.FC<CeklisMutabaahViewProps> = ({ employee, dailyActivitiesConfig, selectedMonth, allUsersData, onBack, hospital, isMentorApproved }) => {
    const monthKey = useMemo(() => `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`, [selectedMonth]);

    const daysInMonth = useMemo(() => {
        return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    }, [selectedMonth]);

    const isCurrentMonthView = useMemo(() => {
        const now = new Date();
        return now.getFullYear() === selectedMonth.getFullYear() && now.getMonth() === selectedMonth.getMonth();
    }, [selectedMonth]);

    const today = new Date().getDate();

    const userMap = useMemo(() => {
        const map = new Map<string, string>();
        Object.values(allUsersData).forEach(d => {
            if (d.employee?.id) map.set(String(d.employee.id).trim(), d.employee.name);
        });
        return map;
    }, [allUsersData]);

    const getName = (id?: string) => {
        if (!id) return null;
        const normalizedId = String(id).trim();
        return userMap.get(normalizedId) || null;
    };

    const kaUnitName = useMemo(() => getName(employee.kaUnitId), [userMap, employee.kaUnitId]);
    const supervisorName = useMemo(() => getName(employee.supervisorId), [userMap, employee.supervisorId]);
    const mentorName = useMemo(() => getName(employee.mentorId), [userMap, employee.mentorId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h2 className="text-xl font-bold text-white">
                    Checklist Mutaba'ah - {selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
            </div>

            {/* Modern White Theme Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-gray-900 relative">

                {/* Visual Kop Surat (Matching PDF) */}
                <div className="mb-8 pt-2">
                    <div className="flex flex-col md:flex-row items-center justify-center relative mb-6 gap-4 md:gap-0 min-h-[80px]">
                        {/* Logo positioned appropriately */}
                        {hospital?.logo && (
                            <div className="md:absolute md:left-4 md:top-0">
                                <img
                                    src={hospital.logo}
                                    alt="Logo RS"
                                    className="h-24 w-auto object-contain"
                                />
                            </div>
                        )}

                        <div className="text-center flex flex-col items-center z-10">
                            <h1 className="text-2xl font-bold text-teal-700 tracking-wide uppercase">
                                {hospital?.name?.startsWith('RS ') ? hospital.name.replace('RS ', 'RUMAH SAKIT ') : (hospital?.name || 'RUMAH SAKIT ISLAM JAKARTA GROUP')}
                            </h1>
                            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                                {hospital?.address || 'Jl. Tipar Cakung No.5, RT.5/RW.5, Sukapura, Kec. Cilincing, Jkt Utara, Daerah Khusus Ibukota Jakarta 14140'}
                            </p>
                        </div>
                    </div>

                    {/* Garis Kop Double Line */}
                    <div className="border-t-4 border-black mb-1"></div>
                    <div className="border-t border-black mb-6"></div>

                    {/* Judul & Periode - Standard Document Style */}
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold text-black uppercase underline decoration-2 underline-offset-4">LEMBAR MUTABA'AH HARIAN KARYAWAN</h2>
                        <h3 className="text-sm font-semibold text-gray-900 mt-2 uppercase">PERIODE: {selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                    </div>

                    {/* Employee Info - Clean Plain Style (No Box) */}
                    <div className="px-4 mb-6 text-sm text-black">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1">
                            {/* Left Column */}
                            <div className="space-y-1">
                                <div className="grid grid-cols-[100px_10px_auto]">
                                    <span className="font-normal">Nama</span>
                                    <span className="text-center">:</span>
                                    <span className="font-bold uppercase">{employee.name}</span>
                                </div>
                                <div className="grid grid-cols-[100px_10px_auto]">
                                    <span className="font-normal">NIP</span>
                                    <span className="text-center">:</span>
                                    <span className="font-bold">{employee.id}</span>
                                </div>
                            </div>
                            {/* Right Column */}
                            <div className="space-y-1">
                                <div className="grid grid-cols-[100px_10px_auto]">
                                    <span className="font-normal">Unit Kerja</span>
                                    <span className="text-center">:</span>
                                    <span className="font-bold uppercase">{employee.unit}</span>
                                </div>
                                <div className="grid grid-cols-[100px_10px_auto]">
                                    <span className="font-normal">Bagian</span>
                                    <span className="text-center">:</span>
                                    <span className="font-bold uppercase">{employee.bagian}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Container - Remove vertical scroll to make it one long document page */}
                <div className="overflow-x-auto rounded-none border-t border-l border-r border-gray-400">
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full text-[10px] sm:text-xs border-collapse border-b border-gray-400">
                            <thead className="bg-gray-100 text-black border-b border-black">
                                <tr>
                                    <th className="p-2 border border-black font-bold text-center bg-gray-200">No</th>
                                    <th className="p-2 border border-black min-w-[180px] text-left font-bold bg-gray-200">Indikator Penilaian</th>
                                    {Array.from({ length: daysInMonth }, (_, i) => (
                                        <th key={i} className={`p-1 border border-black text-center min-w-[28px] font-semibold ${isCurrentMonthView && (i + 1) === today ? 'bg-amber-200 text-black' : 'bg-gray-200'}`}>
                                            {i + 1}
                                        </th>
                                    ))}
                                    <th className="p-2 border border-black text-center font-bold min-w-[60px] bg-gray-200">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {dailyActivitiesConfig.map((activity, index) => {
                                    let rowTotal = 0;
                                    return (
                                        <tr key={activity.id} className="hover:bg-gray-50 group transition-colors">
                                            <td className="p-2 border border-black text-center font-medium text-black">{index + 1}</td>
                                            <td className="p-2 border border-black font-medium text-black">{activity.title}</td>
                                            {Array.from({ length: daysInMonth }, (_, i) => {
                                                const dayKey = (i + 1).toString().padStart(2, '0');
                                                const progress = employee.monthlyActivities?.[monthKey]?.[dayKey];
                                                const val = (progress as any)?.[activity.id];
                                                const isDone = val === true || val === 'hadir';
                                                if (isDone) rowTotal++;
                                                return (
                                                    <td key={i} className={`p-1 border border-black text-center ${isCurrentMonthView && (i + 1) === today ? 'bg-amber-50' : ''}`}>
                                                        {isDone ? <span className="text-black font-bold text-base">✓</span> : <span className="text-transparent">-</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 border border-black text-center font-bold text-black text-base">
                                                {rowTotal}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend */}


                {/* Signature Section - Official Document Style */}
                <div className="mt-8 pt-4">

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-black">

                        {/* Ka. Unit */}
                        <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold uppercase mb-4 h-4">Kepala Unit</p>
                            <div className="h-20 w-full flex items-end justify-center mb-1">
                                {employee.kaUnitId && allUsersData[employee.kaUnitId]?.employee?.signature ? (
                                    <img src={allUsersData[employee.kaUnitId].employee.signature!} alt="TTD" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-full flex items-center justify-center">
                                        {/* Empty space for signature */}
                                    </div>
                                )}
                            </div>
                            <div className="w-full">
                                <p className="font-bold text-xs uppercase px-1 min-h-[16px]">
                                    {kaUnitName || (employee.kaUnitId ? '-' : 'Belum Diatur')}
                                </p>
                                <div className="border-t border-black w-full my-1"></div>
                                <p className="text-[10px]">NIP. {employee.kaUnitId || '-'}</p>
                            </div>
                        </div>

                        {/* Supervisor */}
                        <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold uppercase mb-4 h-4">Supervisor</p>
                            <div className="h-20 w-full flex items-end justify-center mb-1">
                                {employee.supervisorId && allUsersData[employee.supervisorId]?.employee?.signature ? (
                                    <img src={allUsersData[employee.supervisorId].employee.signature!} alt="TTD" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-full flex items-center justify-center"></div>
                                )}
                            </div>
                            <div className="w-full">
                                <p className="font-bold text-xs uppercase px-1 min-h-[16px]">
                                    {supervisorName || (employee.supervisorId ? '-' : 'Belum Diatur')}
                                </p>
                                <div className="border-t border-black w-full my-1"></div>
                                <p className="text-[10px]">NIP. {employee.supervisorId || '-'}</p>
                            </div>
                        </div>

                        {/* Mentor */}
                        <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold uppercase mb-4 h-4">Mentor</p>
                            <div className="h-20 w-full flex items-end justify-center mb-1">
                                {isMentorApproved && employee.mentorId && allUsersData[employee.mentorId]?.employee?.signature ? (
                                    <img src={allUsersData[employee.mentorId].employee.signature!} alt="TTD" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-full flex items-center justify-center"></div>
                                )}
                            </div>
                            <div className="w-full">
                                <p className="font-bold text-xs uppercase px-1 min-h-[16px]">
                                    {mentorName || (employee.mentorId ? '-' : 'Belum Diatur')}
                                </p>
                                <div className="border-t border-black w-full my-1"></div>
                                <p className="text-[10px]">NIP. {employee.mentorId || '-'}</p>
                            </div>
                        </div>

                        {/* Karyawan */}
                        <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold uppercase mb-4 h-4">Karyawan</p>
                            <div className="h-20 w-full flex items-end justify-center mb-1">
                                {employee.signature ? (
                                    <img src={employee.signature} alt="TTD" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-full flex items-center justify-center"></div>
                                )}
                            </div>
                            <div className="w-full">
                                <p className="font-bold text-xs uppercase px-1">
                                    {employee.name}
                                </p>
                                <div className="border-t border-black w-full my-1"></div>
                                <p className="text-[10px]">NIP. {employee.id}</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

    );
};

interface TranskripNilaiViewProps {
    employee: Employee;
    allUsersData: Record<string, { employee: Employee; attendance: Record<string, any>; history: Record<string, any>; }>;
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
    signatorySignature: string | null;
    hospital: Hospital | null;
    isDownloading: string | null;
    setIsDownloading: (val: string | null) => void;
}


const TranskripNilaiView: React.FC<TranskripNilaiViewProps> = ({ employee, allUsersData, selectedMonth, performanceData, ipForMonth, signatoryName, signatoryNip, signatoryTitle, signatorySignature, hospital, isDownloading, setIsDownloading }) => {

    const bossInfo = useMemo(() => {
        const getBossName = (id?: string) => {
            if (!id) return 'Belum Diatur';
            const strId = String(id).trim();
            // Try direct access first (if keyed by ID)
            if (allUsersData[strId]) return allUsersData[strId].employee.name;
            // Fallback: search in values
            const foundData = Object.values(allUsersData).find(d => String(d.employee?.id).trim() === strId);
            return foundData ? foundData.employee.name : 'Belum Diatur';
        };
        return {
            mentor: getBossName(employee.mentorId),
            kaUnit: getBossName(employee.kaUnitId),
            supervisor: getBossName(employee.supervisorId),
            manager: getBossName(employee.managerId)
        };
    }, [allUsersData, employee]);

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
                    disabled={isDownloading !== null}
                    onClick={async () => {
                        try {
                            setIsDownloading('transcript');
                            await generateTranscriptPdf(
                                employee,
                                performanceData,
                                ipForMonth,
                                selectedMonthLabel,
                                signatoryName,
                                signatoryNip,
                                signatoryTitle,
                                bossInfo.mentor,
                                hospital,
                                signatorySignature
                            );
                        } finally {
                            setIsDownloading(null);
                        }
                    }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isDownloading === 'transcript' ? 'bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                >
                    {isDownloading === 'transcript' ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Memproses...</span>
                        </>
                    ) : (
                        <>
                            <PdfIcon className="w-6 h-6" />
                            <span>Unduh Transkrip (PDF)</span>
                        </>
                    )}
                </button>
            </div>
            <div className="overflow-x-auto pb-8">
                <div className="bg-slate-50 p-6 sm:p-10 rounded shadow-2xl text-gray-800 min-w-[700px] mx-auto" id="transcript-content">
                    {/* Standard Letterhead (Kop Surat) Layout */}
                    <div className="flex items-start gap-4 pb-4 border-b-4 border-teal-600 mb-6">
                        {hospital?.logo && (
                            <div className="shrink-0 pt-2">
                                <NextImage src={hospital.logo} alt="Hospital Logo" width={80} height={80} className="h-20 w-auto" />
                            </div>
                        )}
                        <div className="flex-1 text-center">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-teal-800 leading-tight">RUMAH SAKIT ISLAM JAKARTA GROUP</h3>
                            {hospital?.name && hospital.name.toUpperCase() !== 'RUMAH SAKIT ISLAM JAKARTA GROUP' && (
                                <h4 className="text-lg sm:text-xl font-bold text-teal-600 mt-1">{hospital.name.toUpperCase()}</h4>
                            )}
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 italic">{hospital?.address || 'Alamat RS belum diatur di Manajemen RS'}</p>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div><strong className="font-medium text-gray-500 w-24 inline-block">Nama</strong>: {employee.name}</div>
                        <div><strong className="font-medium text-gray-500 w-24 inline-block">Unit Kerja</strong>: {employee.unit}</div>
                        <div><strong className="font-medium text-gray-500 w-24 inline-block">Nopeg</strong>: {employee.id}</div>
                        <div><strong className="font-medium text-gray-500 w-24 inline-block">Mentor</strong>: {bossInfo.mentor}</div>
                    </div>

                    <div className="mt-8 p-4 bg-slate-100 rounded-lg grid grid-cols-3 gap-4 text-center border border-slate-200">
                        <div>
                            <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">PERIODE</p>
                            <p className="text-xl font-bold text-teal-600">{selectedMonthLabel.toUpperCase()}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">INDEKS PRESTASI TAHUNAN (IPA)</p>
                            <p className="text-xl font-bold text-teal-600">{ipForMonth.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 tracking-wider uppercase">PREDIKAT</p>
                            <p className="text-lg font-bold text-teal-600">{getPredicate(ipForMonth)}</p>
                        </div>
                    </div>

                    {performanceData && performanceData.categories.length > 0 ? (
                        <div className="mt-8">
                            <h4 className="text-lg font-bold text-center tracking-widest text-gray-700 mb-4">TRANSKRIP NILAI APPI</h4>
                            <div className="">
                                <table className="min-w-full text-xs border-collapse border border-slate-300">
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
                        <div className="flex justify-between gap-12">
                            <div className="flex-1 text-center">
                                <p>{signatoryTitle},</p>
                                <div className="h-16 flex items-center justify-center">
                                    {signatorySignature && (
                                        <img src={signatorySignature} alt="Tanda Tangan Signatory" className="h-16 w-auto object-contain brightness-110" />
                                    )}
                                </div>
                                <p className="font-bold underline text-center" style={{ fontSize: signatoryName.length > 25 ? '11px' : '14px' }}>{signatoryName}</p>
                                <p>NIP. {signatoryNip}</p>
                            </div>
                            <div className="flex-1 text-center">
                                <p>Pegawai,</p>
                                <div className="h-16 flex items-center justify-center">
                                    {employee.signature && (
                                        <img src={employee.signature} alt="Tanda Tangan" className="h-16 w-auto object-contain brightness-110" />
                                    )}
                                </div>
                                <p className="font-bold underline text-center" style={{ fontSize: employee.name.length > 25 ? '11px' : '14px' }}>{employee.name}</p>
                                <p>NIP. {employee.id}</p>
                            </div>
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
    const [viewingTranscriptFor, setViewingTranscriptFor] = useState<number | null>(null); // Year number
    const [isDownloading, setIsDownloading] = useState<string | null>(null); // 'transcript' | 'checklist' | null
    const [submissions, setSubmissions] = useState<MonthlyReportSubmission[]>([]);

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (employee?.id) {
                const data = await getUserMonthlyReports(employee.id);
                setSubmissions(data || []);
            }
        };
        fetchSubmissions();
    }, [employee?.id]);

    // Helper to get formatted status
    const getStatusDisplay = (monthKey: string) => {
        const submission = submissions.find(s => s.monthKey === monthKey);
        const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const isCurrent = monthKey === currentMonthKey;

        if (!submission) {
            return isCurrent ? { label: 'Aktif', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' }
                : { label: 'Belum Lapor', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
        }

        switch (submission.status) {
            case 'approved':
                return { label: 'Disetujui', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
            case 'pending_mentor':
            case 'pending_supervisor':
            case 'pending_manager':
            case 'pending_kaunit':
                return { label: 'Menunggu Persetujuan', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
            default:
                if (submission.status.startsWith('rejected')) {
                    return { label: 'Ditolak', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
                }
                return { label: 'Terkirim', color: 'bg-blue-500/20 text-blue-300 border-blue-500/20' };
        }
    };

    // Helper to calculate yearly performance for a specific year
    const calculateYearlyPerformance = (year: number) => {
        const yearPrefix = `${year}-`;
        const now = new Date();
        const isCurrentYear = year === now.getFullYear();
        const maxMonthIdx = isCurrentYear ? (now.getMonth() + 1) : 12;

        const monthsToCalculate = Array.from({ length: maxMonthIdx }, (_, i) =>
            `${year}-${(i + 1).toString().padStart(2, '0')}`
        );

        if (monthsToCalculate.length === 0) return { categories: [], ipResult: 0 };

        const categoriesRaw: Record<string, {
            name: string;
            details: Record<string, { title: string; yearlyTarget: number; yearlyAchieved: number }>;
        }> = {};

        monthsToCalculate.forEach((mKey: string) => {
            const mProgress = employee.monthlyActivities?.[mKey] || {};
            const monthlyReports = (employee as any)._monthlyReportsDataCache?.[mKey] || {};

            dailyActivitiesConfig.forEach(act => {
                if (!categoriesRaw[act.category]) {
                    categoriesRaw[act.category] = { name: act.category, details: {} };
                }
                if (!categoriesRaw[act.category].details[act.id]) {
                    categoriesRaw[act.category].details[act.id] = { title: act.title, yearlyTarget: 0, yearlyAchieved: 0 };
                }

                // 🔥 FIX: Target Tahunan selalu dihitung untuk 12 bulan penuh (Jan-Des)
                categoriesRaw[act.category].details[act.id].yearlyTarget = act.monthlyTarget * 12;

                const submission = submissions.find(s => s.monthKey === mKey);
                const isApproved = submission?.status === 'approved';

                if (isApproved) {
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
                }
            });
        });

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
    };


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

                // 🔥 FIX: Target Tahunan selalu dihitung untuk 12 bulan penuh (Jan-Des)
                categoriesRaw[act.category].details[act.id].yearlyTarget = act.monthlyTarget * 12;

                // Hitung capaian di bulan ini (gabungan base progress + cached reports)
                // 🔥 STRICT CHECK: Hanya hitung capaian jika status laporan bulan tersebut 'approved'
                const submission = submissions.find(s => s.monthKey === mKey);
                // Jika bulan ini aktif (belum selesai), anggap valid untuk sementara (atau mau 0 juga?)
                // User Request: "user bisa melihat dampaknya di Transkrip Nilai ketika tidak submite tugas"
                // Maka: Jika tidak approved, score = 0.
                const isApproved = submission?.status === 'approved';

                if (isApproved) {
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
                } else {
                    // Jika belum approved, achieved tetap 0, tapi target bertambah -> Nilai turun.
                }
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
    }, [employee, dailyActivitiesConfig, selectedMonth, submissions]);

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
        const dirut = allUsersList.find(u => u.canBeDirut);

        if (dirut) {
            return { signatory: { name: dirut.name, nip: dirut.id, title: 'Direktur Utama', signature: dirut.signature } };
        }
        return { signatory: { name: '.........................', nip: '.........................', title: 'Direktur Utama', signature: null } };
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

    const availableYears = useMemo(() => {
        // Extract unique years from availableMonths
        const years = availableMonths.map(monthKey => parseInt(monthKey.split('-')[0]));
        const uniqueYears = Array.from(new Set(years));
        // Sort descending (newest first)
        return uniqueYears.sort((a, b) => b - a);
    }, [availableMonths]);

    const currentMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    if (viewingChecklistFor) {
        const mKey = `${viewingChecklistFor.getFullYear()}-${String(viewingChecklistFor.getMonth() + 1).padStart(2, '0')}`;
        const sub = submissions.find(s => s.monthKey === mKey);
        // Mentor Approved if status is NOT pending_mentor (assuming it has moved forward) AND not rejected by mentor
        const isMentorApproved = !!sub && sub.status !== 'pending_mentor' && !sub.status.startsWith('rejected_mentor');

        return <CeklisMutabaahView employee={employee} dailyActivitiesConfig={dailyActivitiesConfig} selectedMonth={viewingChecklistFor} allUsersData={allUsersData} onBack={() => setViewingChecklistFor(null)} hospital={hospital} isMentorApproved={isMentorApproved} />;
    }

    if (viewingTranscriptFor) {
        // Show detailed transcript view for specific year
        const yearDate = new Date(viewingTranscriptFor, 0, 1); // January 1st of the year
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setViewingTranscriptFor(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-semibold"
                >
                    <span>←</span>
                    <span>Kembali ke Daftar Transkrip</span>
                </button>
                <TranskripNilaiView
                    employee={employee}
                    allUsersData={allUsersData}
                    selectedMonth={yearDate}
                    performanceData={yearlyPerformanceData}
                    ipForMonth={yearlyPerformanceData.ipResult}
                    signatoryName={signatory.name}
                    signatoryNip={signatory.nip}
                    signatoryTitle={signatory.title}
                    signatorySignature={signatory.signature || null}
                    hospital={hospital}
                    isDownloading={isDownloading}
                    setIsDownloading={setIsDownloading}
                />
            </div>
        );
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
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Status Laporan</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Status Aktivitas</th>
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
                                                {/* Status Laporan - Approval Status */}
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const status = getStatusDisplay(monthKey);
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm ${status.color}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${status.label === 'Disetujui' ? 'bg-green-400' : status.label === 'Menunggu Persetujuan' ? 'bg-yellow-400 animate-pulse' : status.label === 'Ditolak' ? 'bg-red-400' : 'bg-current opacity-50'}`}></div>
                                                                {status.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                {/* Status Aktivitas - Current/Completed */}
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
                                                        <button
                                                            disabled={isDownloading !== null}
                                                            onClick={async () => {
                                                                try {
                                                                    setIsDownloading(`checklist-${monthKey}`);
                                                                    const sub = submissions.find(s => s.monthKey === monthKey);
                                                                    const isMentorApproved = !!sub && sub.status !== 'pending_mentor' && !sub.status.startsWith('rejected_mentor');
                                                                    await generateChecklistPdf(employee, dailyActivitiesConfig, monthDate, allUsersData, hospital, isMentorApproved);
                                                                } finally {
                                                                    setIsDownloading(null);
                                                                }
                                                            }}
                                                            className={`p-2 rounded-full transition-all disabled:opacity-50
                                                              ${isDownloading === `checklist-${monthKey}` ? 'text-gray-400' : 'text-red-400 hover:text-red-300 hover:bg-white/10'}`}
                                                            title="Unduh PDF"
                                                        >
                                                            {isDownloading === `checklist-${monthKey}` ? (
                                                                <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                                                            ) : (
                                                                <PdfIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {availableMonths.length === 0 && (
                                        <tr><td colSpan={7} className="text-center p-8 text-blue-200">Tidak ada data mutabaah yang tersedia.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'transkrip' && (
                    <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
                        <div className="overflow-x-auto rounded-lg border border-white/20">
                            <table className="min-w-full text-sm text-left text-white">
                                <thead className="bg-white/10 text-xs uppercase text-blue-200">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">No</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Deskripsi</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">Tahun</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap text-center">IPK</th>
                                        <th scope="col" className="px-4 py-3 whitespace-nowrap text-center">Predikat</th>
                                        <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableYears.map((year, index) => {
                                        // Calculate IPK for this year
                                        const yearPerformance = calculateYearlyPerformance(year);
                                        const ipk = yearPerformance.ipResult;
                                        const predicate = getPredicate(ipk);

                                        return (
                                            <tr key={year} className="border-b border-gray-700 hover:bg-white/5">
                                                <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">Transkrip Nilai Karyawan</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{year}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${ipk >= 3.5 ? 'bg-green-500/20 text-green-300' :
                                                        ipk >= 3.0 ? 'bg-blue-500/20 text-blue-300' :
                                                            ipk >= 2.5 ? 'bg-yellow-500/20 text-yellow-300' :
                                                                'bg-red-500/20 text-red-300'
                                                        }`}>
                                                        {ipk.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${predicate === 'Dengan Pujian' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                        predicate === 'Sangat Memuaskan' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            predicate === 'Memuaskan' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                                'bg-red-500/20 text-red-400 border-red-500/30'
                                                        }`}>
                                                        {predicate}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setViewingTranscriptFor(year)}
                                                            className="p-2 text-blue-300 hover:text-white rounded-full hover:bg-white/10"
                                                            title="Lihat Transkrip"
                                                        >
                                                            <DocumentTextIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            disabled={isDownloading !== null}
                                                            onClick={async () => {
                                                                try {
                                                                    setIsDownloading(`transcript-${year}`);
                                                                    const yearDate = new Date(year, 0, 1);
                                                                    const selectedMonthLabel = `Tahun ${year} (Jan - Des)`;
                                                                    const mentorData = allUsersData[employee.mentorId || '']?.employee;
                                                                    const mentorName = mentorData?.name || '-';
                                                                    await generateTranscriptPdf(
                                                                        employee,
                                                                        yearPerformance,
                                                                        ipk,
                                                                        selectedMonthLabel,
                                                                        signatory.name,
                                                                        signatory.nip,
                                                                        signatory.title,
                                                                        mentorName,
                                                                        hospital,
                                                                        signatory.signature || null
                                                                    );
                                                                } finally {
                                                                    setIsDownloading(null);
                                                                }
                                                            }}
                                                            className={`p-2 rounded-full transition-all disabled:opacity-50
                                                              ${isDownloading === `transcript-${year}` ? 'text-gray-400' : 'text-red-400 hover:text-red-300 hover:bg-white/10'}`}
                                                            title="Unduh PDF"
                                                        >
                                                            {isDownloading === `transcript-${year}` ? (
                                                                <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                                                            ) : (
                                                                <PdfIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {availableYears.length === 0 && (
                                        <tr><td colSpan={6} className="text-center p-8 text-blue-200">Tidak ada data transkrip yang tersedia.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RapotView;