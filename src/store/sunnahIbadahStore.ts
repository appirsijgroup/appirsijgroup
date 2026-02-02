import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SunnahIbadah } from '@/types';

const DEFAULT_SUNNAH_IBADAH: SunnahIbadah[] = [
    { id: 'tahajud-default', name: 'Tahajud', type: 'sholat', icon: 'MoonIcon', scheduleType: 'daily', createdBy: 'system', createdByName: 'Sistem' },
    { id: 'dhuha-default', name: 'Dhuha', type: 'sholat', icon: 'SparklesIcon', scheduleType: 'daily', createdBy: 'system', createdByName: 'Sistem' },
    { id: 'puasa-senin-default', name: 'Puasa Senin', type: 'puasa', icon: 'FastingIcon', scheduleType: 'weekly', daysOfWeek: [1], createdBy: 'system', createdByName: 'Sistem' },
    { id: 'puasa-kamis-default', name: 'Puasa Kamis', type: 'puasa', icon: 'FastingIcon', scheduleType: 'weekly', daysOfWeek: [4], createdBy: 'system', createdByName: 'Sistem' },
];

interface SunnahIbadahState {
    sunnahIbadahList: SunnahIbadah[];
    setSunnahIbadahList: (list: SunnahIbadah[]) => void; // 🔥 NEW: Method to replace entire list
    addSunnahIbadah: (ibadahData: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>, creator: { id: string; name: string }) => void;
    updateSunnahIbadah: (ibadahId: string, updates: Partial<SunnahIbadah>) => void;
    deleteSunnahIbadah: (ibadahId: string) => void;
}

export const useSunnahIbadahStore = create<SunnahIbadahState>()(
    persist(
        (set) => ({
            sunnahIbadahList: DEFAULT_SUNNAH_IBADAH,

            setSunnahIbadahList: (list) => {
                set({ sunnahIbadahList: list });
            },

            addSunnahIbadah: (ibadahData, creator) => {
                const newIbadah: SunnahIbadah = {
                    ...ibadahData,
                    id: Date.now().toString(),
                    createdBy: creator.id,
                    createdByName: creator.name,
                };
                set(state => ({ sunnahIbadahList: [...state.sunnahIbadahList, newIbadah] }));
            },

            updateSunnahIbadah: (ibadahId, updates) => {
                set(state => ({
                    sunnahIbadahList: state.sunnahIbadahList.map(ibadah =>
                        ibadah.id === ibadahId ? { ...ibadah, ...updates } : ibadah
                    )
                }));
            },

            deleteSunnahIbadah: (ibadahId) => {
                set(state => ({
                    sunnahIbadahList: state.sunnahIbadahList.filter(ibadah => ibadah.id !== ibadahId)
                }));
            },
        }),
        {
            name: 'sunnah-ibadah-storage',
        }
    )
);
