/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD berdasarkan waktu terkoreksi dari server
 * Fungsi ini menggunakan timeValidationService untuk mendapatkan waktu yang akurat dan tervalidasi
 */
export const getTodayLocalDateString = (): string => {
    // 🔥 FIX: Gunakan timeValidationService untuk mendapatkan waktu terkoreksi
    // Ini memastikan konsistensi dengan semua pelaporan aktivitas
    const { timeValidationService } = require('../services/timeValidationService');
    const now = timeValidationService.getCorrectedTime();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Mendapatkan waktu saat ini dalam format HH:mm berdasarkan waktu terkoreksi dari server
 */
export const getCurrentTime = (): string => {
    const { timeValidationService } = require('../services/timeValidationService');
    const now = timeValidationService.getCorrectedTime();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Memeriksa apakah currentTime berada dalam range waktu
 */
export const isTimeInRange = (currentTime: string, startTime: string, endTime: string): boolean => {
    return currentTime >= startTime && currentTime <= endTime;
};

/**
 * Mendapatkan waktu saat ini dalam format ISO string berdasarkan timezone lokal
 */
export const getNowLocal = (): Date => {
    return new Date();
};

/**
 * Format tanggal ke format Indonesia dengan timezone lokal
 */
export const formatDateIndonesia = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...options
    });
};

/**
 * Format tanggal dan waktu ke format Indonesia dengan timezone lokal
 */
export const formatDateTimeIndonesia = (
    timestamp?: number | null
): string => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Membuat Date object dari string tanggal (YYYY-MM-DD) dengan timezone lokal
 */
export const createLocalDate = (dateString: string): Date => {
    // Tambah waktu 'T12:00:00' untuk menghindari masalah timezone
    return new Date(dateString + 'T12:00:00');
};

/**
 * Normalisasi tanggal ke tengah hari (12:00) untuk menghindari masalah timezone
 */
export const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
};

/**
 * Bandingkan dua tanggal tanpa mempertimbangkan waktu
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return normalizeDate(date1).getTime() === normalizeDate(date2).getTime();
};

/**
 * Cek apakah tanggal1 setelah tanggal2 (tanpa waktu)
 */
export const isAfterDay = (date1: Date, date2: Date): boolean => {
    return normalizeDate(date1).getTime() > normalizeDate(date2).getTime();
};

export const getBalancedWeeks = (date: Date): { weekIndex: number, days: number[] }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        const currentDate = new Date(year, month, day);
        if (currentDate.getDay() === 0 || day === daysInMonth) { // End of week on Sunday or end of month
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Merge short first week (<= 2 days)
    if (weeks.length > 1 && weeks[0].length <= 2) {
        const firstWeek = weeks.shift()!;
        weeks[0] = [...firstWeek, ...weeks[0]];
    }

    // Merge short last week (<= 2 days)
    if (weeks.length > 1 && weeks[weeks.length - 1].length <= 2) {
        const lastWeek = weeks.pop()!;
        weeks[weeks.length - 1] = [...weeks[weeks.length - 1], ...lastWeek];
    }

    return weeks.map((days, index) => ({ weekIndex: index, days }));
};
