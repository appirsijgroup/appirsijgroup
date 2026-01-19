import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Announcement } from '@/types';
import * as announcementService from '@/services/announcementService';

interface AnnouncementState {
    announcements: Announcement[];
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;
    loadAnnouncements: (showLoading?: boolean) => Promise<void>;
    addAnnouncement: (data: Omit<Announcement, 'id' | 'timestamp'>) => Promise<void>;
    removeAnnouncement: (announcementId: string) => Promise<void>;
    deleteAnnouncement: (announcementId: string) => Promise<void>; // Alias for backward compatibility
    refreshAnnouncements: () => Promise<void>;
}

/**
 * Announcement Store dengan Supabase Integration
 *
 * Cara penggunaan:
 * 1. Di component, panggil loadAnnouncements() di useEffect
 * 2. Gunakan addAnnouncement/removeAnnouncement seperti biasa
 * 3. Data akan otomatis disinkronkan ke Supabase
 *
 * Notes:
 * - Rename file ini ke announcementStore.ts untuk mengganti yang lama
 */
export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
    announcements: [],
    isLoading: false,
    error: null,
    isHydrated: false,
    loadAnnouncements: async (showLoading = true) => {
        if (showLoading) {
            set({ isLoading: true, error: null });
        }
        try {
            const data = await announcementService.getAllAnnouncements();
            set({ announcements: data, isHydrated: true, isLoading: false });
        } catch (error: any) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load announcements',
                isLoading: false
            });
        }
    },
    addAnnouncement: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const newAnnouncement = await announcementService.createAnnouncement(data);
            set((state) => ({
                announcements: [newAnnouncement, ...state.announcements],
                isLoading: false
            }));
        } catch (error: any) {
            set({
                error: error instanceof Error ? error.message : 'Failed to add announcement',
                isLoading: false
            });
        }
    },
    removeAnnouncement: async (announcementId) => {
        set({ isLoading: true, error: null });
        try {
            // Step 1: Delete from database
            await announcementService.deleteAnnouncement(announcementId);

            // Step 2: Optimistically remove from local state immediately
            set((state) => ({
                announcements: state.announcements.filter((a) => a.id !== announcementId),
                isLoading: false
            }));

            // Step 3: Reload silently in background to ensure consistency
            await get().loadAnnouncements(false); // false = don't show loading spinner

        } catch (error: any) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete announcement',
                isLoading: false
            });
            // Reload data to restore state after error
            await get().loadAnnouncements(false);
            // 🔥 FIX: Throw error back to caller so they can handle it
            throw error;
        }
    },
    refreshAnnouncements: async () => {
        await get().loadAnnouncements();
    },
    deleteAnnouncement: async (announcementId) => {
        // Alias for backward compatibility
        return get().removeAnnouncement(announcementId);
    }
}));
