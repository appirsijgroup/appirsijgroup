import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, ShareIcon, DownloadIcon } from './Icons';
import { type Ayah, type SurahDetail, DailyPrayer } from '../types';
import { useUIStore } from '../store/store';

// Temporarily define Quote directly here to resolve module resolution error
interface Quote {
    text: string;
    author: string;
}

interface ShareImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialImageUrl?: string; // New optional prop for pre-generated images
    type?: 'quran' | 'quote' | 'doa' | null; // Made optional if initialImageUrl is provided
    content?: { ayah: Ayah; surah: SurahDetail } | Quote | DailyPrayer | null; // Made optional if initialImageUrl is provided
}

// Helper function to calculate the height and line breaks for a given text
const getTextLinesAndHeight = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    lineHeight: number
): { height: number; lines: string[] } => {
    if (!text) return { height: 0, lines: [] };
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    return { height: lines.length * lineHeight, lines };
};

// Helper function to draw wrapped text and return the Y position after drawing
const wrapText = (
    context: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    y: number,
    lineHeight: number
): number => {
    let currentY = y;
    for (const line of lines) {
        context.fillText(line, x, currentY);
        currentY += lineHeight;
    }
    return currentY;
};

// Helper function to load an image
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

// Finds optimal font sizes for Quran quotes to fit within a given area
const findOptimalQuranFontSizes = (
    ctx: CanvasRenderingContext2D,
    ayah: Ayah,
    surah: SurahDetail,
    containerWidth: number,
    containerHeight: number,
    initialArabicSize: number = 90,
    minArabicSize: number = 40
) => {
    let arabicSize = initialArabicSize;
    const panelInternalPadding = 40;
    const panelContentWidth = containerWidth - (panelInternalPadding * 2);
    const marginBetweenPanels = 30;
    const translationText = ayah.teksIndonesia.replace(/^"|"$/g, '').trim();
    const surahInfoText = `QS. ${surah.namaLatin} [${surah.nomor}:${ayah.nomorAyat}]`;

    while (arabicSize >= minArabicSize) {
        let translationSize = arabicSize * 0.45 < 24 ? 24 : arabicSize * 0.45;
        let surahInfoSize = translationSize * 0.9 < 22 ? 22 : translationSize * 0.9;

        ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
        const { height: arabicTextHeight } = getTextLinesAndHeight(ctx, ayah.teksArab, panelContentWidth, arabicSize * 1.4);
        const panel1Height = arabicTextHeight + (panelInternalPadding * 2);

        ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
        const { height: translationTextHeight } = getTextLinesAndHeight(ctx, translationText, panelContentWidth, translationSize * 1.5);

        ctx.font = `700 ${surahInfoSize}px "Inter", sans-serif`;
        const { height: surahInfoTextHeight } = getTextLinesAndHeight(ctx, surahInfoText, panelContentWidth, surahInfoSize * 1.2);

        const panel2Height = translationTextHeight + 25 + surahInfoTextHeight + (panelInternalPadding * 2);
        const totalContentHeight = panel1Height + marginBetweenPanels + panel2Height;

        if (totalContentHeight <= containerHeight) {
            return { arabicSize, translationSize, surahInfoSize };
        }
        arabicSize -= 2;
    }
    return {
        arabicSize: minArabicSize,
        translationSize: minArabicSize * 0.45 < 24 ? 24 : minArabicSize * 0.45,
        surahInfoSize: (minArabicSize * 0.45 < 24 ? 24 : minArabicSize * 0.45) * 0.9 < 22 ? 22 : (minArabicSize * 0.45 < 24 ? 24 : minArabicSize * 0.45) * 0.9,
    };
};

// Finds optimal font sizes for prayers to fit within a given area
const findOptimalDoaFontSizes = (
    ctx: CanvasRenderingContext2D,
    doa: DailyPrayer,
    maxWidth: number,
    maxHeight: number
) => {
    let arabicSize = 90; // Slightly smaller initial size
    const minArabicSize = 35;
    const PADDING_BETWEEN_SECTIONS = 60; // Increased for aesthetics

    while (arabicSize >= minArabicSize) {
        const titleSize = 52;
        const latinSize = Math.max(24, arabicSize * 0.45);
        const translationSize = Math.max(26, arabicSize * 0.40);

        const titleLineHeight = titleSize * 1.3;
        const arabicLineHeight = arabicSize * 1.6; // More breathing room for Arabic
        const latinLineHeight = latinSize * 1.4;
        const translationLineHeight = translationSize * 1.5;

        ctx.font = `600 ${titleSize}px "Inter", sans-serif`;
        const { height: titleHeight } = getTextLinesAndHeight(ctx, doa.title, maxWidth, titleLineHeight);

        ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
        const { height: arabicHeight } = getTextLinesAndHeight(ctx, doa.arabic, maxWidth, arabicLineHeight);

        ctx.font = `italic 400 ${latinSize}px "Inter", sans-serif`;
        const { height: latinHeight } = getTextLinesAndHeight(ctx, doa.latin, maxWidth, latinLineHeight);

        const translationText = `Artinya: "${doa.translation}"`;
        ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
        const { height: translationHeight } = getTextLinesAndHeight(ctx, translationText, maxWidth, translationLineHeight);

        // Calculate total block height
        const totalHeight = titleHeight + 40 + arabicHeight + PADDING_BETWEEN_SECTIONS + latinHeight + PADDING_BETWEEN_SECTIONS + translationHeight;

        if (totalHeight <= maxHeight) {
            return { arabicSize, latinSize, translationSize, titleSize, totalHeight };
        }
        arabicSize -= 2;
    }

    // Fallback
    const lastArabicSize = minArabicSize;
    return {
        arabicSize: lastArabicSize,
        latinSize: Math.max(24, lastArabicSize * 0.45),
        translationSize: Math.max(26, lastArabicSize * 0.40),
        titleSize: 42, // Smaller fallback title
        totalHeight: maxHeight // Cap it
    };
};

const findOptimalQuoteFontSize = (
    ctx: CanvasRenderingContext2D,
    quoteText: string,
    authorText: string,
    maxWidth: number,
    maxHeight: number
) => {
    let quoteSize = 80;
    const minQuoteSize = 30;
    const SEPARATOR_HEIGHT = 20;
    const AUTHOR_MARGIN_TOP = 25;

    while (quoteSize >= minQuoteSize) {
        const authorSize = Math.max(28, quoteSize * 0.5);
        const quoteLineHeight = quoteSize * 1.4;
        const authorLineHeight = authorSize * 1.2;

        ctx.font = `700 ${quoteSize}px "Playfair Display", serif`;
        const { height: quoteHeight } = getTextLinesAndHeight(ctx, quoteText, maxWidth, quoteLineHeight);

        ctx.font = `500 ${authorSize}px "Inter", sans-serif`;
        const { height: authorHeight } = getTextLinesAndHeight(ctx, authorText, maxWidth, authorLineHeight);

        const totalHeight = quoteHeight + SEPARATOR_HEIGHT + AUTHOR_MARGIN_TOP + authorHeight;

        if (totalHeight <= maxHeight) {
            return { quoteSize, authorSize };
        }
        quoteSize -= 2;
    }

    return { quoteSize: minQuoteSize, authorSize: Math.max(28, minQuoteSize * 0.5) };
};

const drawPattern = (ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;
    const size = 150;
    for (let x = -size; x < W + size; x += size) {
        for (let y = -size; y < H + size; y += size) {
            ctx.beginPath();
            ctx.moveTo(x + size * 0.25, y);
            ctx.lineTo(x + size * 0.75, y);
            ctx.lineTo(x + size, y + size * 0.25);
            ctx.lineTo(x + size, y + size * 0.75);
            ctx.lineTo(x + size * 0.75, y + size);
            ctx.lineTo(x + size * 0.25, y + size);
            ctx.lineTo(x, y + size * 0.75);
            ctx.lineTo(x, y + size * 0.25);
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();
};

const ShareImageModal: React.FC<ShareImageModalProps> = ({ isOpen, onClose, initialImageUrl, type, content }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageSrc, setImageSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [canShare, setCanShare] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('2/3');
    const { addToast } = useUIStore();

    useEffect(() => {
        if (typeof navigator.share !== 'undefined') {
            setCanShare(true);
        }
    }, []);

    const drawImage = useCallback(async () => {
        if (initialImageUrl) {
            setImageSrc(initialImageUrl);
            setIsLoading(false);
            setAspectRatio('auto'); // Adjust aspect ratio for pre-made images
            return;
        }

        if (!content || !canvasRef.current) {
            setIsLoading(false);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = 1080;
        const PADDING = 80;

        // --- Dynamic Height Calculation based on content ---
        const FOOTER_HEIGHT = 120;
        const FOOTER_MARGIN_TOP = 40;
        const FOOTER_LINE_MARGIN = 20;

        const titleY = PADDING + 30;
        const lineY = titleY + 30;
        const HEADER_HEIGHT = lineY + 40;
        const headerBottomY = lineY + 40;

        const contentAreaWidth = W - PADDING * 2;

        let calculatedContentHeight = 0;

        if (type === 'quran' && content && 'ayah' in content) {
            const { ayah, surah } = content as { ayah: Ayah; surah: SurahDetail };
            const translation = ayah.teksIndonesia.replace(/^"|"$/g, '').trim();

            const panelInternalPadding = 40;
            const panelContentWidth = contentAreaWidth - (panelInternalPadding * 2);
            const marginBetweenPanels = 30;

            // Calculate heights with fixed good font sizes
            const arabicSize = 80;
            const translationSize = 36;
            const surahInfoSize = 32;

            ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
            const { height: arabicTextHeight } = getTextLinesAndHeight(ctx, ayah.teksArab, panelContentWidth, arabicSize * 1.4);
            const panel1Height = arabicTextHeight + (panelInternalPadding * 2);

            ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
            const { height: translationTextHeight } = getTextLinesAndHeight(ctx, translation, panelContentWidth, translationSize * 1.5);

            ctx.font = `700 ${surahInfoSize}px "Inter", sans-serif`;
            const { height: surahInfoTextHeight } = getTextLinesAndHeight(ctx, `QS. ${surah.namaLatin} [${surah.nomor}:${ayah.nomorAyat}]`, panelContentWidth, surahInfoSize * 1.2);

            const panel2Height = translationTextHeight + 25 + surahInfoTextHeight + (panelInternalPadding * 2);
            calculatedContentHeight = panel1Height + marginBetweenPanels + panel2Height;

        } else if (type === 'doa' && content && 'arabic' in content) {
            const doa = content as DailyPrayer;

            // Available height for EVERYTHING between header and footer
            const maxAvailableH = 1500; // Aiming for roughly this height if possible
            const { totalHeight } = findOptimalDoaFontSizes(ctx, doa, contentAreaWidth, maxAvailableH);
            calculatedContentHeight = totalHeight;

        } else if (type === 'quote') {
            const quote = content as Quote;
            // Check if quote exists and has content before processing
            if (quote && quote.text && quote.author) {
                const quoteText = quote.text.replace(/^"|"$/g, '').trim();
                const authorText = `— ${quote.author}`;

                const quoteSize = 70;
                const authorSize = 35;
                const SEPARATOR_HEIGHT = 20;
                const AUTHOR_MARGIN_TOP = 25;

                ctx.font = `700 ${quoteSize}px "Playfair Display", serif`;
                const { height: quoteHeight } = getTextLinesAndHeight(ctx, quoteText, contentAreaWidth, quoteSize * 1.4);

                ctx.font = `500 ${authorSize}px "Inter", sans-serif`;
                const { height: authorHeight } = getTextLinesAndHeight(ctx, authorText, contentAreaWidth, authorSize * 1.2);

                calculatedContentHeight = quoteHeight + SEPARATOR_HEIGHT + AUTHOR_MARGIN_TOP + authorHeight;
            } else {
                // If no quote content, set minimal height
                calculatedContentHeight = 0;
            }
        }

        // Calculate total height with margins
        const totalContentHeight = HEADER_HEIGHT + 40 + calculatedContentHeight + FOOTER_MARGIN_TOP + FOOTER_LINE_MARGIN + FOOTER_HEIGHT + PADDING;
        const H = Math.max(1200, Math.min(2500, totalContentHeight)); // Min 1200px, Max 2500px for social media


        // Calculate aspect ratio for preview
        const aspectRatio = `${W}/${H}`;
        setAspectRatio(aspectRatio);

        canvas.width = W;
        canvas.height = H;
        const contentWidth = W - PADDING * 2;

        const gradient = ctx.createLinearGradient(0, H, W, 0);
        if (type === 'doa') {
            gradient.addColorStop(0, '#0c4a6e');
            gradient.addColorStop(1, '#1e293b');
        } else if (type === 'quote') {
            const quoteGradient = ctx.createLinearGradient(W / 2, 0, W / 2, H);
            quoteGradient.addColorStop(0, '#1f2937');
            quoteGradient.addColorStop(1, '#111827');
            ctx.fillStyle = quoteGradient;
        } else {
            gradient.addColorStop(0, '#0f172a');
            gradient.addColorStop(0.5, '#1e293b');
            gradient.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = gradient;
        }

        if (type !== 'quote') {
            ctx.fillStyle = gradient;
        }
        ctx.fillRect(0, 0, W, H);
        drawPattern(ctx, W, H, 'rgba(255, 255, 255, 0.04)', 0.5);

        ctx.textAlign = 'center';
        ctx.font = '700 48px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.letterSpacing = '2px';

        let title = "GAMBAR BAGIKAN";
        if (type === 'quote') title = "QUOTE HARI INI";
        else if (type === 'quran') title = "MUTIARA AL-QUR'AN";
        else if (type === 'doa') title = "DOA HARIAN";

        ctx.fillText(title, W / 2, titleY);

        const lineMargin = W / 4;
        const gradientLine = ctx.createLinearGradient(lineMargin, lineY, W - lineMargin, lineY);
        gradientLine.addColorStop(0, 'rgba(14, 165, 233, 0)');
        gradientLine.addColorStop(0.5, 'rgba(20, 184, 166, 1)');
        gradientLine.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lineMargin, lineY);
        ctx.lineTo(W - lineMargin, lineY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = gradientLine;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();

        const footerTopYVal = H - PADDING;

        if (type === 'quran' && 'ayah' in content) {
            const { ayah, surah } = content as { ayah: Ayah; surah: SurahDetail };
            const translation = ayah.teksIndonesia.replace(/^"|"$/g, '').trim();
            const surahInfoText = `QS. ${surah.namaLatin} [${surah.nomor}:${ayah.nomorAyat}]`;

            const panelX = PADDING;
            const panelWidth = contentWidth;
            const panelInternalPadding = 40;
            const panelContentWidth = panelWidth - (panelInternalPadding * 2);
            const marginBetweenPanels = 30;

            // Use the same font sizes as calculated above
            const arabicSize = 80;
            const translationSize = 36;
            const surahInfoSize = 32;

            ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
            const { height: arabicTextHeight, lines: arabicLines } = getTextLinesAndHeight(ctx, ayah.teksArab, panelContentWidth, arabicSize * 1.4);
            const panel1Height = arabicTextHeight + (panelInternalPadding * 2);

            ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
            const { height: translationTextHeight, lines: translationLines } = getTextLinesAndHeight(ctx, translation, panelContentWidth, translationSize * 1.5);

            ctx.font = `700 ${surahInfoSize}px "Inter", sans-serif`;
            const { height: surahInfoTextHeight, lines: surahInfoLines } = getTextLinesAndHeight(ctx, surahInfoText, panelContentWidth, surahInfoSize * 1.2);

            const panel2Height = translationTextHeight + 25 + surahInfoTextHeight + (panelInternalPadding * 2);
            const totalContentHeight = panel1Height + marginBetweenPanels + panel2Height;
            const startY = headerBottomY + 40 + ((H - PADDING - FOOTER_MARGIN_TOP - FOOTER_LINE_MARGIN - FOOTER_HEIGHT) - headerBottomY - 40 - totalContentHeight) / 2;

            // Draw Panel 1 (Arabic)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.roundRect(panelX, startY, panelWidth, panel1Height, [20]);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            wrapText(ctx, arabicLines, W / 2, startY + panelInternalPadding + arabicSize * 1.4 * 0.8, arabicSize * 1.4);

            // Draw Panel 2 (Translation + Surah Info)
            const panel2Y = startY + panel1Height + marginBetweenPanels;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.roundRect(panelX, panel2Y, panelWidth, panel2Height, [20]);
            ctx.fill();

            let currentYPanel2 = panel2Y + panelInternalPadding + translationSize * 1.5 * 0.8;
            ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            currentYPanel2 = wrapText(ctx, translationLines, W / 2, currentYPanel2, translationSize * 1.5);
            currentYPanel2 += 25;

            ctx.font = `700 ${surahInfoSize}px "Inter", sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            wrapText(ctx, surahInfoLines, W / 2, currentYPanel2, surahInfoSize * 1.2);

        } else if (type === 'quote') {
            const quote = content as Quote;
            const quoteText = quote.text.replace(/^"|"$/g, '').trim();
            const authorText = `— ${quote.author}`;

            const quoteSize = 70;
            const authorSize = 35;
            const SEPARATOR_HEIGHT = 20;
            const AUTHOR_MARGIN_TOP = 25;

            ctx.font = '700 400px "Playfair Display", serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.textAlign = 'left';
            ctx.fillText('"', PADDING, headerBottomY + 250);
            ctx.textAlign = 'right';
            ctx.fillText('"', W - PADDING, H - PADDING - 100);
            ctx.textAlign = 'center';

            const contentYCenter = headerBottomY + 40 + ((H - PADDING - FOOTER_MARGIN_TOP - FOOTER_LINE_MARGIN - FOOTER_HEIGHT) - headerBottomY - 40) / 2;

            ctx.font = `700 ${quoteSize}px "Playfair Display", serif`;
            const { height: quoteTextHeight, lines: quoteLines } = getTextLinesAndHeight(ctx, quoteText, contentWidth, quoteSize * 1.4);

            ctx.font = `500 ${authorSize}px "Inter", sans-serif`;
            const { height: authorTextHeight, lines: authorLines } = getTextLinesAndHeight(ctx, authorText, contentWidth, authorSize * 1.2);

            const totalTextHeight = quoteTextHeight + SEPARATOR_HEIGHT + AUTHOR_MARGIN_TOP + authorTextHeight;
            const textBlockStartY = contentYCenter - (totalTextHeight / 2);

            // Draw Quote
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#e5e7eb';
            ctx.font = `700 ${quoteSize}px "Playfair Display", serif`;
            let currentY = wrapText(ctx, quoteLines, W / 2, textBlockStartY, quoteSize * 1.4);

            // Draw Separator
            currentY += SEPARATOR_HEIGHT;
            ctx.beginPath();
            ctx.moveTo(W / 2 - 50, currentY);
            ctx.lineTo(W / 2 + 50, currentY);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#f59e0b';
            ctx.stroke();

            // Draw Author
            currentY += AUTHOR_MARGIN_TOP;
            ctx.font = `500 ${authorSize}px "Inter", sans-serif`;
            ctx.fillStyle = '#f59e0b';
            wrapText(ctx, authorLines, W / 2, currentY, authorSize * 1.2);

        } else if (type === 'doa' && 'arabic' in content) {
            const doa = content as DailyPrayer;
            ctx.textBaseline = 'top';

            const availableContentStartY = headerBottomY + 40;
            const availableContentEndY = H - PADDING - FOOTER_MARGIN_TOP - FOOTER_LINE_MARGIN - FOOTER_HEIGHT;
            const availableContentAreaHeight = availableContentEndY - availableContentStartY;

            // Find optimal sizes based on finalized canvas height
            const { arabicSize, latinSize, translationSize, titleSize, totalHeight } = findOptimalDoaFontSizes(
                ctx, doa, contentWidth, availableContentAreaHeight - 60
            );

            const PADDING_SECTION_GAP = 60; // Consistent with findOptimalDoaFontSizes

            // Center the entire block (Title + Content)
            let currentY = availableContentStartY + (availableContentAreaHeight - totalHeight) / 2;

            // 1. Draw Title
            ctx.font = `600 ${titleSize}px "Inter", sans-serif`;
            ctx.fillStyle = '#67e8f9';
            const { height: titleHeight, lines: titleLines } = getTextLinesAndHeight(ctx, doa.title, contentWidth, titleSize * 1.3);
            currentY = wrapText(ctx, titleLines, W / 2, currentY, titleSize * 1.3);

            currentY += 40; // Gap between title and arabic

            // 2. Draw Arabic
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = `700 ${arabicSize}px "Noto Naskh Arabic", serif`;
            const { height: arabicHeight, lines: arabicLines } = getTextLinesAndHeight(ctx, doa.arabic, contentWidth, arabicSize * 1.6);
            currentY = wrapText(ctx, arabicLines, W / 2, currentY, arabicSize * 1.6);

            currentY += PADDING_SECTION_GAP;

            // 3. Draw Latin
            ctx.fillStyle = 'rgba(155, 236, 224, 0.8)';
            ctx.font = `italic 400 ${latinSize}px "Inter", sans-serif`;
            const { height: latinHeight, lines: latinLines } = getTextLinesAndHeight(ctx, doa.latin, contentWidth, latinSize * 1.4);
            currentY = wrapText(ctx, latinLines, W / 2, currentY, latinSize * 1.4);

            currentY += PADDING_SECTION_GAP;

            // 4. Draw Translation
            const translationText = `Artinya: "${doa.translation}"`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = `400 ${translationSize}px "Inter", sans-serif`;
            const { lines: translationLines } = getTextLinesAndHeight(ctx, translationText, contentWidth, translationSize * 1.5);
            wrapText(ctx, translationLines, W / 2, currentY, translationSize * 1.5);
        }

        // Separator line above footer
        const footerLineY = footerTopYVal - 20;
        ctx.beginPath();
        ctx.moveTo(PADDING, footerLineY);
        ctx.lineTo(W - PADDING, footerLineY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // --- Logo in Footer ---
        try {
            const logo = await loadImage('/logorsijsp.png');
            const logoH = 60;
            const logoW = (logo.width / logo.height) * logoH;
            const footerCenterY = footerLineY + (H - footerLineY) / 2;

            // Draw logo and text side by side
            const totalFooterWidth = logoW + 20 + ctx.measureText('APPI | RSIJ Sukapura').width;
            const startX = (W - totalFooterWidth) / 2;

            ctx.drawImage(logo, startX, footerCenterY - logoH / 2, logoW, logoH);

            ctx.font = '600 32px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.letterSpacing = '1px';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('APPI | RSIJ Sukapura', startX + logoW + 20, footerCenterY);
        } catch (logoError) {
            // Fallback to text only if logo fails
            const footerTextY = footerLineY + (H - footerLineY) / 2;
            ctx.font = '600 32px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.letterSpacing = '1px';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('APPI | RSIJ Sukapura', W / 2, footerTextY);
        }

        ctx.textBaseline = 'alphabetic'; // Reset to default
        ctx.textAlign = 'center'; // Reset

        setImageSrc(canvas.toDataURL('image/png'));
        setIsLoading(false);
    }, [content, type]);

    useEffect(() => {
        if (isOpen) {
            drawImage();
        }
    }, [isOpen, drawImage, initialImageUrl, type, content]);

    const handleShare = async () => {
        if (!canvasRef.current || !navigator.share) {
            addToast('Fitur berbagi tidak didukung di browser ini.', 'error');
            return;
        }

        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], 'APPI_Share.png', { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: 'Gambar APPI',
                    text: 'Dibagikan dari Aplikasi Perilaku Pelayanan Islami (APPI)',
                };
                if (navigator.canShare && navigator.canShare(shareData)) {
                    try {
                        await navigator.share(shareData);
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') {
                        } else {
                            addToast('Gagal membagikan gambar.', 'error');
                        }
                    }
                } else {
                    addToast('Tidak dapat membagikan file ini.', 'error');
                }
            }
        }, 'image/png');
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.download = 'APPI_Image.png';
        link.href = imageSrc;
        link.click();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-70 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 w-full max-w-lg border border-white/20 animate-pop-in flex flex-col">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-lg font-bold text-white">Bagikan Gambar</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="grow flex items-center justify-center bg-black/20 rounded-lg p-2" style={{ aspectRatio }}>
                    {isLoading ? (
                        <div className="text-center text-blue-200">Membuat gambar...</div>
                    ) : (
                        <img src={imageSrc} alt="Generated content" className="max-w-full max-h-full object-contain rounded-md" />
                    )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="mt-4 shrink-0 flex items-center justify-end gap-3">
                    {canShare && (
                        <button onClick={handleShare} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-all shadow-lg">
                            <ShareIcon className="w-5 h-5" /><span>Bagikan</span>
                        </button>
                    )}
                    <button onClick={handleDownload} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 hover:bg-teal-400 rounded-lg font-bold text-white transition-all shadow-lg">
                        <DownloadIcon className="w-5 h-5" /><span>Unduh</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShareImageModal;