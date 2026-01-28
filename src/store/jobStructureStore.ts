import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JobStructure } from '@/types';

interface JobStructureState {
    jobStructure: JobStructure;
    updateJobStructure: (newStructure: JobStructure) => void;
    fetchJobStructure: () => Promise<void>;
}

export const useJobStructureStore = create<JobStructureState>()(
    persist(
        (set) => ({
            jobStructure: { MEDIS: [], 'NON MEDIS': [] },
            updateJobStructure: (newStructure) => {
                set({ jobStructure: newStructure });
            },
            fetchJobStructure: async () => {
                try {
                    const { getJobStructure } = await import('@/services/jobStructureService');
                    const structure = await getJobStructure();
                    set({ jobStructure: structure });
                } catch (error) {
                    console.error('Failed to fetch job structure:', error);
                }
            },
        }),
        {
            name: 'job-structure-storage',
        }
    )
);
