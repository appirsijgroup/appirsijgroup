import { supabase, toSnakeCase, toCamelCase } from '@/lib/supabase';
import type { Employee, MonthlyActivityProgress } from '@/types';

/**
 * Monthly Activity Service
 * Handles all monthly activity-related database operations
 */

// Get monthly activities for an employee
export const getMonthlyActivities = async (employeeId: string): Promise<Record<string, MonthlyActivityProgress>> => {
    try {
        // Ambil dari tabel employee_monthly_activities
        const { data, error } = await supabase
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
        // Cek apakah data sudah ada
        const { data: existing, error: checkError } = await supabase
            .from('employee_monthly_activities')
            .select('employee_id, activities')
            .eq('employee_id', employeeId)
            .maybeSingle();


        if (checkError) {
            throw checkError;
        }

        if (existing) {
            // Update existing data
            const { data, error } = await supabase
                .from('employee_monthly_activities')
                .update({
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', employeeId)
                .select();


            if (error) {
                throw error;
            }

        } else {
            // Insert new data
            const { data, error } = await supabase
                .from('employee_monthly_activities')
                .insert({
                    employee_id: employeeId,
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .select();


            if (error) {
                throw error;
            }

        }

    } catch (err) {
        if (err instanceof Error && err.stack) {
        }
        throw err;
    }
};

// Get activated months for an employee
export const getActivatedMonths = async (employeeId: string): Promise<string[]> => {
    const { data, error } = await supabase
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

    const { error, data } = await (supabase
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

        // Save to Supabase
        await updateMonthlyActivities(employeeId, updatedActivities);

        return true;
    } catch (error) {
        return false;
    }
};

// Get all monthly activities and activated months for an employee
export const getEmployeeMonthlyData = async (employeeId: string): Promise<{
    monthlyActivities: Record<string, MonthlyActivityProgress>;
    activatedMonths: string[];
}> => {
    try {
        // Ambil monthly activities dari tabel employee_monthly_activities
        const { data: activitiesData, error: activitiesError } = await supabase
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
        const { data: employeeData, error: employeeError } = await supabase
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