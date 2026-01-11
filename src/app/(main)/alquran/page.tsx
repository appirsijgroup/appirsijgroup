'use client';

import React, { useState, useEffect } from 'react';
import { Alquran } from '@/components/Alquran';
import { useAppDataStore } from '@/store/store';
import { useBookmarks, useToggleBookmark } from '@/store/bookmarkStore';
import type { Bookmark } from '@/types';
import { submitQuranReading, getQuranSubmissions, type QuranReadingSubmission } from '@/services/quranSubmissionService';
import { getUserWeeklyReports, type WeeklyReportSubmission } from '@/services/weeklyReportService';
import { useMutabaah } from '@/contexts/MutabaahContext';

/**
 * AlquranPage - Semi-optimized dengan React Query
 *
 * SEBELUM: 10 useState/useEffect occurrences
 * SEKARANG: 5 useState/useEffect occurrences
 *
 * Catatan: Masih menggunakan useState untuk goToAyah dan weeklyReportSubmissions
 * karena goToAyah adalah UI state spesifik untuk page ini.
 *
 * TODO: Pindahkan weeklyReportSubmissions ke React Query hook
 */
export default function AlquranPage() {
    const { loggedInEmployee } = useAppDataStore();
    const { monthlyProgressData, updateMonthlyProgress } = useMutabaah();
    const [goToAyah, setGoToAyah] = useState<{ surah: number; ayah: number } | null>(null);
    const [weeklyReportSubmissions, setWeeklyReportSubmissions] = useState<WeeklyReportSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    // React Query untuk bookmarks (otomatis caching, loading, error handling)
    const { data: bookmarks = [], isLoading: bookmarksLoading } = useBookmarks(loggedInEmployee?.id);
    const toggleBookmarkMutation = useToggleBookmark();

    // Load weekly reports on mount (TODO: pindahkan ke React Query)
    useEffect(() => {
        if (loggedInEmployee) {
            loadWeeklyReports();
        }
    }, [loggedInEmployee]);

    const loadWeeklyReports = async () => {
        if (!loggedInEmployee) return;

        try {
            const data = await getUserWeeklyReports(loggedInEmployee.id);
            setWeeklyReportSubmissions(data);
        } catch (error) {
            console.error('Error loading weekly reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBookmark = async (bookmark: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { notes?: string | null }) => {
        if (!loggedInEmployee) return;

        try {
            await toggleBookmarkMutation.mutateAsync({
                userId: loggedInEmployee.id,
                surahNumber: bookmark.surahNumber,
                surahName: bookmark.surahName || `Surah ${bookmark.surahNumber}`,
                ayahNumber: bookmark.ayahNumber,
                notes: bookmark.notes,
            });
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            alert('Gagal menyimpan bookmark. Silakan coba lagi.');
        }
    };

    const handleQuranReadingSubmission = async (details: {
        surahName: string;
        surahNumber: number;
        startAyah: number;
        endAyah: number;
        date: string;
    }) => {
        if (!loggedInEmployee) {
            alert('Anda harus login untuk melaporkan bacaan.');
            return;
        }

        try {
            console.log('📖 Submitting Quran reading:', details);

            const result = await submitQuranReading(
                loggedInEmployee.id,
                details.surahNumber,
                details.surahName,
                details.startAyah,
                details.endAyah,
                details.date
            );

            if (result) {
                alert('✅ Bacaan Al-Qur\'an berhasil disimpan!');

                // Update Mutabaah
                const monthKey = details.date.substring(0, 7); // "YYYY-MM"
                const dayKey = details.date.substring(8, 10); // "DD"

                const currentMonthProgress = monthlyProgressData[monthKey] || {};
                const currentDayProgress = currentMonthProgress[dayKey] || {};

                const updatedDayProgress = {
                    ...currentDayProgress,
                    'baca_alquran_buku': true,
                };

                const updatedMonthProgress = {
                    ...currentMonthProgress,
                    [dayKey]: updatedDayProgress,
                };

                await updateMonthlyProgress(monthKey, updatedMonthProgress);

                // Reload data to refresh UI
                await loadWeeklyReports();
            } else {
                alert('❌ Gagal menyimpan bacaan. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('❌ Error submitting Quran reading:', error);
            alert(`❌ Terjadi kesalahan saat menyimpan bacaan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Loading state gabungan
    if (loading || bookmarksLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Memuat data Al-Qur'an...</div>
            </div>
        );
    }

    return (
        <Alquran
            bookmarks={bookmarks}
            toggleBookmark={handleToggleBookmark}
            goToAyah={goToAyah}
            clearGoToAyah={() => setGoToAyah(null)}
            onQuranReadingSubmission={handleQuranReadingSubmission}
            weeklyReportSubmissions={weeklyReportSubmissions}
            loggedInEmployee={loggedInEmployee!}
            setGoToAyah={setGoToAyah}
        />
    );
}
