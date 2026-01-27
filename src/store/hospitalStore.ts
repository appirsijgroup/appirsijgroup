
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Hospital } from '@/types';
import { getAllHospitals } from '@/services/hospitalService';

interface HospitalState {
    hospitals: Hospital[];
    isLoading: boolean;
    error: string | null;
    loadHospitals: () => Promise<void>;
    addHospital: (data: Omit<Hospital, 'id' | 'isActive'>) => { success: boolean; error?: string };
    updateHospital: (id: string, data: Partial<Omit<Hospital, 'id'>>) => { success: boolean; error?: string };
    deleteHospital: (id: string) => { success: boolean; error?: string };
    toggleHospitalStatus: (id: string) => void;
}

const initialHospitals: Hospital[] = [{
    id: 'RSIJSP',
    brand: 'RSIJSP',
    name: 'Rumah Sakit Islam Jakarta Sukapura',
    address: 'Jl. Tipar Cakung No.5, Sukapura, Kec. Cilincing, Jakarta Utara',
    logo: null,
    isActive: true,
}];

export const useHospitalStore = create<HospitalState>()(
    persist(
        (set, get) => ({
            hospitals: initialHospitals,
            isLoading: false,
            error: null,
            loadHospitals: async () => {
                set({ isLoading: true });
                try {
                    const hospitals = await getAllHospitals();
                    set({ hospitals, isLoading: false, error: null });
                } catch (err) {
                    console.error('Failed to load hospitals:', err);
                    set({ isLoading: false, error: (err as Error).message });
                }
            },
            addHospital: (data) => {
                const { hospitals } = get();
                const id = data.brand.toUpperCase().replace(/\s/g, '');
                if (hospitals.some(h => h.id === id || h.brand === data.brand)) {
                    return { success: false, error: 'Nama Brand atau ID Rumah Sakit sudah ada.' };
                }
                const newHospital: Hospital = { ...data, id, isActive: true };
                set({ hospitals: [...hospitals, newHospital] });
                return { success: true };
            },
            updateHospital: (id, data) => {
                set(state => ({
                    hospitals: state.hospitals.map(h => h.id === id ? { ...h, ...data } : h)
                }));
                return { success: true };
            },
            deleteHospital: (id) => {
                set(state => ({
                    hospitals: state.hospitals.filter(h => h.id !== id)
                }));
                return { success: true };
            },
            toggleHospitalStatus: (id) => {
                set(state => ({
                    hospitals: state.hospitals.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h)
                }));
            },
        }),
        {
            name: 'hospitals-storage',
        }
    )
);
