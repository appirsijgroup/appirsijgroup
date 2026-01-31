'use client';

import React, { useMemo } from 'react';
import { KUMPULAN_DOA } from '../data/guides';
import { useUIStore } from '../store/store';
import { ShareIcon } from './Icons';
import { Copy } from 'lucide-react';

interface KumpulanDoaProps {
    searchQuery: string;
}

const KumpulanDoa: React.FC<KumpulanDoaProps> = ({ searchQuery }) => {
    const { openShareModal, addToast } = useUIStore();

    const handleCopy = (doa: { title: string; arabic: string; latin: string; translation: string }) => {
        const textToCopy = `${doa.title}\n\n${doa.arabic}\n\n${doa.latin}\n\n"${doa.translation}"`;
        navigator.clipboard.writeText(textToCopy);
        addToast('Teks doa berhasil disalin ke clipboard!', 'success');
    };

    const filteredDoa = useMemo(() => {
        if (!searchQuery) {
            return KUMPULAN_DOA;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return KUMPULAN_DOA.filter(doa =>
            doa.title.toLowerCase().includes(lowercasedQuery) ||
            doa.latin.toLowerCase().includes(lowercasedQuery) ||
            doa.translation.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery]);

    if (filteredDoa.length === 0 && searchQuery) {
        return (
            <div className="text-center py-16 animate-fade-in">
                <p className="text-lg text-blue-200">Doa tidak ditemukan untuk &quot;{searchQuery}&quot;.</p>
                <p className="text-sm text-gray-400 mt-2">Coba gunakan kata kunci lain.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredDoa.map((doa) => (
                    <div key={doa.id} className="bg-gray-900/50 p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col space-y-6 h-full transition-all duration-300 hover:border-teal-400/50 hover:shadow-teal-500/10 relative">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-xl text-teal-300 pr-10">{doa.title}</h3>
                            <button
                                onClick={() => openShareModal('doa', doa)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                title="Bagikan doa ini"
                            >
                                <ShareIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleCopy(doa)}
                                className="absolute top-4 right-14 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                title="Salin teks doa"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grow space-y-6">
                            <p dir="rtl" className="text-3xl sm:text-4xl text-right text-white font-serif leading-loose">{doa.arabic}</p>
                            <p className="text-blue-200 italic text-base">{doa.latin}</p>
                            <div>
                                <p className="text-sm font-semibold text-gray-300 mb-1">Artinya:</p>
                                <p className="text-white text-base">&quot;{doa.translation}&quot;</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KumpulanDoa;