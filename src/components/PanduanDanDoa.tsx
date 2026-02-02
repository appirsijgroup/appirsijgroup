'use client';

import React, { useState, useEffect } from 'react';
import PanduanSholat from './PanduanSholat';
import KumpulanDoa from './KumpulanDoa';
import { SearchIcon, XIcon } from './Icons';

interface PanduanDanDoaProps {
    searchQuery: string;
    clearSearchQuery?: () => void; // Made optional - no longer passed from server
    initialTab: 'panduan' | 'doa';
}

// Tab button component for navigation
interface TabButtonProps {
    tabId: 'panduan' | 'doa';
    label: string;
    activeTab: 'panduan' | 'doa';
    onTabChange: (tabId: 'panduan' | 'doa') => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tabId, label, activeTab, onTabChange }) => (
    <button
        onClick={() => onTabChange(tabId)}
        className={`w-full py-3 px-5 text-center font-semibold rounded-lg transition-all duration-300
            ${activeTab === tabId
                ? 'bg-teal-500 text-white shadow-lg'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
    >
        {label}
    </button>
);

const PanduanDanDoa: React.FC<PanduanDanDoaProps> = ({ searchQuery: initialSearchQuery, clearSearchQuery, initialTab }) => {
    const [activeTab, setActiveTab] = useState<'panduan' | 'doa'>(initialTab || 'panduan');
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

    useEffect(() => {
        if (initialSearchQuery) {
            setSearchQuery(initialSearchQuery);
            setActiveTab(initialTab);
        }
    }, [initialSearchQuery, initialTab]);

    // Cleanup effect for the prop-based search query
    // Only calls clearSearchQuery if it's provided
    useEffect(() => {
        return () => {
            if (initialSearchQuery && clearSearchQuery) {
                clearSearchQuery();
            }
        };
    }, [initialSearchQuery, clearSearchQuery]);

    return (
        <div className="space-y-6 animate-view-change">
            <div className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-4">
                {/* Search Bar */}
                <div className="relative w-full max-w-lg mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder={activeTab === 'panduan' ? "Cari panduan sholat (cth: jenazah, dhuha)..." : "Cari doa harian (cth: tidur, makan)..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900/50 border-2 border-white/20 rounded-full py-3 pl-12 pr-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white placeholder-gray-400 transition-all"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-4">
                            <XIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                        </button>
                    )}
                </div>

                {/* Tab Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <TabButton tabId="panduan" label="Panduan Sholat" activeTab={activeTab} onTabChange={setActiveTab} />
                    <TabButton tabId="doa" label="Kumpulan Doa" activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
            </div>

            {/* Content */}
            <div>
                {activeTab === 'panduan' && <PanduanSholat searchQuery={searchQuery} />}
                {activeTab === 'doa' && <KumpulanDoa searchQuery={searchQuery} />}
            </div>
        </div>
    );
};

export default PanduanDanDoa;
