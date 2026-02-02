import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Bookmark } from '@/types';
import {
    getUserBookmarks,
    deleteBookmark,
    toggleBookmark as toggleBookmarkService
} from '@/services/bookmarkService';

// --- Zustand Store for UI State ---

interface BookmarkUIState {
    isDeleteModalOpen: boolean;
    selectedBookmarkId: string | null;
    openDeleteModal: (id: string) => void;
    closeDeleteModal: () => void;
}

export const useBookmarkStore = create<BookmarkUIState>((set) => ({
    isDeleteModalOpen: false,
    selectedBookmarkId: null,
    openDeleteModal: (id) => set({ isDeleteModalOpen: true, selectedBookmarkId: id }),
    closeDeleteModal: () => set({ isDeleteModalOpen: false, selectedBookmarkId: null }),
}));

// --- React Query Hooks for Data Management ---

const BOOKMARKS_QUERY_KEY = ['bookmarks'];

/**
 * Hook untuk fetch bookmarks dengan React Query
 * Otomatis caching, refetch, dan error handling
 */
export function useBookmarks(userId: string | undefined) {
    return useQuery({
        queryKey: [BOOKMARKS_QUERY_KEY, userId],
        queryFn: () => {
            if (!userId) throw new Error('User ID is required');
            return getUserBookmarks(userId);
        },
        enabled: !!userId, // Only run query if userId exists
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook untuk toggle bookmark dengan React Query mutation
 * Otomatis update cache dan refetch
 */
export function useToggleBookmark() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            surahNumber,
            surahName,
            ayahNumber,
            ayahText,
            notes
        }: {
            userId: string;
            surahNumber: number;
            surahName: string;
            ayahNumber: number;
            ayahText?: string;
            notes?: string | null;
        }) => {
            return toggleBookmarkService(userId, surahNumber, surahName, ayahNumber, ayahText, notes);
        },
        onSuccess: (result, variables) => {
            // Invalidate and refetch bookmarks
            queryClient.invalidateQueries({
                queryKey: [BOOKMARKS_QUERY_KEY, variables.userId]
            });
        },
    });
}

/**
 * Hook untuk delete bookmark dengan React Query mutation
 * Otomatis update cache dan refetch
 */
export function useDeleteBookmark() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ bookmarkId, userId }: { bookmarkId: string; userId: string }) => {
            return deleteBookmark(bookmarkId, userId);
        },
        onSuccess: (_, variables) => {
            // Invalidate and refetch bookmarks
            queryClient.invalidateQueries({
                queryKey: [BOOKMARKS_QUERY_KEY, variables.userId]
            });
        },
    });
}

/**
 * Hook untuk prefetch bookmarks (digunakan untuk optimasi navigasi)
 */
export function usePrefetchBookmarks() {
    const queryClient = useQueryClient();

    return (userId: string) => {
        queryClient.prefetchQuery({
            queryKey: [BOOKMARKS_QUERY_KEY, userId],
            queryFn: () => getUserBookmarks(userId),
            staleTime: 1000 * 60 * 5, // 5 minutes
        });
    };
}
