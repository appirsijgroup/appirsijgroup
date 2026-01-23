import React, { useState, useMemo, useEffect } from 'react';
import type { Bookmark } from '../services/bookmarkService';
import { Bookmark as BookmarkIcon, Trash2, Search, CalendarDays, X } from 'lucide-react';

interface BookmarksProps {
    bookmarks: Bookmark[];
    toggleBookmark: (surahNumber: number, surahName: string, ayahNumber: number, ayahText?: string, notes?: string | null) => void;
    deleteBookmark: (bookmarkId: string) => void;
    navigateToAyah: (surahNumber: number, ayahNumber: number) => void;
}

const Bookmarks: React.FC<BookmarksProps> = ({ bookmarks, toggleBookmark, navigateToAyah }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filteredBookmarks, setFilteredBookmarks] = useState(bookmarks);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Effect to update the displayed bookmarks if the original prop changes (e.g., an item is deleted elsewhere)
    useEffect(() => {
        if (!isSearching) {
            setFilteredBookmarks(bookmarks);
        }
    }, [bookmarks, isSearching]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSearching(true);

        // Filter by date first
        const dateFiltered = filterDate
            ? bookmarks.filter(b => b.timestamp ? new Date(b.timestamp).toISOString().split('T')[0] === filterDate : false)
            : bookmarks;

        // Then filter by text query
        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            const textFiltered = dateFiltered.filter(
                b => b.surahName.toLowerCase().includes(lowerCaseQuery) ||
                    (b.ayahText && b.ayahText.toLowerCase().includes(lowerCaseQuery))
            );
            setFilteredBookmarks(textFiltered);
        } else {
            setFilteredBookmarks(dateFiltered);
        }

        setIsLoading(false);
    };

    const handleReset = () => {
        setSearchQuery('');
        setFilterDate('');
        setIsSearching(false);
        setFilteredBookmarks(bookmarks);
    };

    const sortedBookmarks = useMemo(() =>
        [...filteredBookmarks].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        [filteredBookmarks]);

    return (
        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 animate-view-change space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Bookmark Ayat Tersimpan</h2>
            </div>

            <form onSubmit={handleSearch} className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari berdasarkan topik, surah, atau kata kunci..."
                            className="w-full bg-gray-900/50 border-2 border-white/20 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white placeholder-gray-400 transition-all"
                        />
                    </div>
                    <div className="relative">
                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full bg-gray-900/50 border-2 border-white/20 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white placeholder-gray-400 transition-all"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-600/50 hover:bg-gray-600/80 text-blue-200 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-400 text-white rounded-full transition-colors disabled:bg-gray-500"
                    >
                        {isLoading ? 'Mencari...' : 'Cari'}
                    </button>
                </div>
            </form>

            {isLoading ? (
                <div className="text-center py-20">
                    <p className="text-lg text-teal-300 animate-pulse">Mencari bookmark yang relevan...</p>
                </div>
            ) : sortedBookmarks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedBookmarks.map((bookmark) => (
                        <div
                            key={`${bookmark.surahNumber}:${bookmark.ayahNumber}:${bookmark.timestamp}`}
                            className="bg-gray-900/50 p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col h-full transition-all duration-300 hover:border-teal-400/50 hover:shadow-teal-500/10 hover:-translate-y-1"
                        >
                            <button
                                onClick={() => navigateToAyah(bookmark.surahNumber, bookmark.ayahNumber)}
                                className="text-left grow"
                            >
                                <div className="flex items-start gap-3">
                                    <BookmarkIcon className="w-5 h-5 text-teal-400 shrink-0 mt-1 fill-current" />
                                    <div>
                                        <h3 className="font-bold text-xl text-teal-300 group-hover:underline">
                                            QS. {bookmark.surahName} [{bookmark.surahNumber}:{bookmark.ayahNumber}]
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Disimpan pada {new Date(bookmark.createdAt || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                {bookmark.notes && (
                                    <blockquote className="mt-4 pl-4 border-l-4 border-teal-500/50">
                                        <p className="text-white italic leading-relaxed line-clamp-4">"{bookmark.notes}"</p>
                                    </blockquote>
                                )}
                            </button>
                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => toggleBookmark(bookmark.surahNumber, bookmark.surahName, bookmark.ayahNumber, bookmark.ayahText, bookmark.notes)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-full transition-colors"
                                    aria-label="Hapus bookmark"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Hapus</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-black/20 rounded-lg border-2 border-dashed border-gray-700">
                    <BookmarkIcon className="w-12 h-12 mx-auto text-gray-500 mb-4 fill-current" />
                    <h3 className="text-xl font-semibold text-white">
                        {isSearching ? 'Bookmark Tidak Ditemukan' : 'Belum Ada Bookmark'}
                    </h3>
                    <p className="text-blue-200 mt-2 max-w-md mx-auto">
                        {isSearching
                            ? 'Tidak ada bookmark yang cocok dengan kriteria pencarian Anda. Coba kata kunci atau tanggal lain.'
                            : 'Anda dapat menyimpan ayat favorit Anda saat membaca Al-Qur\'an untuk dibaca kembali di sini.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Bookmarks;
