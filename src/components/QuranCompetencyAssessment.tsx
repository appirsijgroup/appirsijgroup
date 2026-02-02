import React, { useState } from 'react';
import { Employee, EmployeeQuranCompetency, QuranDimension } from '@/types';
import { CheckCircle2, Save, X } from 'lucide-react';
import { saveQuranAssessment } from '@/services/quranCompetencyService';
import { useUIStore } from '@/store/store';

interface QuranCompetencyAssessmentProps {
    mentee: Employee;
    assessorId: string;
    onClose: () => void;
    onUpdateMentee: (userId: string, updates: Partial<Employee>) => void;
}

const CHECKLIST_ITEMS = {
    R: [
        { id: 'r1', label: 'Mengenal huruf hijaiyah tunggal & bersambung, mengenal baris (fathah, kasrah, dhommah)', level: 'R1' },
        { id: 'r2', label: 'Mengenal tanda baca panjang (mad ashli), tanwin, sukun, tasydid', level: 'R2' },
        { id: 'r3', label: 'Memahami fawatihus suwar (pembukaan surat), waqaf & ibtida\'', level: 'R3' },
    ],
    T: [
        { id: 't1', label: 'Nun sukun & Tanwin (Idzhar, Idgham, Iqlab, Ikhfa)', level: 'T1' },
        { id: 't2', label: 'Mim sukun, Al-Ta\'rif (Al-Qamariyah, Al-Syamsiyah), Mad Far\'i', level: 'T2' },
        { id: 't3', label: 'Makharijul Huruf & Shifatul Huruf', level: 'T3' },
    ],
    H: [
        { id: 'h1', label: 'An-Naba s/d An-Nas (Juz 30)', level: 'H1' },
        { id: 'h2', label: 'Al-Mulk s/d Al-Mursalat (Juz 29)', level: 'H2' },
        { id: 'h3', label: 'Juz 28', level: 'H3' },
        { id: 'h4', label: 'Al-Baqarah (min. 1 juz / Juz 1)', level: 'H4' },
        { id: 'h5', label: '30 Juz', level: 'H5' },
    ],
    P: [
        { id: 'p1', label: 'Mengenal adab membaca Al-Qur\'an (wudhu, menghadap kiblat)', level: 'P1' },
        { id: 'p2', label: 'Mengetahui arti ayat pilihan (e.g., Al-Fatihah, ayat kursi)', level: 'P2' },
        { id: 'p3', label: 'Memahami tafsir dasar ayat-ayat ibadah', level: 'P3' },
    ]
};

const LEVEL_LABELS: Record<string, string> = {
    'R0': 'Belum bisa membaca', 'R1': 'Terbata-bata', 'R2': 'Lancar (tajwid belum konsisten)', 'R3': 'Lancar dan stabil',
    'T0': 'Belum mengenal tajwid', 'T1': 'Tajwid Dasar', 'T2': 'Tajwid Cukup', 'T3': 'Tajwid Baik',
    'H0': 'Belum ada hafalan', 'H1': 'Juz 30', 'H2': 'Juz 29', 'H3': 'Juz 28', 'H4': 'Juz 1', 'H5': '30 Juz',
    'P0': 'Tanpa pemahaman', 'P1': 'Makna Global', 'P2': 'Ayat Tematik', 'P3': 'Tadabbur & Nilai'
};

const DIMENSION_NAMES: Record<QuranDimension, string> = {
    'R': 'Reading (Membaca)',
    'T': 'Tajwid (Ilmu Baca)',
    'H': 'Hifdzil (Hafalan)',
    'P': 'Pemahaman & Adab'
};

export const QuranCompetencyAssessment: React.FC<QuranCompetencyAssessmentProps> = ({
    mentee,
    assessorId,
    onClose,
    onUpdateMentee
}) => {
    const { addToast } = useUIStore();
    const [isSaving, setIsSaving] = useState(false);

    const [readingList, setReadingList] = useState<string[]>(mentee.quranCompetency?.readingChecklist || []);
    const [tajwidList, setTajwidList] = useState<string[]>(mentee.quranCompetency?.tajwidChecklist || []);
    const [memorizationList, setMemorizationList] = useState<string[]>(mentee.quranCompetency?.memorizationChecklist || []);
    const [understandingList, setUnderstandingList] = useState<string[]>(mentee.quranCompetency?.understandingChecklist || []);

    const calculateLevel = (dimension: QuranDimension, list: string[]) => {
        const items = CHECKLIST_ITEMS[dimension];
        let maxLevel = `${dimension}0`;
        items.forEach(item => { if (list.includes(item.id)) maxLevel = item.level; });
        return maxLevel;
    };

    const readingLevel = calculateLevel('R', readingList);
    const tajwidLevel = calculateLevel('T', tajwidList);
    const memorizationLevel = calculateLevel('H', memorizationList);
    const understandingLevel = calculateLevel('P', understandingList);

    const handleToggle = (id: string, dimension: QuranDimension) => {
        const setter = dimension === 'R' ? setReadingList : dimension === 'T' ? setTajwidList : dimension === 'H' ? setMemorizationList : setUnderstandingList;
        setter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const assessmentData: Omit<EmployeeQuranCompetency, 'id' | 'assessedAt'> = {
            employeeId: mentee.id,
            readingLevel, tajwidLevel, memorizationLevel, understandingLevel,
            readingChecklist: readingList, tajwidChecklist: tajwidList,
            memorizationChecklist: memorizationList, understandingChecklist: understandingList,
            assessorId
        };

        const result = await saveQuranAssessment(assessmentData);
        setIsSaving(false);

        if (result) {
            addToast("Penilaian berhasil disimpan", 'success');
            onUpdateMentee(mentee.id, { quranCompetency: result });
            onClose();
        } else {
            addToast("Gagal menyimpan penilaian", 'error');
        }
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-r from-teal-600 to-teal-700 px-4 md:px-8 py-4 md:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                <div>
                    <h1 className="text-base md:text-xl font-bold text-white">FORMULIR PENILAIAN KOMPETENSI AL-QUR'AN</h1>
                    <p className="text-teal-100 text-xs mt-0.5">Instrumen Pemetaan Spiritual Karyawan</p>
                </div>
            </div>

            {/* Employee Info - Responsive Layout */}
            <div className="border-b border-gray-200">
                {/* Mobile: Vertical List */}
                <div className="md:hidden bg-gray-50 divide-y divide-gray-200">
                    <div className="px-4 py-3">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama Karyawan</label>
                        <p className="text-sm font-semibold text-gray-900">{mentee.name}</p>
                    </div>
                    <div className="px-4 py-3 bg-white">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">NIP</label>
                        <p className="text-sm font-semibold text-gray-900">{mentee.id}</p>
                    </div>
                    <div className="px-4 py-3 bg-gray-50">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Unit Kerja</label>
                        <p className="text-sm text-gray-700">{mentee.unit || '-'}</p>
                    </div>
                    <div className="px-4 py-3 bg-white">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Bagian</label>
                        <p className="text-sm text-gray-700">{mentee.bagian || '-'}</p>
                    </div>
                </div>

                {/* Desktop: Table */}
                <table className="w-full hidden md:table">
                    <tbody className="divide-y divide-gray-200">
                        <tr className="bg-gray-50">
                            <td className="px-6 py-3 text-xs font-bold text-gray-600 uppercase w-48">Nama Karyawan</td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900">{mentee.name}</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-600 uppercase w-32">NIP</td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900">{mentee.id}</td>
                        </tr>
                        <tr className="bg-white">
                            <td className="px-6 py-3 text-xs font-bold text-gray-600 uppercase">Unit Kerja</td>
                            <td className="px-6 py-3 text-sm text-gray-700">{mentee.unit || '-'}</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-600 uppercase">Bagian</td>
                            <td className="px-6 py-3 text-sm text-gray-700">{mentee.bagian || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Level Summary - Compact Inline */}
            <div className="bg-gray-50 px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
                    <span className="text-xs font-bold text-gray-600 uppercase">Level Kompetensi:</span>
                    <div className="flex flex-wrap items-center gap-2 md:gap-6">
                        {[
                            { label: 'Reading', code: readingLevel, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                            { label: 'Tajwid', code: tajwidLevel, color: 'text-blue-700 bg-blue-50 border-blue-300' },
                            { label: 'Hafalan', code: memorizationLevel, color: 'text-purple-700 bg-purple-50 border-purple-300' },
                            { label: 'Adab', code: understandingLevel, color: 'text-amber-700 bg-amber-50 border-amber-300' }
                        ].map(item => (
                            <div key={item.label} className={`inline-flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 border ${item.color} rounded-md`}>
                                <span className="text-[10px] md:text-xs font-semibold">{item.label}:</span>
                                <span className="text-xs md:text-sm font-bold font-mono">{item.code}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Assessment Sections - Compact Grid */}
            <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {(['R', 'T', 'H', 'P'] as QuranDimension[]).map((dimension) => {
                        const currentList = dimension === 'R' ? readingList : dimension === 'T' ? tajwidList : dimension === 'H' ? memorizationList : understandingList;
                        const currentLevel = dimension === 'R' ? readingLevel : dimension === 'T' ? tajwidLevel : dimension === 'H' ? memorizationLevel : understandingLevel;

                        return (
                            <div key={dimension} className="border border-gray-300 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-900">{DIMENSION_NAMES[dimension]}</h3>
                                    <span className="px-2 py-1 bg-white border border-gray-400 rounded text-xs font-mono font-bold text-gray-700">
                                        {currentLevel}
                                    </span>
                                </div>
                                <div className="bg-white p-4 space-y-2">
                                    {CHECKLIST_ITEMS[dimension].map((item, index) => (
                                        <label
                                            key={item.id}
                                            className="flex items-start gap-3 p-3 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={currentList.includes(item.id)}
                                                onChange={() => handleToggle(item.id, dimension)}
                                                className="w-4 h-4 mt-0.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-200 rounded text-xs font-bold text-gray-600">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {item.level}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {item.label}
                                                </p>
                                            </div>
                                            {currentList.includes(item.id) && (
                                                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-3 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                <p className="text-[10px] md:text-xs text-gray-500 italic">
                    * Centang semua kompetensi yang telah dikuasai oleh karyawan. Level akan dihitung otomatis.
                </p>
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                    <button
                        onClick={onClose}
                        className="flex-1 md:flex-none px-4 md:px-5 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 md:flex-none px-5 md:px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Penilaian
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
