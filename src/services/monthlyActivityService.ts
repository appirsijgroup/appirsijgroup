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
            console.error('❌ Error getting monthly activities:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });

            // Jika tabel tidak ada (42P01), return empty object
            if (error.code === '42P01') {
                console.log('⚠️ Table employee_monthly_activities does not exist yet, using empty data');
            }

            // Return empty object untuk semua error (graceful degradation)
            return {};
        }

        // Jika tidak ada data, return empty object
        if (!data) {
            console.log('ℹ️ No monthly activities found for employee:', employeeId);
            return {};
        }

        return (data as any)?.activities || {};
    } catch (err) {
        console.error('❌ Unexpected error in getMonthlyActivities:', err);
        return {};
    }
};

// Update monthly activities for an employee
export const updateMonthlyActivities = async (
    employeeId: string,
    monthlyActivities: Record<string, MonthlyActivityProgress>
): Promise<void> => {
    console.log('🔄 updateMonthlyActivities called:', {
        employeeId,
        monthsCount: Object.keys(monthlyActivities).length,
        months: Object.keys(monthlyActivities),
        sampleData: JSON.stringify(monthlyActivities).substring(0, 200) + '...'
    });

    try {
        // Cek apakah data sudah ada
        console.log('🔍 Step 1: Checking if employee exists in employee_monthly_activities...');
        const { data: existing, error: checkError } = await supabase
            .from('employee_monthly_activities')
            .select('employee_id, activities')
            .eq('employee_id', employeeId)
            .maybeSingle();

        console.log('Check result:', {
            employeeId,
            existing: !!existing,
            checkError
        });

        if (checkError) {
            console.error('❌ Error checking existing monthly activities:', checkError);
            throw checkError;
        }

        if (existing) {
            console.log('📝 Step 2: Employee exists, updating existing data...');
            // Update existing data
            const { data, error } = await supabase
                .from('employee_monthly_activities')
                .update({
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', employeeId)
                .select();

            console.log('Update result:', {
                    success: !error,
                    error: error ? {
                        code: error.code,
                        message: error.message,
                        details: error.details
                    } : null,
                    data: data ? 'Updated successfully' : null
                });

            if (error) {
                console.error('❌ Error updating monthly activities:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }

            console.log('✅ Monthly activities updated for employee:', employeeId);
        } else {
            console.log('📝 Step 2: Employee not exists, inserting new data...');
            // Insert new data
            const { data, error } = await supabase
                .from('employee_monthly_activities')
                .insert({
                    employee_id: employeeId,
                    activities: monthlyActivities,
                    updated_at: new Date().toISOString()
                })
                .select();

            console.log('Insert result:', {
                    success: !error,
                    error: error ? {
                        code: error.code,
                        message: error.message,
                        details: error.details
                    } : null,
                    data: data ? 'Inserted successfully' : null
                });

            if (error) {
                console.error('❌ Error inserting monthly activities:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }

            console.log('✅ Monthly activities inserted for employee:', employeeId);
        }

        console.log('🎉 updateMonthlyActivities completed successfully!');
    } catch (err) {
        console.error('❌ Unexpected error in updateMonthlyActivities:', err);
        console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
        console.error('Error message:', err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.stack) {
            console.error('Stack trace:', err.stack);
        }
        throw err;
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
                console.warn('⚠️ Table employee_monthly_activities does not exist yet');
            } else {
                console.warn('⚠️ Error getting monthly activities:', activitiesError.message);
            }
        }

        // Ambil activated months dari tabel employees
        const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('activated_months')
            .eq('id', employeeId)
            .single();

        if (employeeError) {
            console.error('❌ Error getting employee data:', employeeError);
            throw employeeError;
        }

        return {
            monthlyActivities: (activitiesData as any)?.activities || {},
            activatedMonths: (employeeData as any)?.activated_months || []
        };
    } catch (err) {
        console.error('❌ Unexpected error in getEmployeeMonthlyData:', err);
        throw err;
    }
};