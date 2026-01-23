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
    addAnnouncement: (data: Omit<Announcement, 'id' | 'timestamp'>, imageFile?: File, documentFile?: File) => Promise<void>;
    updateAnnouncement: (announcementId: string, data: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, imageFile?: File, documentFile?: File) => Promise<void>;
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
            set({
                error: error instanceof Error ? error.message : 'Failed to load announcements',
                isLoading: false
            });
        }
    },

    addAnnouncement: async (data, imageFile, documentFile) => {
        set({ isLoading: true, error: null });

        try {
            const newAnnouncement = await announcementService.createAnnouncement(data);

            // Upload files if provided
            let imageUrl = newAnnouncement.imageUrl;
            let documentUrl = newAnnouncement.documentUrl;

            if (imageFile) {
                imageUrl = await announcementService.uploadAnnouncementImage(imageFile, newAnnouncement.id);
            }
            if (documentFile) {
                documentUrl = await announcementService.uploadAnnouncementDocument(documentFile, newAnnouncement.id);
            }

            // Update announcement with file URLs if any were uploaded
            if (imageUrl || documentUrl) {
                const updatedAnnouncement = await announcementService.updateAnnouncement(newAnnouncement.id, {
                    ...(imageUrl && { imageUrl }),
                    ...(documentUrl && { documentUrl }),
                });
                set((state) => ({
                    announcements: [updatedAnnouncement, ...state.announcements],
                    isLoading: false
                }));
            } else {
                set((state) => ({
                    announcements: [newAnnouncement, ...state.announcements],
                    isLoading: false
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to add announcement',
                isLoading: false
            });
            throw error;
        }
    },

    updateAnnouncement: async (announcementId, data, imageFile, documentFile) => {
        set({ isLoading: true, error: null });

        try {
            // Upload new files if provided
            let imageUrl = data.imageUrl;
            let documentUrl = data.documentUrl;

            if (imageFile) {
                imageUrl = await announcementService.uploadAnnouncementImage(imageFile, announcementId);
            }
            if (documentFile) {
                documentUrl = await announcementService.uploadAnnouncementDocument(documentFile, announcementId);
            }

            // Update announcement with new data and file URLs
            const updatedAnnouncement = await announcementService.updateAnnouncement(announcementId, {
                ...data,
                ...(imageUrl && { imageUrl }),
                ...(documentUrl && { documentUrl }),
            });

            set((state) => ({
                announcements: state.announcements.map((a) =>
                    a.id === announcementId ? updatedAnnouncement : a
                ),
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update announcement',
                isLoading: false
            });
            throw error;
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
