import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MutabaahLockingMode } from '@/types';
import { getAppSetting, updateAppSetting } from '@/services/appSettingsService';

export interface MutabaahState {
    mutabaahLockingMode: MutabaahLockingMode;
    setMutabaahLockingMode: (mode: MutabaahLockingMode, isSuperAdmin?: boolean) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
}

export const useMutabaahStore = create<MutabaahState>()(
    persist(
        (set, get) => ({
            mutabaahLockingMode: 'weekly', // Default: perpekan locking

            // Load settings from Supabase on init
            loadFromSupabase: async () => {
                try {
                    const value = await getAppSetting('mutabaah_locking_mode');
                    if (value && (value === 'weekly' || value === 'monthly')) {
                        console.log('✅ Loaded mutabaah locking mode from Supabase:', value);
                        set({ mutabaahLockingMode: value as MutabaahLockingMode });
                    }
                } catch (error) {
                    console.error('❌ Error loading mutabaah locking mode from Supabase:', error);
                }
            },

            // Update mode (save to Supabase if isSuperAdmin=true)
            setMutabaahLockingMode: async (mode, isSuperAdmin = false) => {
                // Update local state immediately
                set({ mutabaahLockingMode: mode });

                // If super admin, also update in Supabase
                if (isSuperAdmin) {
                    try {
                        const result = await updateAppSetting('mutabaah_locking_mode', mode);
                        if (result.success) {
                            console.log('✅ Mutabaah locking mode saved to Supabase:', mode);
                        } else {
                            console.error('❌ Failed to save to Supabase:', result.error);
                        }
                    } catch (error) {
                        console.error('❌ Error saving mutabaah locking mode to Supabase:', error);
                    }
                }
            },
        }),
        {
            name: 'mutabaah-storage', // localStorage key (fallback)
            storage: createJSONStorage(() => localStorage),
        }
    )
);
