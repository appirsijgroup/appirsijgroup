import { supabase } from '@/lib/supabase';
import type { JobStructure } from '@/types';

/**
 * Job Structure Service
 * Handles job organization structure operations
 */

// Get all job structure
export const getJobStructure = async (): Promise<JobStructure> => {
    const { data, error } = await supabase
        .from('job_structure')
        .select('*');

    if (error) throw error;

    // Transform database rows to JobStructure format
    const structure: JobStructure = { MEDIS: [], 'NON MEDIS': [] };

    (data as any)?.forEach((item: any) => {
        const category = item.profession_category as 'MEDIS' | 'NON MEDIS';

        if (category === 'MEDIS') {
            structure.MEDIS.push({
                unit: item.unit,
                professions: item.professions || []
            });
        } else {
            // NON MEDIS
            structure['NON MEDIS'].push({
                unit: item.unit,
                bagians: item.bagians || []
            });
        }
    });

    return structure;
};

// Get job structure by category
export const getJobStructureByCategory = async (category: 'MEDIS' | 'NON MEDIS'): Promise<JobStructure[typeof category]> => {
    const { data, error } = await supabase
        .from('job_structure')
        .select('*')
        .eq('profession_category', category);

    if (error) throw error;

    if (category === 'MEDIS') {
        return (data as any)?.map((item: any) => ({
            unit: item.unit,
            professions: item.professions || []
        })) || [];
    } else {
        return (data as any)?.map((item: any) => ({
            unit: item.unit,
            bagians: item.bagians || []
        })) || [];
    }
};

// Get units by category
export const getUnitsByCategory = async (category: 'MEDIS' | 'NON MEDIS'): Promise<string[]> => {
    const { data, error } = await supabase
        .from('job_structure')
        .select('unit')
        .eq('profession_category', category);

    if (error) throw error;
    return (data as any)?.map((item: any) => item.unit) || [];
};

// Get bagians by unit (NON MEDIS only)
export const getBagiansByUnit = async (unit: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from('job_structure')
        .select('bagians')
        .eq('profession_category', 'NON MEDIS')
        .eq('unit', unit)
        .single();

    if (error) throw error;

    // Extract bagian names from bagians array
    return (data as any)?.bagians?.map((b: any) => b.bagian) || [];
};

// Get professions by unit and category
export const getProfessionsByUnit = async (
    unit: string,
    category: 'MEDIS' | 'NON MEDIS'
): Promise<string[]> => {
    if (category === 'MEDIS') {
        const { data, error } = await supabase
            .from('job_structure')
            .select('professions')
            .eq('profession_category', 'MEDIS')
            .eq('unit', unit)
            .single();

        if (error) throw error;
        return (data as any)?.professions || [];
    } else {
        // NON MEDIS - get all professions from all bagians in this unit
        const { data, error } = await supabase
            .from('job_structure')
            .select('bagians')
            .eq('profession_category', 'NON MEDIS')
            .eq('unit', unit)
            .single();

        if (error) throw error;

        // Extract all professions from all bagians
        const allProfessions: string[] = [];
        (data as any)?.bagians?.forEach((b: any) => {
            if (b.professions) {
                allProfessions.push(...b.professions);
            }
        });

        return [...new Set(allProfessions)]; // Remove duplicates
    }
};

// Get professions by unit and bagian (NON MEDIS only)
export const getProfessionsByUnitAndBagian = async (
    unit: string,
    bagian: string
): Promise<string[]> => {
    const { data, error } = await supabase
        .from('job_structure')
        .select('bagians')
        .eq('profession_category', 'NON MEDIS')
        .eq('unit', unit)
        .single();

    if (error) throw error;

    // Find the specific bagian and return its professions
    const bagianData = (data as any)?.bagians?.find((b: any) => b.bagian === bagian);
    return bagianData?.professions || [];
};

// Update entire job structure
export const updateJobStructure = async (structure: JobStructure): Promise<void> => {
    // Delete all existing
    await (supabase.from('job_structure') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert MEDIS
    for (const item of structure.MEDIS) {
        await (supabase.from('job_structure') as any).insert({
            profession_category: 'MEDIS',
            unit: item.unit,
            professions: item.professions,
            bagians: []
        });
    }

    // Insert NON MEDIS
    for (const item of structure['NON MEDIS']) {
        await (supabase.from('job_structure') as any).insert({
            profession_category: 'NON MEDIS',
            unit: item.unit,
            professions: [],
            bagians: item.bagians
        });
    }
};

// Add new unit structure
export const addJobStructureItem = async (
    category: 'MEDIS' | 'NON MEDIS',
    item: JobStructure['MEDIS'][number] | JobStructure['NON MEDIS'][number]
): Promise<void> => {
    if (category === 'MEDIS') {
        const medisItem = item as JobStructure['MEDIS'][number];
        await (supabase.from('job_structure') as any).insert({
            profession_category: 'MEDIS',
            unit: medisItem.unit,
            professions: medisItem.professions,
            bagians: []
        });
    } else {
        const nonMedisItem = item as JobStructure['NON MEDIS'][number];
        await (supabase.from('job_structure') as any).insert({
            profession_category: 'NON MEDIS',
            unit: nonMedisItem.unit,
            professions: [],
            bagians: nonMedisItem.bagians
        });
    }
};

// Update unit structure
export const updateJobStructureItem = async (
    category: 'MEDIS' | 'NON MEDIS',
    unit: string,
    item: JobStructure['MEDIS'][number] | JobStructure['NON MEDIS'][number]
): Promise<void> => {
    if (category === 'MEDIS') {
        const medisItem = item as JobStructure['MEDIS'][number];
        const { error } = await (supabase
            .from('job_structure') as any)
            .update({
                unit: medisItem.unit,
                professions: medisItem.professions
            })
            .eq('profession_category', 'MEDIS')
            .eq('unit', unit);

        if (error) throw error;
    } else {
        const nonMedisItem = item as JobStructure['NON MEDIS'][number];
        const { error } = await (supabase
            .from('job_structure') as any)
            .update({
                unit: nonMedisItem.unit,
                bagians: nonMedisItem.bagians
            })
            .eq('profession_category', 'NON MEDIS')
            .eq('unit', unit);

        if (error) throw error;
    }
};

// Delete unit structure
export const deleteJobStructureItem = async (
    category: 'MEDIS' | 'NON MEDIS',
    unit: string
): Promise<void> => {
    const { error } = await supabase
        .from('job_structure')
        .delete()
        .eq('profession_category', category)
        .eq('unit', unit);

    if (error) throw error;
};
