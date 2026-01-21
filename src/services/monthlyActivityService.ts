import { supabase, createSupabaseClientWithToken, toSnakeCase, toCamelCase } from '@/lib/supabase';
import type { Employee, MonthlyActivityProgress } from '@/types';

/**
 * Monthly Activity Service
 * Handles all monthly activity-related database operations
 */

// Debounce cache untuk mencegah race condition
const updateCache = new Map<string, {
    data: Record<string, MonthlyActivityProgress>;
    timestamp: number;
}>();
const DEBOUNCE_MS = 500; // 500ms debounce

const getPendingUpdate = (employeeId: string) => {
    const cached = updateCache.get(employeeId);
    if (cached && Date.now() - cached.timestamp < DEBOUNCE_MS) {
        return cached.data;
    }
    return null;
};

const setPendingUpdate = (employeeId: string, data: Record<string, MonthlyActivityProgress>) => {
    updateCache.set(employeeId, {
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
        return createSupabaseClientWithToken(token);
    }

    return supabase; // Fallback to anon client
};

// Get monthly activities for an employee
export const getMonthlyActivities = async (employeeId: string): Promise<Record<string, MonthlyActivityProgress>> => {
    try {
        const client = getAuthenticatedSupabaseClient();

        // Ambil dari tabel employee_monthly_activities
        const { data, error } = await client
            .from('employee_monthly_activities')
            .select('activities')
            .eq('employee_id', employeeId)
            .maybeSingle(); // Use maybeSingle instead of single to handle no rows

        if (error) {

            // Jika tabel tidak ada (42P01), return empty object
            if (error.code === '42P01') {
            }

            // Return empty object untuk semua error (graceful degradation)
            return {};
        }

        // Jika tidak ada data, return empty object
        if (!data) {
            return {};
        }

        return (data as any)?.activities || {};
    } catch (err) {
        return {};
    }
};

// Update monthly activities for an employee
export const updateMonthlyActivities = async (
    employeeId: string,
    monthlyActivities: Record<string, MonthlyActivityProgress>
): Promise<void> => {

    try {
        // 🔥 FIX: Check for pending updates (debouncing)
        const pending = getPendingUpdate(employeeId);
        if (pending) {
            // Merge dengan pending update
            monthlyActivities = { ...pending, ...monthlyActivities };
        }

        // Update cache
        setPendingUpdate(employeeId, monthlyActivities);

        // Logs dimatikan untuk mengurangi console clutter

        const client = getAuthenticatedSupabaseClient();

        // Cek apakah data sudah ada
        const { data: existing, error: checkError } = await client
            .from('employee_monthly_activities')
            .select('employee_id, activities')
            .eq('employee_id', employeeId)
            .maybeSingle();

        if (checkError) {
            // Handle AbortError gracefully
            if (checkError.message && checkError.message.includes('abort')) {
                console.warn('⚠️ [updateMonthlyActivities] Request aborted, skipping update');
                return;
            }
            console.error('❌ [updateMonthlyActivities] Check error:', checkError);
            throw checkError;
        }

        if (existing) {
            // Update existing data
            const { data, error } = await client
                .from('employee_monthly_activities')
                .update({
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', employeeId)
                .select();

            if (error) {
                // Handle AbortError gracefully
                if (error.message && error.message.includes('abort')) {
                    console.warn('⚠️ [updateMonthlyActivities] Update request aborted');
                    return;
                }
                console.error('❌ [updateMonthlyActivities] Update error:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: error
                });
                throw new Error(`Failed to update monthly activities: ${error.message || JSON.stringify(error)}`);
            }

        } else {
            // Insert new data
            const { data, error } = await client
                .from('employee_monthly_activities')
                .insert({
                    employee_id: employeeId,
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (error) {
                // Handle AbortError gracefully
                if (error.message && error.message.includes('abort')) {
                    console.warn('⚠️ [updateMonthlyActivities] Insert request aborted');
                    return;
                }
                console.error('❌ [updateMonthlyActivities] Insert error:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: error
                });
                throw new Error(`Failed to insert monthly activities: ${error.message || JSON.stringify(error)}`);
            }

        }

        // 🔥 FIX: Clear cache after successful update
        updateCache.delete(employeeId);

    } catch (err) {
        // Handle AbortError gracefully at catch level
        if (err instanceof Error) {
            if (err.message && err.message.includes('abort')) {
                console.warn('⚠️ [updateMonthlyActivities] Operation aborted');
                // Don't clear cache on abort - let next retry use the cached data
                return;
            }
            if (err.stack) {
                console.error('❌ [updateMonthlyActivities] Exception:', err);
            }
        }
        // Clear cache on error to allow retry
        updateCache.delete(employeeId);
        throw err;
    }
};

// Get activated months for an employee
export const getActivatedMonths = async (employeeId: string): Promise<string[]> => {
    const client = getAuthenticatedSupabaseClient();
    const { data, error } = await client
        .from('employees')
        .select('activated_months')
        .eq('id', employeeId)
        .single();


    if (error) {
        throw error;
    }

    return (data as any)?.activated_months || [];
};

// Update activated months for an employee
export const updateActivatedMonths = async (
    employeeId: string,
    activatedMonths: string[]
): Promise<void> => {
    const updateData: any = {
        activated_months: activatedMonths,
        updated_at: new Date().toISOString()
    };

    const client = getAuthenticatedSupabaseClient();
    const { error, data } = await (client
        .from('employees') as any)
        .update(updateData)
        .eq('id', employeeId)
        .select();


    if (error) {
        throw error;
    }

};

// Activate a month for an employee
export const activateMonth = async (
    employeeId: string,
    monthKey: string
): Promise<boolean> => {
    try {
        // Get current activated months
        const currentActivatedMonths = await getActivatedMonths(employeeId);

        // Check if month is already activated
        if (currentActivatedMonths.includes(monthKey)) {
            return true;
        }

        // Add new month to activated months
        const newActivatedMonths = [...currentActivatedMonths, monthKey];

        // Update in Supabase
        await updateActivatedMonths(employeeId, newActivatedMonths);

        return true;
    } catch (error) {
        return false;
    }
};

// Update progress for a specific month
export const updateMonthlyProgress = async (
    employeeId: string,
    monthKey: string,
    progress: MonthlyActivityProgress
): Promise<boolean> => {
    try {
        // Get current monthly activities
        const currentActivities = await getMonthlyActivities(employeeId);

        // Update the specific month
        const updatedActivities = {
            ...currentActivities,
            [monthKey]: progress
        };

        // Save to Supabase (dengan debouncing)
        await updateMonthlyActivities(employeeId, updatedActivities);

        return true;
    } catch (error) {
        // Silent fail - sudah ditangani di updateMonthlyActivities
        return false;
    }
};

// Get all monthly activities and activated months for an employee
export const getEmployeeMonthlyData = async (employeeId: string): Promise<{
    monthlyActivities: Record<string, MonthlyActivityProgress>;
    activatedMonths: string[];
}> => {
    try {
        const client = getAuthenticatedSupabaseClient();

        // Ambil monthly activities dari tabel employee_monthly_activities
        const { data: activitiesData, error: activitiesError } = await client
            .from('employee_monthly_activities')
            .select('activities')
            .eq('employee_id', employeeId)
            .maybeSingle(); // Use maybeSingle instead of single

        // Log jika ada error tapi jangan throw
        if (activitiesError) {
            if (activitiesError.code === '42P01') {
            } else {
            }
        }

        // Ambil activated months dari tabel employees
        const { data: employeeData, error: employeeError } = await client
            .from('employees')
            .select('activated_months')
            .eq('id', employeeId)
            .single();

        if (employeeError) {
            throw employeeError;
        }

        return {
            monthlyActivities: (activitiesData as any)?.activities || {},
            activatedMonths: (employeeData as any)?.activated_months || []
        };
    } catch (err) {
        throw err;
    }
};