import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MutabaahLockingMode } from '@/types';
import { getAppSetting, updateAppSetting } from '@/services/appSettingsService';
import { supabase } from '@/lib/supabase';

export interface MutabaahState {
    mutabaahLockingMode: MutabaahLockingMode;
    setMutabaahLockingMode: (mode: MutabaahLockingMode, isSuperAdmin?: boolean, userId?: string) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    subscribeToRealtime: () => () => void; // Returns unsubscribe function
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
                        set({ mutabaahLockingMode: value as MutabaahLockingMode });
                    } else {
                    }
                } catch (error) {
                }
            },

            // Subscribe to realtime updates from Supabase
            subscribeToRealtime: () => {

                const channel = supabase
                    .channel('mutabaah-settings-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'app_settings',
                            filter: 'key=eq.mutabaah_locking_mode'
                        },
                        async (payload) => {
                            const newValue = payload.new.value as MutabaahLockingMode;
                            if (newValue === 'weekly' || newValue === 'monthly') {
                                set({ mutabaahLockingMode: newValue });
                            }
                        }
                    )
                    .subscribe((status) => {
                    });

                // Return unsubscribe function
                return () => {
                    supabase.removeChannel(channel);
                };
            },

            // Update mode (save to Supabase if isSuperAdmin=true)
            setMutabaahLockingMode: async (mode, isSuperAdmin = false, userId) => {

                // Update local state immediately
                set({ mutabaahLockingMode: mode });

                // If super admin, also update in Supabase
                if (isSuperAdmin) {
                    try {
                        const result = await updateAppSetting('mutabaah_locking_mode', mode, userId);
                        if (result.success) {
                        } else {
                        }
                    } catch (error) {
                    }
                }
            },
        }),
        {
            name: 'mutabaah-storage', // localStorage key (fallback)
            storage: createJSONStorage(() => localStorage),
            version: 1, // 🔥 Add version to handle future schema changes
            // 🔥 FIX: Use onRehydrateStorage to always fetch fresh data from Supabase after hydration
            // This ensures localStorage is used as fallback, but Supabase is always the source of truth
            onRehydrateStorage: () => (state) => {
                // Don't need to do anything here - loadFromSupabase() will be called separately and override this
            },
            // 🔥 FIX: Add migration handler for version changes
            migrate: (persistedState: any, version: number) => {
                // If version is 0 or undefined, it's old format
                if (version === 0) {
                    // Reset to default if old format is incompatible
                    return {
                        mutabaahLockingMode: 'weekly'
                    };
                }
                return persistedState as MutabaahState;
            },
        }
    )
);
