'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Bookmarks from '@/components/Bookmarks';
import { useAppDataStore } from '@/store/store';
import { useBookmarks, useToggleBookmark, useDeleteBookmark } from '@/store/bookmarkStore';

/**
 * BookmarksPage - Optimized dengan React Query + Zustand
 *
 * SEBELUM: 7 useState/useEffect occurrences
 * SEKARANG: 0 useState/useEffect occurrences
 *
 * Optimasi:
 * - Data fetching dengan React Query (caching, refetch otomatis)
 * - Mutations dengan React Query (auto cache update)
 * - Tidak ada manual state management
 */
export default function BookmarksPage() {
    const { loggedInEmployee } = useAppDataStore();
    const router = useRouter();

    // React Query untuk data fetching (otomatis loading state, error handling, caching)
    const {
        data: bookmarks = [],
        isLoading,
        error,
    } = useBookmarks(loggedInEmployee?.id);

    // React Query mutations
    const toggleBookmarkMutation = useToggleBookmark();
    const deleteBookmarkMutation = useDeleteBookmark();

    // Handlers - tidak perlu manual state update, React Query handle everything
    const handleToggleBookmark = async (
        surahNumber: number,
        surahName: string,
        ayahNumber: number,
        ayahText?: string,
        notes?: string | null
    ) => {
        if (!loggedInEmployee) return;

        try {
            await toggleBookmarkMutation.mutateAsync({
                userId: loggedInEmployee.id,
                surahNumber,
                surahName,
                ayahNumber,
                ayahText,
                notes,
            });
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            alert('Gagal menyimpan bookmark. Silakan coba lagi.');
        }
    };

    const handleDeleteBookmark = async (bookmarkId: string) => {
        if (!loggedInEmployee) return;

        try {
            const success = await deleteBookmarkMutation.mutateAsync({
                bookmarkId,
                userId: loggedInEmployee.id,
            });
            if (!success) {
                alert('Gagal menghapus bookmark. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Error deleting bookmark:', error);
            alert('Terjadi kesalahan saat menghapus bookmark.');
        }
    };

    const handleNavigateToAyah = (surahNumber: number, ayahNumber: number) => {
        // 🔥 FIX: Use Next.js router for client-side navigation (no full page reload)
        router.push(`/alquran?surah=${surahNumber}&ayah=${ayahNumber}`);
    };

    // Loading state otomatis dari React Query
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Memuat bookmark...</div>
            </div>
        );
    }

    // Error state otomatis dari React Query
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-400">
                    Gagal memuat bookmark. Silakan refresh halaman.
                </div>
            </div>
        );
    }

    return (
        <Bookmarks
            bookmarks={bookmarks}
            toggleBookmark={handleToggleBookmark}
            deleteBookmark={handleDeleteBookmark}
            navigateToAyah={handleNavigateToAyah}
        />
    );
}
