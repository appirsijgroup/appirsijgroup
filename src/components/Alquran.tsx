import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Surah, SurahDetail, Employee, MonthlyReportSubmission } from '../types';
import type { Bookmark } from '../services/bookmarkService';
import { fetchSurahs, fetchSurahDetail } from '../services/quranService';
import { Search, ArrowLeft, Bookmark as BookmarkIcon, CheckSquare, Lock, Share2, BookOpen } from 'lucide-react';
import { useUIStore } from '../store/store';
import { timeValidationService } from '../services/timeValidationService';
import MinimalistLoader from './MinimalistLoader';
import PageSkeleton from './PageSkeleton';
import Bookmarks from './Bookmarks';

interface AlquranProps {
    bookmarks: Bookmark[];
    isLoading?: boolean;
    toggleBookmark: (bookmark: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { notes?: string | null }) => void;
    deleteBookmark?: (bookmarkId: string) => void;
    goToAyah: { surah: number; ayah: number } | null;
    clearGoToAyah: () => void;
    onQuranReadingSubmission: (details: { surahName: string; surahNumber: number; startAyah: number; endAyah: number; date: string; }) => void;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    loggedInEmployee: Employee;
    setGoToAyah: (target: { surah: number; ayah: number } | null) => void;
    initialSubView?: 'surah-list' | 'bookmarks';
}
const getBalancedWeeks = (date: Date): { weekIndex: number, days: number[] }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        const currentDate = new Date(year, month, day);
        if (currentDate.getDay() === 6 || day === daysInMonth) { // End of week on Saturday or end of month
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Merge short first week (<= 2 days)
    if (weeks.length > 1 && weeks[0].length <= 2) {
        const firstWeek = weeks.shift()!;
        weeks[0] = [...firstWeek, ...weeks[0]];
    }

    // Merge short last week (<= 2 days)
    if (weeks.length > 1 && weeks[weeks.length - 1].length <= 2) {
        const lastWeek = weeks.pop()!;
        weeks[weeks.length - 1] = [...weeks[weeks.length - 1], ...lastWeek];
    }

    return weeks.map((days, index) => ({ weekIndex: index, days }));
};

const ReportReadingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (startAyah: number, endAyah: number, date: string) => void;
    surah: SurahDetail;
    targetEndAyah: number | null;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    todayForMaxDate: string;
}> = ({ isOpen, onClose, onSubmit, surah, targetEndAyah, monthlyReportSubmissions, todayForMaxDate }) => {
    const [startAyah, setStartAyah] = useState('');
    const [endAyah, setEndAyah] = useState('');
    const [date, setDate] = useState(() => {
        const correctedTime = timeValidationService.getCorrectedTime();
        return correctedTime.toISOString().split('T')[0];
    });
    const [error, setError] = useState('');
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (isOpen && !hasInitialized.current) {
            setStartAyah(''); // Start empty for user input
            setEndAyah(String(targetEndAyah || ''));
            const correctedTime = timeValidationService.getCorrectedTime();
            setDate(correctedTime.toISOString().split('T')[0]);
            setError('');
            hasInitialized.current = true;
        } else if (!isOpen) {
            hasInitialized.current = false;
        }
    }, [isOpen, targetEndAyah]);

    const [isLocked, lockReason] = useMemo(() => {
        if (!date) return [true, "Pilih tanggal"];
        const correctedNow = timeValidationService.getCorrectedTime();
        const today = new Date(correctedNow);
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = date.split('-').map(Number);
        const selectedDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        if (selectedDateObj > today) {
            return [true, "Tidak bisa mengisi tanggal di masa depan."];
        }
        const monthKey = date.slice(0, 7);
        const currentMonthlySubmission = monthlyReportSubmissions.find((s: MonthlyReportSubmission) => s.monthKey === monthKey);
        if (currentMonthlySubmission && (currentMonthlySubmission.status.startsWith('pending_') || currentMonthlySubmission.status === 'approved')) {
            return [true, "Bulan ini sudah diajukan."];
        }
        return [false, ""];
    }, [date, monthlyReportSubmissions]);

    const handleSubmit = () => {
        const start = parseInt(startAyah, 10);
        const end = parseInt(endAyah, 10);
        if (isNaN(start) || isNaN(end) || start <= 0 || end > surah.jumlahAyat || start > end) {
            setError('Rentang ayat tidak valid. Mohon periksa kembali.');
            return;
        }
        if (!date) {
            setError('Tanggal wajib diisi.');
            return;
        }
        setError('');
        onSubmit(start, end, date);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20 text-center animate-pop-in">
                <h3 className="text-lg font-bold text-white mb-2">Lapor Selesai Membaca</h3>
                <p className="text-blue-200 mb-4">
                    Catat progres membaca <strong>Surah {surah.namaLatin}</strong> Anda.
                </p>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-1">Dari Ayat</label>
                            <input
                                type="number"
                                value={startAyah}
                                onChange={e => setStartAyah(e.target.value)}
                                min="1"
                                max={surah.jumlahAyat}
                                placeholder="Ayat mulai"
                                className="w-full text-center bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-100 mb-1">Sampai Ayat</label>
                            <input
                                type="number"
                                value={endAyah}
                                onChange={e => setEndAyah(e.target.value)}
                                min="1"
                                max={surah.jumlahAyat}
                                className="w-full text-center bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">Pada Tanggal</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            max={todayForMaxDate}
                            className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
                {isLocked ? (
                    <div className="mt-6">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold text-white transition-colors"
                        >
                            Tutup
                        </button>
                        <div className="mt-2 w-full font-semibold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 bg-gray-700/50 text-gray-400 cursor-not-allowed">
                            <Lock className="w-5 h-5" /> {lockReason}
                        </div>
                    </div>
                ) : (
                    <div className="mt-6">
                        <button
                            onClick={handleSubmit}
                            className="w-full py-2 px-4 rounded-lg font-semibold transition-all bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/50"
                        >
                            Lapor Aktivitas
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold text-white transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export const Alquran: React.FC<AlquranProps> = ({
    bookmarks,
    isLoading,
    toggleBookmark,
    deleteBookmark,
    goToAyah,
    clearGoToAyah,
    onQuranReadingSubmission,
    monthlyReportSubmissions,
    loggedInEmployee: _loggedInEmployee,
    setGoToAyah,
    initialSubView = 'surah-list'
}) => {
    const [subView, setSubView] = useState<'surah-list' | 'bookmarks'>(initialSubView);
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const AYAT_PER_PAGE = 25;
    const SURAH_PER_BATCH = 24;
    const [visibleAyahCount, setVisibleAyahCount] = useState(AYAT_PER_PAGE);
    const [visibleSurahCount, setVisibleSurahCount] = useState(SURAH_PER_BATCH);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Reset visible surahs when searching
        setVisibleSurahCount(SURAH_PER_BATCH);
    }, [searchQuery]);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [targetEndAyah, setTargetEndAyah] = useState<number | null>(null);
    const [jumpToSurah, setJumpToSurah] = useState('');
    const [jumpToAyah, setJumpToAyah] = useState('');
    const [pendingBookmark, setPendingBookmark] = useState<{ surahNumber: number; ayahNumber: number; surahName: string; ayahText: string; timestamp: number } | null>(null);
    const [isBookmarkConfirmOpen, setIsBookmarkConfirmOpen] = useState(false);
    const { openShareModal } = useUIStore();

    const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);

    const todayForMaxDate = useMemo(() => {
        const correctedTime = timeValidationService.getCorrectedTime();
        return correctedTime.toISOString().split('T')[0];
    }, []);

    useEffect(() => {
        const loadSurahs = async () => {
            setIsLoadingList(true);
            try {
                const data = await fetchSurahs();
                setSurahs(data);
            } catch (_err) {
                setError('Gagal memuat daftar surah. Silakan coba lagi nanti.');
            } finally {
                setIsLoadingList(false);
            }
        };
        loadSurahs();
    }, []);

    const handleSelectSurah = async (surahNumber: number, targetAyah?: number) => {
        setIsLoadingDetail(true);
        setError(null);
        setSelectedSurah(null);
        try {
            const detail = await fetchSurahDetail(surahNumber);
            if (detail) {
                setSelectedSurah(detail);
                if (targetAyah && targetAyah > AYAT_PER_PAGE) {
                    setVisibleAyahCount(Math.min(targetAyah + 10, detail.jumlahAyat));
                } else {
                    setVisibleAyahCount(AYAT_PER_PAGE);
                }
                ayahRefs.current = new Array(detail.jumlahAyat + 1);
                // When a surah is selected, we should ensure we are in surah-list view
                setSubView('surah-list');
            } else {
                setError('Gagal memuat detail surah. Silakan periksa koneksi internet Anda dan coba lagi.');
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan. Pastikan koneksi internet Anda aktif dan coba lagi.');
        } finally {
            setIsLoadingDetail(false);
        }
    };

    useEffect(() => {
        const handleGoToAyah = async () => {
            if (goToAyah) {
                await handleSelectSurah(goToAyah.surah, goToAyah.ayah);
                setTimeout(() => {
                    ayahRefs.current[goToAyah.ayah]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                    clearGoToAyah();
                }, 300);
            }
        };
        handleGoToAyah();
    }, [goToAyah, clearGoToAyah]);

    const handleBackToList = () => {
        setSelectedSurah(null);
        setError(null);
        ayahRefs.current = [];
    };

    const handleReportSubmit = (startAyah: number, endAyah: number, date: string) => {
        if (!selectedSurah) return;
        onQuranReadingSubmission({
            surahName: selectedSurah.namaLatin,
            surahNumber: selectedSurah.nomor,
            startAyah,
            endAyah,
            date
        });
        setIsReportModalOpen(false);
    };

    const handleJumpToAyah = (e: React.FormEvent) => {
        e.preventDefault();
        const surahNum = parseInt(jumpToSurah, 10);
        const ayahNum = parseInt(jumpToAyah, 10);
        if (isNaN(surahNum) || isNaN(ayahNum) || surahNum < 1 || surahNum > 114 || ayahNum < 1) return;
        setGoToAyah({ surah: surahNum, ayah: ayahNum });
    };

    const handleBookmarkClick = (bookmark: { surahNumber: number; ayahNumber: number; surahName: string; ayahText: string; timestamp: number }) => {
        setPendingBookmark(bookmark);
        setIsBookmarkConfirmOpen(true);
    };

    const handleConfirmBookmark = () => {
        if (pendingBookmark) {
            toggleBookmark(pendingBookmark);
            setPendingBookmark(null);
            setIsBookmarkConfirmOpen(false);
        }
    };

    const handleCancelBookmark = () => {
        setPendingBookmark(null);
        setIsBookmarkConfirmOpen(false);
    };

    const filteredSurahs = useMemo(() => {
        if (!searchQuery) return surahs;
        const lowerQuery = searchQuery.toLowerCase();
        const sanitizedQuery = lowerQuery.replace(/[-'\s]/g, '');
        return surahs.filter(s =>
            s.namaLatin.toLowerCase().replace(/[-&#39;\s]/g, '').includes(sanitizedQuery) ||
            s.arti.toLowerCase().includes(lowerQuery) ||
            String(s.nomor) === lowerQuery.trim()
        );
    }, [surahs, searchQuery]);

    const bookmarkedAyahs = useMemo(() => {
        return new Set(bookmarks.map(b => `${b.surahNumber}:${b.ayahNumber}`));
    }, [bookmarks]);

    const isPrimaryLoading = isLoading || (isLoadingList && surahs.length === 0);

    if (isPrimaryLoading && !selectedSurah) {
        return <PageSkeleton />;
    }

    if (isLoadingDetail || selectedSurah) {
        return (
            <div className="bg-gray-900/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 animate-view-change">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button
                        onClick={handleBackToList}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Kembali ke Daftar Surah
                    </button>
                    <div className="flex items-center gap-2 p-1 bg-black/30 rounded-full border border-white/10">
                        <button
                            onClick={() => setSubView('surah-list')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${subView === 'surah-list' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Surah
                        </button>
                        <button
                            onClick={() => {
                                setSubView('bookmarks');
                                handleBackToList();
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${subView === 'bookmarks' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Bookmark
                        </button>
                    </div>
                </div>

                {isLoadingDetail && (
                    <MinimalistLoader message="Memuat ayat..." />
                )}
                {error && <div className="text-center p-10 text-red-400">{error}</div>}

                {selectedSurah && (
                    <>
                        <div className="space-y-4">
                            <div className="text-center p-6 bg-linear-to-br from-gray-800 to-gray-900 rounded-lg border border-white/10 shadow-lg">
                                <p className="font-serif text-5xl text-white tracking-wider">{selectedSurah.nama}</p>
                                <h2 className="text-3xl font-bold text-teal-300 mt-2">{selectedSurah.namaLatin}</h2>
                                <p className="text-blue-200 mt-1">{selectedSurah.arti}</p>
                                <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest">{selectedSurah.tempatTurun} • {selectedSurah.jumlahAyat} AYAT</p>
                            </div>

                            <div className="space-y-4">
                                {selectedSurah.ayat.slice(0, visibleAyahCount).map((ayah) => (
                                    <div key={ayah.nomorAyat} ref={(el) => { ayahRefs.current[ayah.nomorAyat] = el; }} className="bg-black/20 p-4 rounded-lg border border-white/10">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="px-3 py-1 bg-teal-500/20 text-teal-200 font-bold rounded-full">{selectedSurah.nomor}:{ayah.nomorAyat}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openShareModal('quran', { ayah, surah: selectedSurah })}
                                                    className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                                    aria-label="Bagikan ayat ini"
                                                    title="Bagikan ayat ini sebagai gambar"
                                                >
                                                    <Share2 className="w-6 h-6" />
                                                </button>
                                                <button
                                                    onClick={() => handleBookmarkClick({ surahNumber: selectedSurah.nomor, ayahNumber: ayah.nomorAyat, surahName: selectedSurah.namaLatin, ayahText: ayah.teksIndonesia, timestamp: Date.now() })}
                                                    className="p-2 text-gray-400 hover:text-white"
                                                    aria-label="Bookmark ayat ini"
                                                >
                                                    {bookmarkedAyahs.has(`${selectedSurah.nomor}:${ayah.nomorAyat}`) ? (
                                                        <BookmarkIcon className="w-6 h-6 text-teal-400 fill-current" />
                                                    ) : (
                                                        <BookmarkIcon className="w-6 h-6" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setTargetEndAyah(ayah.nomorAyat);
                                                        setIsReportModalOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-white"
                                                    aria-label="Laporkan telah membaca ayat ini"
                                                    title="Laporkan selesai membaca sampai ayat ini"
                                                >
                                                    <CheckSquare className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                        <p dir="rtl" className="font-serif text-3xl sm:text-4xl text-right text-white leading-loose mb-6">{ayah.teksArab}</p>
                                        <hr className="border-t border-white/10 my-4" />
                                        <p className="text-blue-200 italic text-sm mb-2">{ayah.teksLatin}</p>
                                        <p className="text-white text-sm">&quot;{ayah.teksIndonesia}&quot;</p>
                                    </div>
                                ))}

                                {selectedSurah && visibleAyahCount < selectedSurah.jumlahAyat && (
                                    <div className="py-8 flex flex-col items-center gap-4">
                                        <button
                                            onClick={() => setVisibleAyahCount(prev => Math.min(prev + AYAT_PER_PAGE, selectedSurah.jumlahAyat))}
                                            className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                                        >
                                            Tampilkan {Math.min(AYAT_PER_PAGE, selectedSurah.jumlahAyat - visibleAyahCount)} Ayat Selanjutnya
                                        </button>
                                        <button
                                            onClick={() => setVisibleAyahCount(selectedSurah.jumlahAyat)}
                                            className="text-teal-400 hover:text-teal-300 text-sm font-medium underline underline-offset-4 transition-colors"
                                        >
                                            Tampilkan Semua ({selectedSurah.jumlahAyat} Ayat)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <ReportReadingModal
                            isOpen={isReportModalOpen}
                            onClose={() => setIsReportModalOpen(false)}
                            onSubmit={handleReportSubmit}
                            surah={selectedSurah}
                            targetEndAyah={targetEndAyah}
                            monthlyReportSubmissions={monthlyReportSubmissions}
                            todayForMaxDate={todayForMaxDate}
                        />
                    </>
                )}

                {isBookmarkConfirmOpen && createPortal(
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60">
                        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20 text-center">
                            <div className="mb-4">
                                <BookmarkIcon className="w-16 h-16 text-teal-400 mx-auto fill-current" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                    ? 'Hapus Bookmark?'
                                    : 'Simpan Bookmark?'}
                            </h3>
                            <p className="text-blue-200 mb-6">
                                {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                    ? `Anda yakin ingin menghapus bookmark untuk ${pendingBookmark.surahName} ayat ${pendingBookmark.ayahNumber}?`
                                    : `Simpan bookmark untuk ${pendingBookmark?.surahName} ayat ${pendingBookmark?.ayahNumber}?`}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelBookmark}
                                    className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmBookmark}
                                    className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
                                >
                                    {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                        ? 'Hapus'
                                        : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white text-center sm:text-left">Al-Qur'an Digital</h2>
                        <p className="text-blue-200 text-sm text-center sm:text-left mt-1">Baca dan pelajari Al-Qur'an kapan saja, di mana saja.</p>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            onClick={() => setSubView('surah-list')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${subView === 'surah-list' ? 'bg-teal-600 text-white shadow-xl scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Daftar Surah
                        </button>
                        <button
                            onClick={() => setSubView('bookmarks')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${subView === 'bookmarks' ? 'bg-teal-600 text-white shadow-xl scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <BookmarkIcon className="w-4 h-4" />
                            Bookmark Saya {bookmarks.length > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{bookmarks.length}</span>}
                        </button>
                    </div>
                </div>

                {subView === 'surah-list' ? (
                    <div className="animate-view-change">
                        <div className="mb-6 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative grow w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Cari surah berdasarkan nama atau nomor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/10 border border-white/30 rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white placeholder-gray-400"
                                />
                            </div>
                            <form onSubmit={handleJumpToAyah} className="w-full sm:w-auto shrink-0 flex items-center gap-2 bg-gray-900/50 border-2 border-white/20 rounded-full p-1.5">
                                <input
                                    type="number"
                                    value={jumpToSurah}
                                    onChange={e => setJumpToSurah(e.target.value)}
                                    placeholder="Surah"
                                    min="1" max="114"
                                    className="w-20 bg-transparent text-center focus:outline-none text-white placeholder-gray-400 appearance-none [-moz-appearance:textfield]"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number"
                                    value={jumpToAyah}
                                    onChange={e => setJumpToAyah(e.target.value)}
                                    placeholder="Ayah"
                                    min="1"
                                    className="w-20 bg-transparent text-center focus:outline-none text-white placeholder-gray-400 appearance-none [-moz-appearance:textfield]"
                                />
                                <button type="submit" className="px-4 py-1.5 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-400 text-sm transition-colors">
                                    Buka
                                </button>
                            </form>
                        </div>

                        {isLoadingList && (
                            <MinimalistLoader message="Memuat surah..." />
                        )}
                        {error && <div className="text-center p-10 text-red-400">{error}</div>}

                        {filteredSurahs.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredSurahs.slice(0, visibleSurahCount).map((surah) => (
                                        <button
                                            key={surah.nomor}
                                            onClick={() => handleSelectSurah(surah.nomor)}
                                            className="group p-4 rounded-xl border border-white/10 bg-linear-to-br from-gray-800/50 to-gray-900/50 hover:border-teal-400/50 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all duration-300 text-left flex items-center space-x-4"
                                        >
                                            <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-gray-700/50 group-hover:bg-teal-500/20 rounded-lg text-teal-300 font-bold text-lg transition-colors">
                                                {surah.nomor}
                                            </div>
                                            <div className="grow overflow-hidden">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-lg text-white truncate">{surah.namaLatin}</h3>
                                                    <p className="font-serif text-xl text-teal-200/80 -mt-1 shrink-0">{surah.nama}</p>
                                                </div>
                                                <p className="text-blue-200 text-sm truncate">{surah.arti}</p>
                                                <p className="text-xs text-gray-400 mt-1">{surah.jumlahAyat} ayat • {surah.tempatTurun}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {visibleSurahCount < filteredSurahs.length && (
                                    <div className="mt-12 flex flex-col items-center gap-4">
                                        <button
                                            onClick={() => setVisibleSurahCount(prev => prev + SURAH_PER_BATCH)}
                                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 shadow-lg transition-all transform hover:scale-105"
                                        >
                                            Tampilkan Surah Selanjutnya
                                        </button>
                                        <p className="text-xs text-gray-500">
                                            Memperlihatkan {visibleSurahCount} dari {filteredSurahs.length} surah
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="animate-view-change">
                        <Bookmarks
                            bookmarks={bookmarks}
                            toggleBookmark={(sn, name, an, text, notes) => toggleBookmark({ surahNumber: sn, surahName: name, ayahNumber: an, ayahText: text, timestamp: Date.now(), notes })}
                            deleteBookmark={deleteBookmark || (() => { })}
                            navigateToAyah={(sn, an) => setGoToAyah({ surah: sn, ayah: an })}
                        />
                    </div>
                )}
            </div>

            {isBookmarkConfirmOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20 text-center">
                        <div className="mb-4">
                            <BookmarkIcon className="w-16 h-16 text-teal-400 mx-auto fill-current" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                ? 'Hapus Bookmark?'
                                : 'Simpan Bookmark?'}
                        </h3>
                        <p className="text-blue-200 mb-6">
                            {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                ? `Anda yakin ingin menghapus bookmark untuk ${pendingBookmark.surahName} ayat ${pendingBookmark.ayahNumber}?`
                                : `Simpan bookmark untuk ${pendingBookmark?.surahName} ayat ${pendingBookmark?.ayahNumber}?`}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelBookmark}
                                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmBookmark}
                                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
                            >
                                {pendingBookmark && bookmarkedAyahs.has(`${pendingBookmark.surahNumber}:${pendingBookmark.ayahNumber}`)
                                    ? 'Hapus'
                                    : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

