import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee } from '@/types';

interface AppDataState {
  loggedInEmployee: Employee | null;
  isHydrated: boolean;
  setLoggedInEmployee: (employee: Employee) => void;
  clearLoggedInEmployee: () => void;
  setIsHydrated: (isHydrated: boolean) => void;
}

export const useAppDataStore = create<AppDataState>()(
  persist(
    (set) => ({
      loggedInEmployee: null,
      isHydrated: false,
      setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee }),
      clearLoggedInEmployee: () => set({ loggedInEmployee: null }),
      setIsHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'app-data-storage', // name of the item in the storage (must be unique)
    }
  )
);