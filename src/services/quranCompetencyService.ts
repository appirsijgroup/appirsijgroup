import { supabase } from '@/lib/supabase';
import { EmployeeQuranCompetency, EmployeeQuranHistory, QuranLevel } from '@/types';

/**
 * Get all master quran levels
 */
export const getQuranLevels = async (): Promise<QuranLevel[]> => {
    const { data, error } = await supabase
        .from('quran_levels')
        .select('*')
        .order('dimension')
        .order('order') as any;

    if (error) {
        console.error('Error fetching quran levels:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        dimension: item.dimension,
        code: item.code,
        label: item.label,
        order: item.order
    }));
};

/**
 * Get quran competency for a specific employee
 */
export const getEmployeeQuranCompetency = async (employeeId: string): Promise<EmployeeQuranCompetency | null> => {
    const { data, error } = await supabase
        .from('employee_quran_competency')
        .select('*')
        .eq('employee_id', employeeId)
        .single() as any;

    if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('Error fetching employee quran competency:', error);
        }
        return null;
    }

    return {
        id: data.id,
        employeeId: data.employee_id,
        readingLevel: data.reading_level,
        tajwidLevel: data.tajwid_level,
        memorizationLevel: data.memorization_level,
        understandingLevel: data.understanding_level,
        readingChecklist: data.reading_checklist || [],
        tajwidChecklist: data.tajwid_checklist || [],
        memorizationChecklist: data.memorization_checklist || [],
        understandingChecklist: data.understanding_checklist || [],
        assessedAt: data.assessed_at,
        assessorId: data.assessor_id
    };
};

/**
 * Save quran competency assessment
 */
export const saveQuranAssessment = async (
    assessment: Omit<EmployeeQuranCompetency, 'id' | 'assessedAt'>
): Promise<EmployeeQuranCompetency | null> => {
    try {
        // 1. Get current competency to check for changes (for history)
        const current = await getEmployeeQuranCompetency(assessment.employeeId);

        // 2. Prepare update/insert data
        const payload = {
            employee_id: assessment.employeeId,
            reading_level: assessment.readingLevel,
            tajwid_level: assessment.tajwidLevel,
            memorization_level: assessment.memorizationLevel,
            understanding_level: assessment.understandingLevel,
            reading_checklist: assessment.readingChecklist,
            tajwid_checklist: assessment.tajwidChecklist,
            memorization_checklist: assessment.memorizationChecklist,
            understanding_checklist: assessment.understandingChecklist,
            assessor_id: assessment.assessorId,
            assessed_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('employee_quran_competency')
            .upsert(payload, { onConflict: 'employee_id' })
            .select()
            .single() as any;

        if (error) throw error;

        // 3. Log history for changed dimensions
        const dimensions: { dim: 'R' | 'T' | 'H' | 'P', key: keyof EmployeeQuranCompetency, levelKey: string }[] = [
            { dim: 'R', key: 'readingLevel', levelKey: 'reading_level' },
            { dim: 'T', key: 'tajwidLevel', levelKey: 'tajwid_level' },
            { dim: 'H', key: 'memorizationLevel', levelKey: 'memorization_level' },
            { dim: 'P', key: 'understandingLevel', levelKey: 'understanding_level' }
        ];

        for (const d of dimensions) {
            // @ts-ignore
            const oldLevel = current ? current[d.key] : null;
            // @ts-ignore
            const newLevel = assessment[d.key];

            if (oldLevel !== newLevel) {
                await supabase.from('employee_quran_history').insert({
                    employee_id: assessment.employeeId,
                    dimension: d.dim,
                    from_level: oldLevel,
                    to_level: newLevel,
                    updated_at: new Date().toISOString()
                });
            }
        }

        return {
            id: data.id,
            employeeId: data.employee_id,
            readingLevel: data.reading_level,
            tajwidLevel: data.tajwid_level,
            memorizationLevel: data.memorization_level,
            understandingLevel: data.understanding_level,
            readingChecklist: data.reading_checklist || [],
            tajwidChecklist: data.tajwid_checklist || [],
            memorizationChecklist: data.memorization_checklist || [],
            understandingChecklist: data.understanding_checklist || [],
            assessedAt: data.assessed_at,
            assessorId: data.assessor_id
        };
    } catch (error) {
        console.error('Error saving quran assessment:', error);
        return null;
    }
};

/**
 * Get quran competency history for an employee
 */
export const getEmployeeQuranHistory = async (employeeId: string): Promise<EmployeeQuranHistory[]> => {
    const { data, error } = await supabase
        .from('employee_quran_history')
        .select('*')
        .eq('employee_id', employeeId)
        .order('updated_at', { ascending: false }) as any;

    if (error) {
        console.error('Error fetching quran history:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        employeeId: item.employee_id,
        dimension: item.dimension,
        fromLevel: item.from_level,
        toLevel: item.to_level,
        updatedAt: item.updated_at
    }));
};

/**
 * Get all individual quran competencies
 */
export const getAllQuranCompetencies = async (): Promise<EmployeeQuranCompetency[]> => {
    const { data, error } = await supabase
        .from('employee_quran_competency')
        .select('*') as any;

    if (error) {
        console.error('Error fetching all quran competencies:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        employeeId: item.employee_id,
        readingLevel: item.reading_level,
        tajwidLevel: item.tajwid_level,
        memorizationLevel: item.memorization_level,
        understandingLevel: item.understanding_level,
        readingChecklist: item.reading_checklist || [],
        tajwidChecklist: item.tajwid_checklist || [],
        memorizationChecklist: item.memorization_checklist || [],
        understandingChecklist: item.understanding_checklist || [],
        assessedAt: item.assessed_at,
        assessorId: item.assessor_id
    }));
};

/**
 * Get aggregate summary for dashboard
 */
export const getQuranCompetencySummary = async () => {
    const { data, error } = await supabase
        .from('employee_quran_competency')
        .select('reading_level, tajwid_level, memorization_level, understanding_level') as any;

    if (error) {
        console.error('Error fetching summary:', error);
        return null;
    }

    const summary = {
        reading: {} as Record<string, number>,
        tajwid: {} as Record<string, number>,
        memorization: {} as Record<string, number>,
        understanding: {} as Record<string, number>
    };

    data.forEach((item: any) => {
        if (item.reading_level) summary.reading[item.reading_level] = (summary.reading[item.reading_level] || 0) + 1;
        if (item.tajwid_level) summary.tajwid[item.tajwid_level] = (summary.tajwid[item.tajwid_level] || 0) + 1;
        if (item.memorization_level) summary.memorization[item.memorization_level] = (summary.memorization[item.memorization_level] || 0) + 1;
        if (item.understanding_level) summary.understanding[item.understanding_level] = (summary.understanding[item.understanding_level] || 0) + 1;
    });

    return summary;
};
