
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Hospital } from '@/types';

interface HospitalState {
    hospitals: Hospital[];
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
            name: 'hospitals-storage', // name of the item in the storage (must be unique)
            // The initial state is used if storage is empty. If a user deletes all hospitals,
            // the state will correctly be an empty array on the next load.
            // This behavior is slightly different but better than the original.
        }
    )
);
