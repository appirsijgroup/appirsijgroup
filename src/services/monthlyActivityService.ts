import { supabase, toSnakeCase, toCamelCase } from '@/lib/supabase';
import type { Employee, MonthlyActivityProgress } from '@/types';

/**
 * Monthly Activity Service
 * Handles all monthly activity-related database operations
 */

// Get monthly activities for an employee
export const getMonthlyActivities = async (employeeId: string): Promise<Record<string, MonthlyActivityProgress>> => {
    const { data, error } = await supabase
        .from('employees')
        .select('monthly_activities')
        .eq('id', employeeId)
        .single();

    if (error) {
        console.error('Error getting monthly activities:', error);
        throw error;
    }

    return (data as any)?.monthly_activities || {};
};

// Update monthly activities for an employee
export const updateMonthlyActivities = async (
    employeeId: string,
    monthlyActivities: Record<string, MonthlyActivityProgress>
): Promise<void> => {
    const { error } = await (supabase
        .from('employees') as any)
        .update({
            monthly_activities: monthlyActivities,
            updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

    if (error) {
        console.error('Error updating monthly activities:', error);
        throw error;
    }
};

// Get activated months for an employee
export const getActivatedMonths = async (employeeId: string): Promise<string[]> => {
    console.log('getActivatedMonths called with:', employeeId);
    const { data, error } = await supabase
        .from('employees')
        .select('activated_months')
        .eq('id', employeeId)
        .single();

    console.log('getActivatedMonths result:', { data, error });

    if (error) {
        console.error('Error getting activated months:', error);
        throw error;
    }

    return (data as any)?.activated_months || [];
};

// Update activated months for an employee
export const updateActivatedMonths = async (
    employeeId: string,
    activatedMonths: string[]
): Promise<void> => {
    console.log('updateActivatedMonths called with:', { employeeId, activatedMonths });
    const updateData: any = {
        activated_months: activatedMonths,
        updated_at: new Date().toISOString()
    };

    const { error, data } = await (supabase
        .from('employees') as any)
        .update(updateData)
        .eq('id', employeeId)
        .select();

    console.log('updateActivatedMonths result:', { error, data });

    if (error) {
        console.error('Error updating activated months:', error);
        throw error;
    }

    console.log('Successfully updated activated months in Supabase for employee:', employeeId);
};

// Activate a month for an employee
export const activateMonth = async (
    employeeId: string,
    monthKey: string
): Promise<boolean> => {
    console.log('activateMonth service called with:', { employeeId, monthKey });
    try {
        // Get current activated months
        const currentActivatedMonths = await getActivatedMonths(employeeId);
        console.log('Current activated months:', currentActivatedMonths);

        // Check if month is already activated
        if (currentActivatedMonths.includes(monthKey)) {
            console.warn('Month already activated:', monthKey);
            return true;
        }

        // Add new month to activated months
        const newActivatedMonths = [...currentActivatedMonths, monthKey];
        console.log('New activated months:', newActivatedMonths);

        // Update in Supabase
        await updateActivatedMonths(employeeId, newActivatedMonths);
        console.log('Successfully updated activated months in Supabase');

        return true;
    } catch (error) {
        console.error('Error activating month:', error);
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
        console.error('Error updating monthly progress:', error);
        return false;
    }
};

// Get all monthly activities and activated months for an employee
export const getEmployeeMonthlyData = async (employeeId: string): Promise<{
    monthlyActivities: Record<string, MonthlyActivityProgress>;
    activatedMonths: string[];
}> => {
    const { data, error } = await supabase
        .from('employees')
        .select('monthly_activities, activated_months')
        .eq('id', employeeId)
        .single();

    if (error) {
        console.error('Error getting employee monthly data:', error);
        throw error;
    }

    return {
        monthlyActivities: (data as any)?.monthly_activities || {},
        activatedMonths: (data as any)?.activated_months || []
    };
};