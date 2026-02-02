'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alquran } from '@/components/Alquran';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useBookmarks, useToggleBookmark, useDeleteBookmark } from '@/store/bookmarkStore';
import type { Bookmark, MonthlyReportSubmission } from '@/types';
import { submitQuranReading, getQuranSubmissions, type QuranReadingSubmission } from '@/services/quranSubmissionService';
import { useMutabaahStore } from '@/store/mutabaahStore';


/**
 * AlquranPage
 *
 * Menggunakan useMutabaahStore (Zustand) untuk manajemen state progres
 * dan laporan bulanan.
 */
export default function AlquranPage() {
    const searchParams = useSearchParams();
    const { loggedInEmployee } = useAppDataStore();
    const { addToast } = useUIStore();
    const {
        monthlyProgressData,
        updateMonthlyProgress,
        monthlyReportSubmissions,
        refreshData,
        isLoading: mutabaahLoading
    } = useMutabaahStore();
    const [goToAyah, setGoToAyah] = useState<{ surah: number; ayah: number } | null>(null);

    // React Query untuk bookmarks (otomatis caching, loading, error handling)
    const { data: bookmarks = [], isLoading: bookmarksLoading } = useBookmarks(loggedInEmployee?.id);
    const toggleBookmarkMutation = useToggleBookmark();
    const deleteBookmarkMutation = useDeleteBookmark();

    // Parse URL search params for navigation from bookmarks
    useEffect(() => {
        const surahParam = searchParams.get('surah');
        const ayahParam = searchParams.get('ayah');
        const viewParam = searchParams.get('view');

        if (surahParam && ayahParam) {
            const surahNumber = parseInt(surahParam, 10);
            const ayahNumber = parseInt(ayahParam, 10);

            if (!isNaN(surahNumber) && !isNaN(ayahNumber)) {
                setGoToAyah({ surah: surahNumber, ayah: ayahNumber });

                // Clear URL params after setting goToAyah to prevent re-navigation
                window.history.replaceState({}, '', '/alquran');
            }
        }
    }, [searchParams]);

    // Load monthly reports/mutabaah data on mount
    useEffect(() => {
        if (loggedInEmployee) {
            refreshData();
        }
    }, [loggedInEmployee, refreshData]);

    const handleToggleBookmark = async (bookmark: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { notes?: string | null }) => {
        if (!loggedInEmployee) return;

        try {
            await toggleBookmarkMutation.mutateAsync({
                userId: loggedInEmployee.id,
                surahNumber: bookmark.surahNumber,
                surahName: bookmark.surahName || `Surah ${bookmark.surahNumber}`,
                ayahNumber: bookmark.ayahNumber,
                ayahText: bookmark.ayahText,
                notes: bookmark.notes,
            });
        } catch (error) {
            addToast('Gagal menyimpan bookmark. Silakan coba lagi.', 'error');
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
                addToast('Gagal menghapus bookmark. Silakan coba lagi.', 'error');
            }
        } catch (error) {
            addToast('Terjadi kesalahan saat menghapus bookmark.', 'error');
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
            addToast('Anda harus login untuk melaporkan bacaan.', 'error');
            return;
        }

        try {

            const result = await submitQuranReading(
                loggedInEmployee.id,
                details.surahNumber,
                details.surahName,
                details.startAyah,
                details.endAyah,
                details.date
            );

            if (result) {
                addToast('✅ Bacaan Al-Qur\'an berhasil disimpan!', 'success');

                // 🔥 CRITICAL FIX: Update Mutabaah with the CORRECT activity field
                const monthKey = details.date.substring(0, 7); // "YYYY-MM"
                const dayKey = details.date.substring(8, 10); // "DD"

                const currentMonthProgress = monthlyProgressData[monthKey] || {};
                const currentDayProgress = currentMonthProgress[dayKey] || {};

                // 🔥 FIX: BERSIHKAN data sebelum disimpan!
                // Filter out any foreign fields from current month data
                const cleanedMonthProgress: any = {};
                Object.keys(currentMonthProgress).forEach(key => {
                    // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
                    if (key.match(/^\d{2}$/)) {
                        cleanedMonthProgress[key] = currentMonthProgress[key];
                    }
                    // Field asing (kie, doaBersama, dll) akan DIHAPUS!
                });

                // ✅ Use the same field as the activity ID: 'baca_alquran_buku'
                const updatedDayProgress = {
                    ...currentDayProgress,
                    'baca_alquran_buku': true,
                };

                const updatedMonthProgress = {
                    ...cleanedMonthProgress,
                    [dayKey]: updatedDayProgress,
                };


                await updateMonthlyProgress(monthKey, updatedMonthProgress);


                // 🔥 CRITICAL: Reload employee data to refresh quranReadingHistory
                // This ensures Dashboard shows the updated reading history
                const { getEmployeeById } = await import('@/services/employeeService');
                const updatedEmployee = await getEmployeeById(loggedInEmployee.id);
                if (updatedEmployee) {
                    useAppDataStore.setState({ loggedInEmployee: updatedEmployee });
                }

                // Reload data to refresh UI
                await refreshData();
            } else {
                addToast('❌ Gagal menyimpan bacaan. Silakan coba lagi.', 'error');
            }
        } catch (error) {
            addToast(`❌ Terjadi kesalahan saat menyimpan bacaan: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    };


    return (

        <Alquran
            bookmarks={bookmarks}
            isLoading={mutabaahLoading || bookmarksLoading}
            toggleBookmark={handleToggleBookmark}
            deleteBookmark={handleDeleteBookmark}
            goToAyah={goToAyah}
            clearGoToAyah={() => setGoToAyah(null)}
            onQuranReadingSubmission={handleQuranReadingSubmission}
            monthlyReportSubmissions={monthlyReportSubmissions}
            loggedInEmployee={loggedInEmployee!}
            setGoToAyah={setGoToAyah}
            initialSubView={searchParams.get('view') === 'bookmarks' ? 'bookmarks' : 'surah-list'}
        />
    );
}
