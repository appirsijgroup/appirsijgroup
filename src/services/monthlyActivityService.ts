import { supabase } from '@/lib/supabase';
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

// 🔥 FIX: Use default supabase client directly - custom JWT is not compatible with Supabase Auth
// Authorization is handled at the API level, not at the Supabase RLS level
const getClient = () => supabase;

// Get monthly activities for an employee (with optional month/year filter)
export const getMonthlyActivities = async (employeeId: string, month?: number, year?: number): Promise<Record<string, MonthlyActivityProgress>> => {
    try {
        let url = `/api/monthly-activities?employeeId=${encodeURIComponent(employeeId)}`;
        if (month) url += `&month=${month}`;
        if (year) url += `&year=${year}`;

        // 🔥 FIX: Use API endpoint to bypass RLS issues
        const response = await fetch(url);

        if (!response.ok) {
            // Handle 405 Method Not Allowed and other errors gracefully
            if (response.status === 405) {
                console.warn(`⚠️ [getMonthlyActivities] API endpoint not allowed for employeeId: ${employeeId}`);
            } else {
                console.warn(`⚠️ [getMonthlyActivities] HTTP ${response.status} for employeeId: ${employeeId}`);
            }
            // Return empty object for all errors (graceful degradation)
            return {};
        }

        const result = await response.json();
        return result.activities || {};
    } catch (err) {
        // Handle JSON parsing errors gracefully
        if (err instanceof SyntaxError) {
            console.warn(`⚠️ [getMonthlyActivities] JSON parsing error for employeeId: ${employeeId}`, err.message);
        } else {
            console.warn(`⚠️ [getMonthlyActivities] Network or other error for employeeId: ${employeeId}`, err);
        }
        return {};
    }
};

// 🔥 FIX: NO CACHE - This function is now a no-op for backward compatibility
// Monthly activities are now stored in separate tables and loaded directly
// This function is kept for backward compatibility but does nothing
export const updateMonthlyActivities = async (
    employeeId: string,
    monthlyActivities: Record<string, MonthlyActivityProgress>
): Promise<void> => {
    // NO CACHE - Activities are stored in separate tables (employee_monthly_reports, tadarus_sessions, team_attendance_records, attendance_records)
    // This function is kept for backward compatibility but does nothing
    console.log('⏭️ [updateMonthlyActivities] NO CACHE - Skipping (backward compatibility no-op)', {
        employeeId,
        activitiesCount: Object.keys(monthlyActivities).length
    });
    return Promise.resolve();
};

// Get activated months for an employee
export const getActivatedMonths = async (employeeId: string): Promise<string[]> => {
    try {
        // 🔥 FIX: Use API endpoint to bypass RLS issues
        const response = await fetch(`/api/activated-months?employeeId=${encodeURIComponent(employeeId)}`);

        if (!response.ok) {
            // Return empty array untuk semua error (graceful degradation)
            return [];
        }

        const result = await response.json();
        return result.activatedMonths || [];
    } catch (err) {
        return [];
    }
};

// Update activated months for an employee
export const updateActivatedMonths = async (
    employeeId: string,
    activatedMonths: string[]
): Promise<void> => {
    try {
        // 🔥 FIX: Use API endpoint to bypass RLS issues
        const response = await fetch('/api/activated-months', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employeeId,
                activatedMonths
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to update activated months: ${error.error || 'Unknown error'}`);
        }

        console.log('✅ [updateActivatedMonths] Successfully updated activated months');
    } catch (err) {
        console.error('❌ [updateActivatedMonths] Failed:', err);
        throw err;
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

// 🔥 FIX: NO CACHE - This function is now a no-op for backward compatibility
// Monthly activities are now stored in separate tables and loaded directly
export const updateMonthlyProgress = async (
    employeeId: string,
    monthKey: string,
    progress: MonthlyActivityProgress
): Promise<boolean> => {
    // NO CACHE - Activities are stored in separate tables
    // This function is kept for backward compatibility but does nothing
    console.log('⏭️ [updateMonthlyProgress] NO CACHE - Skipping (backward compatibility no-op)', {
        employeeId,
        monthKey,
        progressKeys: Object.keys(progress).length
    });
    return true;
};

// Get all monthly activities and activated months for an employee
export const getEmployeeMonthlyData = async (employeeId: string): Promise<{
    monthlyActivities: Record<string, MonthlyActivityProgress>;
    activatedMonths: string[];
}> => {
    try {
        // 🔥 FIX: Use API endpoint for monthly activities to bypass RLS
        const activitiesResponse = await fetch(`/api/monthly-activities?employeeId=${encodeURIComponent(employeeId)}`);

        let monthlyActivities: Record<string, MonthlyActivityProgress> = {};
        if (activitiesResponse.ok) {
            const result = await activitiesResponse.json();
            monthlyActivities = result.activities || {};
        }

        // Ambil activated months dari tabel employees (using supabase client directly - this should work)
        const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('activated_months')
            .eq('id', employeeId)
            .single();

        if (employeeError) {
            throw employeeError;
        }

        return {
            monthlyActivities,
            activatedMonths: (employeeData as any)?.activated_months || []
        };
    } catch (err) {
        throw err;
    }
};