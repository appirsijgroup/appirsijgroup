import { create } from 'zustand';
import { type Announcement } from '@/types';
import * as announcementService from '@/services/announcementService';

interface AnnouncementState {
    announcements: Announcement[];
    isLoading: boolean;
    error: string | null;
    isHydrated: boolean;
    loadAnnouncements: (showLoading?: boolean) => Promise<void>;
    addAnnouncement: (data: Omit<Announcement, 'id' | 'timestamp'>, imageFile?: File, documentFile?: File) => Promise<void>;
    updateAnnouncement: (announcementId: string, data: Omit<Announcement, 'id' | 'timestamp' | 'authorId' | 'authorName'>, imageFile?: File, documentFile?: File) => Promise<void>;
    removeAnnouncement: (announcementId: string) => Promise<void>;
    deleteAnnouncement: (announcementId: string) => Promise<void>; // Alias for backward compatibility
    refreshAnnouncements: () => Promise<void>;
}

/**
 * Announcement Store dengan Supabase Integration
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
    addAnnouncement: async (data, imageFile, documentFile) => {
        set({ isLoading: true, error: null });
        try {
            // 1. Create announcement record
            let newAnnouncement = await announcementService.createAnnouncement(data);
            let needsUpdate = false;
            const updates: Partial<Announcement> = {};

            // 2. Upload image if provided
            if (imageFile) {
                try {
                    const imageUrl = await announcementService.uploadAnnouncementImage(imageFile, newAnnouncement.id);
                    updates.imageUrl = imageUrl;
                    needsUpdate = true;
                } catch (uploadError) {
                    console.error('Failed to upload announcement image:', uploadError);
                }
            }

            // 3. Upload document if provided
            if (documentFile) {
                try {
                    const documentUrl = await announcementService.uploadAnnouncementDocument(documentFile, newAnnouncement.id);
                    updates.documentUrl = documentUrl;
                    updates.documentName = documentFile.name;
                    needsUpdate = true;
                } catch (uploadError) {
                    console.error('Failed to upload announcement document:', uploadError);
                }
            }

            // 4. Update announcement if files were uploaded
            if (needsUpdate) {
                newAnnouncement = await announcementService.updateAnnouncement(newAnnouncement.id, updates);
            }

            set((state) => ({
                announcements: [newAnnouncement, ...state.announcements],
                isLoading: false
            }));
        } catch (error: any) {
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
            const updates: Partial<Announcement> = { ...data };

            // Upload new image if provided
            if (imageFile) {
                try {
                    const imageUrl = await announcementService.uploadAnnouncementImage(imageFile, announcementId);
                    updates.imageUrl = imageUrl;
                } catch (uploadError) {
                    console.error('Failed to upload announcement image:', uploadError);
                }
            }

            // Upload new document if provided
            if (documentFile) {
                try {
                    const documentUrl = await announcementService.uploadAnnouncementDocument(documentFile, announcementId);
                    updates.documentUrl = documentUrl;
                    updates.documentName = documentFile.name;
                } catch (uploadError) {
                    console.error('Failed to upload announcement document:', uploadError);
                }
            }

            // Update announcement in database
            const updatedAnnouncement = await announcementService.updateAnnouncement(announcementId, updates);

            // Update local state
            set((state) => ({
                announcements: state.announcements.map((a) =>
                    a.id === announcementId ? updatedAnnouncement : a
                ),
                isLoading: false
            }));
        } catch (error: any) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update announcement',
                isLoading: false
            });
            throw error;
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
            // Throw error back to caller so they can handle it
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
