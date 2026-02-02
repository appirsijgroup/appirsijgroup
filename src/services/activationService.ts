import { supabase } from '@/lib/supabase';

export interface MutabaahActivation {
    id: string;
    employeeId: string;
    monthKey: string;
    createdAt: string;
}

export const activationService = {
    // Get all activated months for an employee
    async getActivations(employeeId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('mutabaah_activations')
            .select('month_key')
            .eq('employee_id', employeeId);

        if (error) {
            console.error('Error fetching activations:', error);
            return [];
        }

        return data.map((row: any) => row.month_key);
    },

    // Activate a specific month for an employee
    async activateMonth(employeeId: string, monthKey: string): Promise<boolean> {
        // Check if already activated to avoid errors (although DB has unique constraint)
        const { data: existing } = await supabase
            .from('mutabaah_activations')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('month_key', monthKey)
            .maybeSingle();

        if (existing) return true;

        const { error } = await supabase
            .from('mutabaah_activations')
            .insert({
                employee_id: employeeId,
                month_key: monthKey
            });

        if (error) {
            console.error(`Error activating month ${monthKey}:`, error);
            throw error;
        }

        return true;
    },

    // Check if a month is activated
    async isMonthActivated(employeeId: string, monthKey: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('mutabaah_activations')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('month_key', monthKey)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking activation:', error);
            return false;
        }

        return !!data;
    }
};
