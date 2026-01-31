'use client';

import React, { useState, useMemo } from 'react';
import { PRAYER_GUIDES } from '../data/guides';
import type { PrayerGuide } from '../types';
import { MosqueIcon, SparklesIcon, ChevronDownIcon, ArrowLeftIcon } from './Icons';
import { useUIStore } from '@/store/store';
import { Copy } from 'lucide-react';

interface PanduanSholatProps {
    searchQuery: string;
}

// Tampilan detail untuk panduan yang dipilih
const GuideDetailView: React.FC<{ guide: PrayerGuide; onBack: () => void }> = ({ guide, onBack }) => {
    const [openStepId, setOpenStepId] = useState<number | null>(1);
    const { addToast } = useUIStore();

    const handleCopy = (step: any) => {
        const textToCopy = `${step.title}\n\n${step.arabic}\n\n${step.latin}\n\n"Artinya: ${step.translation}"`;
        navigator.clipboard.writeText(textToCopy);
        addToast('Bacaan sholat berhasil disalin!', 'success');
    };

    const toggleStep = (id: number) => {
        setOpenStepId(openStepId === id ? null : id);
    };

    return (
        <div className="animate-view-change">
            <button
                onClick={onBack}
                className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-sm font-semibold rounded-lg text-blue-200 hover:text-white transition-colors"
            >
                <ArrowLeftIcon className="h-5 w-5" />
                Kembali ke Daftar Panduan
            </button>
            <div className="text-center mb-8 p-6 bg-linear-to-br from-gray-800 to-gray-900/50 rounded-2xl border border-white/10 shadow-lg">
                <h2 className="text-3xl font-bold text-white">{guide.title}</h2>
                <p className="text-blue-200 mt-1">{guide.description}</p>
                <p className="text-xs text-gray-400 mt-3">Sumber: {guide.source}</p>
            </div>
            <div className="space-y-3">
                {guide.steps.map((step) => (
                    <div key={step.id} className="border border-white/10 rounded-xl overflow-hidden bg-black/20 transition-all duration-300">
                        <button
                            onClick={() => toggleStep(step.id)}
                            className="w-full flex justify-between items-center p-5 hover:bg-white/5 text-left"
                            aria-expanded={openStepId === step.id}
                        >
                            <span className="font-semibold text-lg text-teal-300">{step.id}. {step.title}</span>
                            <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-300 ${openStepId === step.id ? 'rotate-180' : ''}`} />
                        </button>
                        <div
                            className={`grid transition-all duration-500 ease-in-out ${openStepId === step.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="p-5 sm:p-6 border-t border-white/10 bg-black/20">
                                    {/* Header: Description & Actions */}
                                    <div className="flex justify-between items-start mb-6 gap-4">
                                        <div className="grow">
                                            {step.description && (
                                                <p className="text-blue-200 italic text-sm border-l-2 border-teal-500/50 pl-3">
                                                    &quot;{step.description}&quot;
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(step)}
                                            className="shrink-0 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 group"
                                            title="Salin bacaan"
                                        >
                                            <span className="text-xs font-medium hidden group-hover:block text-teal-300">Salin</span>
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Content Block */}
                                    <div className="space-y-6">
                                        {/* Arabic */}
                                        <div className="py-2">
                                            <p dir="rtl" className="text-3xl sm:text-4xl text-right text-white font-serif leading-loose tracking-wide">
                                                {step.arabic}
                                            </p>
                                        </div>

                                        {/* Latin & Translation */}
                                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Bacaan Latin</p>
                                                <p className="text-teal-100 font-medium leading-relaxed">{step.latin}</p>
                                            </div>
                                            <div className="pt-3 border-t border-white/5">
                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Artinya</p>
                                                <p className="text-gray-300 italic">&quot;{step.translation}&quot;</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GuideCard: React.FC<{ guide: PrayerGuide; onSelect: () => void; icon: React.ReactNode }> = ({ guide, onSelect, icon }) => (
    <button
        onClick={onSelect}
        className="group p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all duration-300 text-left flex items-start gap-4 h-full"
    >
        <div className="shrink-0 mt-1 p-3 rounded-full bg-gray-700/50 group-hover:bg-teal-500/20 text-teal-300 transition-colors">
            {icon}
        </div>
        <div className="grow">
            <h3 className="font-semibold text-lg text-white group-hover:text-teal-300 transition-colors">{guide.title}</h3>
            <p className="text-blue-200 text-sm mt-1">{guide.description}</p>
        </div>
    </button>
);

const PanduanSholat: React.FC<PanduanSholatProps> = ({ searchQuery }) => {
    const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

    const selectedGuide = useMemo(() => {
        if (!selectedGuideId) return null;
        return PRAYER_GUIDES.find(g => g.id === selectedGuideId) ?? null;
    }, [selectedGuideId]);

    const filteredGuides = useMemo(() => {
        if (!searchQuery) {
            return PRAYER_GUIDES;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return PRAYER_GUIDES.filter(guide =>
            guide.title.toLowerCase().includes(lowercasedQuery) ||
            guide.description.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery]);

    const fardhuGuides = useMemo(() => {
        const fardhuIds = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya', 'jenazah-laki', 'jenazah-perempuan'];
        return filteredGuides.filter(g => fardhuIds.includes(g.id));
    }, [filteredGuides]);

    const sunnahGuides = useMemo(() => {
        const sunnahIds = ['dhuha', 'gerhana', 'tahajud', 'idul_fitri', 'idul_adha'];
        return filteredGuides.filter(g => sunnahIds.includes(g.id));
    }, [filteredGuides]);

    if (selectedGuide) {
        return <GuideDetailView guide={selectedGuide} onBack={() => setSelectedGuideId(null)} />;
    }

    if (filteredGuides.length === 0 && searchQuery) {
        return (
            <div className="text-center py-16 animate-fade-in">
                <p className="text-lg text-blue-200">Panduan tidak ditemukan untuk "{searchQuery}".</p>
                <p className="text-sm text-gray-400 mt-2">Coba gunakan kata kunci lain.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in">
            {fardhuGuides.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4 border-l-4 border-teal-400 pl-4">Sholat Fardhu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fardhuGuides.map(guide =>
                            <GuideCard
                                key={guide.id}
                                guide={guide}
                                onSelect={() => setSelectedGuideId(guide.id)}
                                icon={<MosqueIcon className="w-6 h-6" />}
                            />
                        )}
                    </div>
                </div>
            )}
            {sunnahGuides.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4 border-l-4 border-teal-400 pl-4">Sholat Sunnah</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sunnahGuides.map(guide =>
                            <GuideCard
                                key={guide.id}
                                guide={guide}
                                onSelect={() => setSelectedGuideId(guide.id)}
                                icon={<SparklesIcon className="w-6 h-6" />}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PanduanSholat;
