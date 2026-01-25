'use client';

import React, { useState, useMemo } from 'react';
import { type TadarusRequest, type MissedPrayerRequest } from '../types';
import { FileText, PlusCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { PRAYERS } from '../data/prayers';
import { useUIStore } from '@/store/store';

import { getTodayLocalDateString, createLocalDate } from '../utils/dateUtils';

export interface UnifiedManualRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTadarusSubmit: (date: string, category: TadarusRequest['category'], notes: string) => void;
    onMissedPrayerSubmit: (data: { date: string, prayerId: string, prayerName: string, reason: string }) => void;
}

export const UnifiedManualRequestModal: React.FC<UnifiedManualRequestModalProps> = ({
    isOpen,
    onClose,
    onTadarusSubmit,
    onMissedPrayerSubmit
}) => {
    const { addToast } = useUIStore();
    const [requestType, setRequestType] = useState<'tadarus' | 'prayer'>('tadarus');

    // Shared state
    // FIX: Use getTodayLocalDateString() to get the correct server/local date
    const [date, setDate] = useState(getTodayLocalDateString());
    const [notes, setNotes] = useState('');

    // Tadarus spesific
    const [category, setCategory] = useState<TadarusRequest['category']>('BBQ');

    // Prayer specific
    const [prayerId, setPrayerId] = useState('');
    const wajibPrayers = useMemo(() => PRAYERS.filter(p => p.type === 'wajib' && p.id !== 'jumat'), []);

    // Max date for prayer is yesterday
    // Calculate based on corrected today's date
    const todayDate = createLocalDate(getTodayLocalDateString());
    todayDate.setDate(todayDate.getDate() - 1);
    const maxPrayerDate = todayDate.toISOString().split('T')[0];

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!date) {
            addToast("Tanggal harus diisi.", 'error');
            return;
        }

        if (requestType === 'tadarus') {
            if (!category) {
                addToast("Pilih jenis kegiatan.", 'error');
                return;
            }
            onTadarusSubmit(date, category, notes);
        } else {
            if (!prayerId || !notes) {
                addToast("Pilih sholat dan isi alasan.", 'error');
                return;
            }
            const prayerName = wajibPrayers.find(p => p.id === prayerId)?.name || 'Sholat Wajib';
            onMissedPrayerSubmit({ date, prayerId, prayerName, reason: notes });
        }

        // Reset and close
        setNotes('');
        setPrayerId('');
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-9999 animate-fade-in">
            <div className="bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 animate-pop-in overflow-hidden">
                <div className="h-1.5 bg-linear-to-r from-teal-400 to-indigo-500" />

                <div className="p-8">
                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                        <FileText className="text-teal-400" />
                        Pengajuan Manual
                    </h3>

                    <div className="space-y-6">
                        {/* Type Selector */}
                        <div>
                            <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-2 px-1">
                                Jenis Pengajuan
                            </label>
                            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                                <button
                                    onClick={() => setRequestType('tadarus')}
                                    className={`py-2 rounded-xl font-bold text-sm transition-all ${requestType === 'tadarus' ? 'bg-teal-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Sesi & Tadarus
                                </button>
                                <button
                                    onClick={() => setRequestType('prayer')}
                                    className={`py-2 rounded-xl font-bold text-sm transition-all ${requestType === 'prayer' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Sholat Terlewat
                                </button>
                            </div>
                        </div>

                        {/* Date Field */}
                        <div>
                            <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-2 px-1">
                                Tanggal Agenda
                            </label>
                            <input
                                type="date"
                                value={date}
                                max={requestType === 'prayer' ? maxPrayerDate : undefined}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 focus:outline-none text-white font-medium"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        {/* Session Category Selector (Conditional) */}
                        {requestType === 'tadarus' && (
                            <div className="animate-fade-in">
                                <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-2 px-1">
                                    Pilih Jenis Kegiatan
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value as TadarusRequest['category'])}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 focus:outline-none text-white font-medium appearance-none"
                                >
                                    <optgroup label="Sesi Presensi" className="text-teal-400 font-bold bg-gray-800">
                                        <option value="BBQ" className="bg-gray-800 text-white">Bimbingan Baca Al-Qur'an (BBQ)</option>
                                        <option value="UMUM" className="bg-gray-800 text-white">Tadarus Umum</option>
                                        <option value="KIE" className="bg-gray-800 text-white">KIE (Komunikasi & Edukasi)</option>
                                        <option value="Doa Bersama" className="bg-gray-800 text-white">Doa Bersama</option>
                                    </optgroup>
                                    <optgroup label="Kegiatan Terjadwal" className="text-teal-400 font-bold bg-gray-800">
                                        <option value="Kajian Selasa" className="bg-gray-800 text-white">Kajian Selasa</option>
                                        <option value="Pengajian Persyarikatan" className="bg-gray-800 text-white">Pengajian Persyarikatan</option>
                                        <option value="Umum" className="bg-gray-800 text-white">Kegiatan Umum Lainnya</option>
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        {/* Prayer Selector (Conditional) */}
                        {requestType === 'prayer' && (
                            <div className="animate-fade-in">
                                <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-2 px-1">
                                    Pilih Sholat
                                </label>
                                <select
                                    value={prayerId}
                                    onChange={e => setPrayerId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 focus:outline-none text-white font-medium appearance-none"
                                >
                                    <option value="" className="bg-gray-800 text-white">-- Pilih Sholat --</option>
                                    {wajibPrayers.map(p => <option key={p.id} value={p.id} className="bg-gray-800 text-white">{p.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Notes / Reason */}
                        <div>
                            <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest block mb-2 px-1">
                                {requestType === 'tadarus' ? 'Catatan Tambahan' : 'Alasan Terlewat'}
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 focus:outline-none text-white placeholder:text-gray-600 font-medium resize-none"
                                placeholder={requestType === 'tadarus' ? "Contoh: Tadarus mandiri juz 30..." : "Contoh: Ketiduran atau lupa presensi..."}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 transition-all border border-white/10"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            className={`flex-1 py-4 px-6 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 ${requestType === 'tadarus' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-indigo-500 hover:bg-indigo-400'}`}
                        >
                            Kirim
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
