import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JobStructure } from '@/types';

interface JobStructureState {
    jobStructure: JobStructure;
    updateJobStructure: (newStructure: JobStructure) => void;
}

export const useJobStructureStore = create<JobStructureState>()(
    persist(
        (set) => ({
            jobStructure: { MEDIS: [], 'NON MEDIS': [] },
            updateJobStructure: (newStructure) => {
                set({ jobStructure: newStructure });
            },
        }),
        {
            name: 'job-structure-storage',
        }
    )
);
