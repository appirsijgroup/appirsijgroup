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
                    console.log('🔄 [MutabaahStore] Loading mutabaah locking mode from Supabase...');
                    const value = await getAppSetting('mutabaah_locking_mode');
                    console.log('📥 [MutabaahStore] Received value from Supabase:', value);

                    if (value && (value === 'weekly' || value === 'monthly')) {
                        console.log('✅ [MutabaahStore] Updating mutabaah locking mode to:', value);
                        set({ mutabaahLockingMode: value as MutabaahLockingMode });
                        console.log('✅ [MutabaahStore] Mutabaah locking mode updated successfully');
                        console.log('📊 [MutabaahStore] Current state:', get().mutabaahLockingMode);
                    } else {
                        console.warn('⚠️ [MutabaahStore] Invalid or missing value, keeping current value:', value);
                    }
                } catch (error) {
                    console.error('❌ [MutabaahStore] Error loading mutabaah locking mode from Supabase:', error);
                }
            },

            // Subscribe to realtime updates from Supabase
            subscribeToRealtime: () => {
                console.log('🔔 [MutabaahStore] Subscribing to mutabaah settings realtime updates...');

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
                            console.log('📢 [MutabaahStore] Mutabaah setting changed via realtime:', payload);
                            const newValue = payload.new.value as MutabaahLockingMode;
                            if (newValue === 'weekly' || newValue === 'monthly') {
                                console.log('✅ [MutabaahStore] Updating mutabaah locking mode to:', newValue);
                                set({ mutabaahLockingMode: newValue });
                                console.log('📊 [MutabaahStore] Current state after realtime update:', get().mutabaahLockingMode);
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log('📡 [MutabaahStore] Realtime subscription status:', status);
                    });

                // Return unsubscribe function
                return () => {
                    console.log('🔕 [MutabaahStore] Unsubscribing from mutabaah settings realtime updates');
                    supabase.removeChannel(channel);
                };
            },

            // Update mode (save to Supabase if isSuperAdmin=true)
            setMutabaahLockingMode: async (mode, isSuperAdmin = false, userId) => {
                console.log('🔄 [MutabaahStore] setMutabaahLockingMode called with:', mode, 'isSuperAdmin:', isSuperAdmin);

                // Update local state immediately
                set({ mutabaahLockingMode: mode });

                // If super admin, also update in Supabase
                if (isSuperAdmin) {
                    try {
                        const result = await updateAppSetting('mutabaah_locking_mode', mode, userId);
                        if (result.success) {
                            console.log('✅ [MutabaahStore] Mutabaah locking mode saved to Supabase:', mode);
                        } else {
                            console.error('❌ [MutabaahStore] Failed to save to Supabase:', result.error);
                        }
                    } catch (error) {
                        console.error('❌ [MutabaahStore] Error saving mutabaah locking mode to Supabase:', error);
                    }
                }
            },
        }),
        {
            name: 'mutabaah-storage', // localStorage key (fallback)
            storage: createJSONStorage(() => localStorage),
            // 🔥 FIX: Use onRehydrateStorage to always fetch fresh data from Supabase after hydration
            // This ensures localStorage is used as fallback, but Supabase is always the source of truth
            onRehydrateStorage: () => (state) => {
                console.log('💾 [MutabaahStore] Hydration complete. State from localStorage:', state?.mutabaahLockingMode);
                // Don't need to do anything here - loadFromSupabase() will be called separately and override this
            },
        }
    )
);
