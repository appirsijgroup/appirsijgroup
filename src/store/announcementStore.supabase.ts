import { create } from 'zustand';
import { type Announcement } from '@/types';
import * as announcementService from '@/services/announcementService';

interface AnnouncementState {
    announcements: Announcement[];
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;

    // Actions
    loadAnnouncements: () => Promise<void>;
    addAnnouncement: (data: Omit<Announcement, 'id' | 'timestamp'>) => Promise<void>;
    deleteAnnouncement: (announcementId: string) => Promise<void>;
    refreshAnnouncements: () => Promise<void>;
}

/**
 * Announcement Store dengan Supabase Integration
 *
 * Cara pakai:
 * 1. Di component, panggil loadAnnouncements() di useEffect
 * 2. Gunakan addAnnouncement/deleteAnnouncement seperti biasa
 *
 * Migration:
 * - Rename file ini ke announcementStore.ts untuk mengganti yang lama
 * - Atau gunakan store baru ini di component yang butuh real-time
 */
export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
    announcements: [],
    isLoading: false,
    error: null,
    isHydrated: false,

    loadAnnouncements: async () => {
        set({ isLoading: true, error: null });

        try {
            const data = await announcementService.getAllAnnouncements();
            set({ announcements: data, isHydrated: true, isLoading: false });
        } catch (error) {
            console.error('Error loading announcements:', error);
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
        } catch (error) {
            console.error('Error adding announcement:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to add announcement',
                isLoading: false
            });
        }
    },

    deleteAnnouncement: async (announcementId) => {
        set({ isLoading: true, error: null });

        try {
            await announcementService.deleteAnnouncement(announcementId);
            set((state) => ({
                announcements: state.announcements.filter((a) => a.id !== announcementId),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error deleting announcement:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to delete announcement',
                isLoading: false
            });
        }
    },

    refreshAnnouncements: async () => {
        await get().loadAnnouncements();
    },
}));

// Optional: Selector hooks untuk optimized re-renders
export const useAnnouncements = () => useAnnouncementStore((state) => state.announcements);
export const useAnnouncementsLoading = () => useAnnouncementStore((state) => state.isLoading);
export const useAnnouncementsError = () => useAnnouncementStore((state) => state.error);
