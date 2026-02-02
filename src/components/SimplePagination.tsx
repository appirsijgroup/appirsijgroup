'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimplePaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    label?: string;
}

export const SimplePagination: React.FC<SimplePaginationProps> = ({
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    onPageChange,
    isLoading,
    label
}) => {
    if (totalPages <= 1) return null;

    const showingFrom = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
    const showingTo = itemsPerPage && totalCount ? Math.min(currentPage * itemsPerPage, totalCount) : null;

    return (
        <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col-reverse md:flex-row items-center justify-between gap-3 mt-6 rounded-xl">
            <div className="hidden md:block text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider text-center md:text-left w-full md:w-auto">
                {label ? (
                    <span>{label}</span>
                ) : totalCount ? (
                    showingFrom && showingTo ? (
                        <span>Menampilkan {showingFrom} - {showingTo} dari {totalCount} data</span>
                    ) : (
                        <span>Total {totalCount} data</span>
                    )
                ) : null}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-center">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                    title="Halaman Sebelumnya"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="text-white text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">
                    Hal {currentPage} dari {totalPages}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || isLoading}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                    title="Halaman Berikutnya"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default SimplePagination;
