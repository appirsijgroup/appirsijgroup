

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type UserOptions } from 'jspdf-autotable';

export interface TableConfig extends UserOptions {}

// Definisi untuk satu bagian laporan
export interface ReportSection {
    title: string;
    subtitle: string;
    tables: TableConfig[];
    postTableHook?: (doc: jsPDF, lastAutoTable: { finalY: number }) => void;
    orientation?: 'portrait' | 'landscape';
    pageFormat?: string | number[];
    subtitleAlign?: 'left' | 'center' | 'right';
}

export const generateOfficialPdf = (
    sections: ReportSection[],
    fileName: string,
    outputType: 'save' | 'datauristring' = 'save',
    creatorName?: string,
    logoBase64?: string | null
): string | void => {
    if (sections.length === 0) return;

    const firstSection = sections[0];
    const doc = new jsPDF({
        orientation: firstSection.orientation || 'portrait',
        format: firstSection.pageFormat || 'a4',
    });

    const pageMargin = 14;

    sections.forEach((section, index) => {
        if (index > 0) {
            doc.addPage(section.pageFormat || 'a4', section.orientation || 'portrait');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        
        // The logo logic was removed to prevent potential CORS errors when fetching from an external URL.
        // The header is now text-only and centered for reliability.
        const headerTextX = pageWidth / 2;
        const headerStartY = 20;

        // 1. Add Header Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('APPI - APLIKASI PERILAKU PELAYANAN ISLAMI', headerTextX, headerStartY, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Rumah Sakit Islam Group', headerTextX, headerStartY + 7, { align: 'center' });

        // 2. Add Line
        const lineY = headerStartY + 12;
        doc.setLineWidth(0.5);
        doc.line(pageMargin, lineY, pageWidth - pageMargin, lineY);
        
        // 3. Add Report Title & Subtitle for the current section
        const titleStartY = lineY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        // Convert title to uppercase
        doc.text(section.title.toUpperCase(), pageWidth / 2, titleStartY, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const splitSubtitle = doc.splitTextToSize(section.subtitle, pageWidth - (pageMargin * 2));
        const subtitleY = titleStartY + 8;
        const subtitleAlign = section.subtitleAlign || 'left';
        const subtitleX = subtitleAlign === 'center' ? pageWidth / 2 : (subtitleAlign === 'right' ? pageWidth - pageMargin : pageMargin);
        
        doc.text(splitSubtitle, subtitleX, subtitleY, { align: subtitleAlign });
        const subtitleHeight = doc.getTextDimensions(splitSubtitle).h;

        // 4. Add Table(s) for the current section
        let cursorY = subtitleY + subtitleHeight + 5;

        section.tables.forEach(tableConfig => {
            autoTable(doc, {
                ...tableConfig,
                startY: cursorY,
                margin: { left: pageMargin, right: pageMargin }
            });
            cursorY = (doc as any).lastAutoTable.finalY + 10;
        });
        
        // Call the post-table hook if it exists for this section
        if (section.postTableHook) {
            // The cursorY has an extra 10px padding, remove it for the hook
            const lastAutoTable = { finalY: cursorY - 10 };
            section.postTableHook(doc, lastAutoTable);
        }

        // 5. Add Footer / Signature only on the last page if creatorName is provided
        if (creatorName && index === sections.length - 1) {
            let signatureY = (doc as any).lastAutoTable.finalY + 20;
            const pageHeight = doc.internal.pageSize.getHeight();

            if (signatureY > pageHeight - 40) {
                doc.addPage(section.pageFormat || 'a4', section.orientation || 'portrait');
                signatureY = 20;
            }

            const today = new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const signatureX = pageWidth - pageMargin;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            doc.text(`Jakarta, ${today}`, signatureX, signatureY, { align: 'right' });
            signatureY += 7;
            doc.text('Petugas APPI', signatureX, signatureY, { align: 'right' });

            signatureY += 20;

            doc.setFont('helvetica', 'bold');
            doc.text(creatorName, signatureX, signatureY, { align: 'right' });
            doc.setLineWidth(0.2);
            const creatorNameWidth = doc.getTextWidth(creatorName);
            doc.line(signatureX - creatorNameWidth, signatureY + 1, signatureX, signatureY + 1);
        }
    });

    // 6. Output PDF
    if (outputType === 'datauristring') {
        return doc.output('datauristring');
    } else {
        doc.save(fileName);
    }
};