import { supabase, createSupabaseClientWithToken } from '@/lib/supabase';
import type { MonthlyReportActivity, MonthlyReports, BookReadingEntry, ManualReportEntry } from '@/types';

/**
 * Monthly Report Service
 * Menangani Laporan Manual bulanan (counter-based activities)
 * Terpisah dari daily activities yang ada di employee_monthly_activities
 */

// Debounce cache untuk mencegah race condition
const updateReportCache = new Map<string, {
    data: MonthlyReports;
    timestamp: number;
}>();
const DEBOUNCE_REPORT_MS = 500; // 500ms debounce

const getPendingReportUpdate = (employeeId: string) => {
    const cached = updateReportCache.get(employeeId);
    if (cached && Date.now() - cached.timestamp < DEBOUNCE_REPORT_MS) {
        return cached.data;
    }
    return null;
};

const setPendingReportUpdate = (employeeId: string, data: MonthlyReports) => {
    updateReportCache.set(employeeId, {
        data,
        timestamp: Date.now()
    });
};

// Function to get authenticated Supabase client
const getAuthenticatedSupabaseClient = () => {
    if (typeof document === 'undefined') return supabase; // Server side

    const cookies = document.cookie.split(';');
    let token = null;
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session') {
            token = decodeURIComponent(value);
            break;
        }
    }

    if (token) {
        // console.log('🔐 [monthlyReportService] Using authenticated client with token');
        return createSupabaseClientWithToken(token);
    }

    // console.warn('⚠️ [monthlyReportService] No session token found in cookies, falling back to anon client');
    return supabase; // Fallback to anon client
};

/**
 * Get monthly reports untuk satu employee
 */
export const getMonthlyReports = async (employeeId: string): Promise<MonthlyReports> => {
    if (!employeeId) {
        console.warn('⚠️ [monthlyReportService] getMonthlyReports called without employeeId');
        return {};
    }

    try {
        const client = getAuthenticatedSupabaseClient();

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds

        const { data, error } = await client
            .from('employee_monthly_reports')
            .select('reports')
            .eq('employee_id', employeeId)
            .abortSignal(controller.signal)
            .maybeSingle();

        clearTimeout(timeoutId);

        if (error) {
            // Jika tabel belum ada (42P01), return empty object
            if (error.code === '42P01') {
                console.warn('⚠️ [monthlyReportService] Table employee_monthly_reports does not exist');
                return {};
            }
            // Ignore abort errors from timeout
            if (error.message && error.message.includes('abort')) {
                console.warn('⏱️ [monthlyReportService] Fetch timed out for employee:', employeeId);
                return {};
            }
            console.error('❌ [monthlyReportService] Supabase error:', error);
            throw error;
        }

        if (!data) {
            // console.log('🔍 [monthlyReportService] No reports found for employee:', employeeId);
            return {};
        }

        return (data as any)?.reports || {};
    } catch (error: any) {
        // Handle abort errors gracefully but THROW to prevent data overwrite
        if (error.name === 'AbortError' || (error.message && error.message.includes('abort'))) {
            console.warn('⏱️ [monthlyReportService] Request aborted/timed out for employee:', employeeId);
            throw new Error('Request timed out. Please try again.');
        }
        console.error('❌ [monthlyReportService] Unexpected error getting monthly reports:', error);
        throw error;
    }
};

/**
 * Update monthly reports untuk satu employee
 */
export const updateMonthlyReports = async (
    employeeId: string,
    reports: MonthlyReports
): Promise<void> => {
    try {
        // 🔥 FIX: Check for pending updates (debouncing)
        const pending = getPendingReportUpdate(employeeId);
        if (pending) {
            // Merge dengan pending update
            reports = { ...pending, ...reports };
        }

        // Update cache
        setPendingReportUpdate(employeeId, reports);

        const client = getAuthenticatedSupabaseClient();

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for write operations

        // Cek apakah data sudah ada
        const { data: existing, error: checkError } = await client
            .from('employee_monthly_reports')
            .select('employee_id')
            .eq('employee_id', employeeId)
            .abortSignal(controller.signal)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            // Handle abort errors
            if (checkError.message && checkError.message.includes('abort')) {
                throw new Error('Request timeout. Silakan coba lagi.');
            }
            console.error('❌ [monthlyReportService] Check error:', checkError);
            throw checkError;
        }

        if (existing) {
            // Update existing
            const { data, error } = await client
                .from('employee_monthly_reports')
                .update({
                    reports: reports,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', employeeId)
                .abortSignal(controller.signal)
                .select();

            if (error) {
                clearTimeout(timeoutId);
                // Handle abort errors
                if (error.message && error.message.includes('abort')) {
                    throw new Error('Request timeout saat menyimpan. Silakan coba lagi.');
                }
                console.error('❌ [monthlyReportService] Update error:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: error
                });
                throw new Error(`Failed to update monthly reports: ${error.message}`);
            }
            clearTimeout(timeoutId);

        } else {
            // Insert new
            const { data, error } = await client
                .from('employee_monthly_reports')
                .insert({
                    employee_id: employeeId,
                    reports: reports,
                    updated_at: new Date().toISOString()
                })
                .abortSignal(controller.signal)
                .select();

            if (error) {
                clearTimeout(timeoutId);
                // Handle abort errors
                if (error.message && error.message.includes('abort')) {
                    throw new Error('Request timeout saat menyimpan. Silakan coba lagi.');
                }
                console.error('❌ [monthlyReportService] Insert error:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: error
                });
                throw new Error(`Failed to insert monthly reports: ${error.message}`);
            }
            clearTimeout(timeoutId);

        }

        // 🔥 FIX: Clear cache after successful update
        updateReportCache.delete(employeeId);

    } catch (error: any) {
        // Handle abort errors gracefully
        if (error.name === 'AbortError' || (error.message && error.message.includes('abort'))) {
            // Don't clear cache on abort - let next retry use the cached data
            throw new Error('Request timeout. Silakan coba lagi.');
        }
        // Clear cache on error to allow retry
        updateReportCache.delete(employeeId);
        console.error('❌ [monthlyReportService] Error:', error);
        throw error;
    }
};

/**
 * Increment counter untuk satu aktivitas di satu bulan
 */
export const incrementMonthlyReportActivity = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    note?: string
): Promise<MonthlyReportActivity> => {
    try {
        // Get current reports
        const currentReports = await getMonthlyReports(employeeId);

        // Initialize month jika belum ada
        if (!currentReports[monthKey]) {
            currentReports[monthKey] = {};
        }

        // Get current count
        const currentActivity = currentReports[monthKey][activityId];
        const newCount = (currentActivity?.count || 0) + 1;

        // Update activity
        currentReports[monthKey][activityId] = {
            count: newCount,
            completedAt: new Date().toISOString(),
            note: note || currentActivity?.note
        };

        // Save to database
        await updateMonthlyReports(employeeId, currentReports);

        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('❌ [monthlyReportService] Error incrementing:', error);
        throw error;
    }
};

/**
 * Decrement counter untuk satu aktivitas di satu bulan
 */
export const decrementMonthlyReportActivity = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<MonthlyReportActivity> => {
    try {
        // Get current reports
        const currentReports = await getMonthlyReports(employeeId);

        // Check jika ada
        if (!currentReports[monthKey] || !currentReports[monthKey][activityId]) {
            throw new Error('Activity not found for this month');
        }

        // Decrement count (min 0)
        const currentCount = currentReports[monthKey][activityId].count;
        const newCount = Math.max(0, currentCount - 1);

        // Update atau delete jika count = 0
        if (newCount === 0) {
            delete currentReports[monthKey][activityId];
        } else {
            currentReports[monthKey][activityId] = {
                count: newCount,
                completedAt: currentReports[monthKey][activityId].completedAt
            };
        }

        // Save to database
        await updateMonthlyReports(employeeId, currentReports);

        return currentReports[monthKey][activityId] || { count: 0 };
    } catch (error) {
        console.error('Error decrementing monthly report activity:', error);
        throw error;
    }
};

/**
 * Get counter untuk satu aktivitas di satu bulan
 */
export const getMonthlyReportActivityCount = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<number> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.count || 0;
    } catch (error) {
        console.error('Error getting monthly report activity count:', error);
        return 0;
    }
};

/**
 * Hapus semua data untuk satu bulan (untuk reset)
 */
export const deleteMonthlyReportsForMonth = async (
    employeeId: string,
    monthKey: string
): Promise<void> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);

        if (currentReports[monthKey]) {
            delete currentReports[monthKey];
            await updateMonthlyReports(employeeId, currentReports);
        }
    } catch (error) {
        console.error('Error deleting monthly reports for month:', error);
        throw error;
    }
};

/**
 * Tambah book reading entry (dengan judul buku dan halaman)
 * Digunakan untuk aktivitas "Membaca Al-Quran dan buku"
 */
export const addBookReadingReport = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    bookTitle: string,
    pagesRead: string,
    dateCompleted: string
): Promise<MonthlyReportActivity> => {
    try {
        // Get current reports
        const currentReports = await getMonthlyReports(employeeId);

        // Initialize month jika belum ada
        if (!currentReports[monthKey]) {
            currentReports[monthKey] = {};
        }

        // Get current activity
        const currentActivity = currentReports[monthKey][activityId];
        const currentBookEntries = currentActivity?.bookEntries || [];

        // Add new entry
        const newEntry: BookReadingEntry = {
            bookTitle,
            pagesRead,
            dateCompleted,
            completedAt: new Date().toISOString()
        };

        const updatedBookEntries = [...currentBookEntries, newEntry];

        // Update activity
        currentReports[monthKey][activityId] = {
            count: updatedBookEntries.length,
            bookEntries: updatedBookEntries,
            completedAt: new Date().toISOString()
        };

        // Save to database
        await updateMonthlyReports(employeeId, currentReports);

        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('❌ [monthlyReportService] Error adding book reading:', error);
        throw error;
    }
};

/**
 * Tambah manual report per tanggal
 * Digunakan untuk aktivitas manual seperti "infaq", "jujur", dll
 * Mencegah duplicate report untuk tanggal yang sama
 */
export const addManualReportByDate = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    reportDate: string,
    note?: string
): Promise<MonthlyReportActivity> => {
    try {
        // Get current reports
        const currentReports = await getMonthlyReports(employeeId);

        // Initialize month jika belum ada
        if (!currentReports[monthKey]) {
            currentReports[monthKey] = {};
        }

        // Get current activity
        const currentActivity = currentReports[monthKey][activityId];
        const currentEntries = currentActivity?.entries || [];

        // Check for duplicate date
        const isDuplicate = currentEntries.some((entry: ManualReportEntry) => entry.date === reportDate);
        if (isDuplicate) {
            throw new Error(`Aktivitas sudah dilaporkan untuk tanggal ${reportDate}`);
        }

        // Add new entry
        const newEntry: ManualReportEntry = {
            date: reportDate,
            completedAt: new Date().toISOString(),
            note: note
        };

        const updatedEntries = [...currentEntries, newEntry];

        // Update activity
        currentReports[monthKey][activityId] = {
            count: updatedEntries.length,
            entries: updatedEntries,
            completedAt: new Date().toISOString()
        };

        // Save to database
        await updateMonthlyReports(employeeId, currentReports);

        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('❌ [monthlyReportService] Error adding manual report:', error);
        throw error;
    }
};

/**
 * Get book reading entries untuk satu aktivitas di satu bulan
 */
export const getBookReadingEntries = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<BookReadingEntry[]> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.bookEntries || [];
    } catch (error) {
        console.error('Error getting book reading entries:', error);
        return [];
    }
};

/**
 * Get manual report entries untuk satu aktivitas di satu bulan
 */
export const getManualReportEntries = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<ManualReportEntry[]> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.entries || [];
    } catch (error) {
        console.error('Error getting manual report entries:', error);
        return [];
    }
};

/**
 * Convert employee_monthly_reports data to monthlyActivities format
 * Ini untuk merge data dari employee_monthly_reports ke chart dan mutabaah
 *
 * Input: { "2026-01": { "infaq": { count: 2, entries: [...] } } }
 * Output: { "2026-01": { "01": { infaq: true }, "05": { infaq: true } } }
 */
export const convertMonthlyReportsToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        // 🔥 DEBUG: Log input data
        console.log('🔍 [convertMonthlyReportsToActivities] Input reports:', JSON.stringify(reports, null, 2));

        Object.entries(reports).forEach(([monthKey, monthData]) => {
            if (!result[monthKey]) {
                result[monthKey] = {};
            }

            Object.entries(monthData).forEach(([activityId, activityData]) => {
                // Process entries (manual reports per date)
                if (activityData.entries && Array.isArray(activityData.entries)) {
                    activityData.entries.forEach((entry: ManualReportEntry) => {
                        if (!entry?.date || typeof entry.date !== 'string' || entry.date.length < 10) return;

                        const dayKey = entry.date.substring(8, 10); // Extract DD from YYYY-MM-DD

                        if (!result[monthKey][dayKey]) {
                            result[monthKey][dayKey] = {};
                        }

                        result[monthKey][dayKey][activityId] = true;
                    });
                }

                // Process bookEntries (reading reports)
                if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                    activityData.bookEntries.forEach((entry: BookReadingEntry) => {
                        if (!entry?.dateCompleted || typeof entry.dateCompleted !== 'string' || entry.dateCompleted.length < 10) return;

                        const dayKey = entry.dateCompleted.substring(8, 10); // Extract DD from YYYY-MM-DD

                        if (!result[monthKey][dayKey]) {
                            result[monthKey][dayKey] = {};
                        }

                        result[monthKey][dayKey][activityId] = true;
                    });
                }

                // 🔥 NEW: Handle activities with only completedAt (no entries array)
                // This fixes activities like: persyarikatan, tanggung_jawab, penampilan_diri, kajian_selasa
                if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                    const completedDate = new Date(activityData.completedAt);
                    const dayKey = String(completedDate.getDate()).padStart(2, '0'); // Extract DD

                    // Double-check that the completed date is in the correct month
                    const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                    if (completedMonthKey === monthKey) {
                        if (!result[monthKey][dayKey]) {
                            result[monthKey][dayKey] = {};
                        }

                        result[monthKey][dayKey][activityId] = true;
                    }
                }
            });
        });

        // 🔥 DEBUG: Log output data
        console.log('✅ [convertMonthlyReportsToActivities] Output result:', JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('Error converting monthly reports to activities:', error);
        return {};
    }
};

