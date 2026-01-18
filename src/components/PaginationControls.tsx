'use client';

import React, { useState } from 'react';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from './Icons';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSearch: (term: string) => void;
    onRoleFilter: (role: string) => void;
    onIsActiveFilter: (isActive: boolean | undefined) => void;
    onRefresh: () => void;
    searchTerm: string;
    roleFilter: string;
    isActiveFilter: boolean | undefined;
}

/**
 * Simple Pagination Controls Component
 *
 * Features:
 * - Search input
 * - Role filter dropdown
 * - Active status filter
 * - Previous/Next buttons (NOT multiple page numbers)
 * - Refresh button
 * - Page info display
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    totalPages,
    totalCount,
    hasNext,
    hasPrev,
    onNext,
    onPrev,
    onSearch,
    onRoleFilter,
    onIsActiveFilter,
    onRefresh,
    searchTerm,
    roleFilter,
    isActiveFilter
}) => {
    const [searchInput, setSearchInput] = useState(searchTerm);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchInput);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch(searchInput);
        }
    };

    // Calculate range info
    const itemsPerPage = 15;
    const showingFrom = Math.min((currentPage - 1) * itemsPerPage + 1, totalCount);
    const showingTo = Math.min(currentPage * itemsPerPage, totalCount);

    return (
        <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            {/* Search and Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">

                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={searchInput}
                        onChange={handleSearchChange}
                        onKeyPress={handleKeyPress}
                        className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent text-white placeholder-gray-400"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>

                {/* Role Filter */}
                <select
                    value={roleFilter}
                    onChange={(e) => onRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                >
                    <option value="">Semua Role</option>
                    <option value="super-admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="owner">Owner</option>
                </select>

                {/* Active Status Filter */}
                <select
                    value={isActiveFilter === undefined ? '' : isActiveFilter ? 'true' : 'false'}
                    onChange={(e) => {
                        const val = e.target.value;
                        onIsActiveFilter(val === '' ? undefined : val === 'true');
                    }}
                    className="px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                >
                    <option value="">Semua Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                {/* Refresh Button */}
                <button
                    onClick={onRefresh}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    title="Refresh data"
                >
                    <RefreshIcon className="h-4 w-4" />
                </button>
            </div>

            {/* Pagination Info and Controls */}
            <div className="flex items-center justify-between">
                {/* Info */}
                <div className="text-sm text-gray-400">
                    Menampilkan <span className="text-white font-semibold">{showingFrom}-{showingTo}</span> dari <span className="text-white font-semibold">{totalCount}</span> employees
                </div>

                {/* Page Info */}
                <div className="text-sm text-gray-400">
                    Halaman <span className="text-white font-semibold">{currentPage}</span> dari <span className="text-white font-semibold">{totalPages}</span>
                </div>

                {/* Previous/Next Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                    </button>

                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                        Next
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaginationControls;
