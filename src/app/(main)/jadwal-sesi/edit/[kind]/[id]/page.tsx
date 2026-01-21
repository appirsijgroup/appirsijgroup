'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useActivityStore } from '@/store/activityStore';
import { useAppDataStore } from '@/store/store';
import { PencilIcon, CalendarIcon, ClockIcon } from '@/components/Icons';
import type { Activity, TeamAttendanceSession } from '@/types';

export default function EditActivitySessionPage() {
    const router = useRouter();
    const params = useParams();
    const kind = params.kind as string;
    const id = params.id as string;

    const { loggedInEmployee } = useAppDataStore();
    const { addToast } = useUIStore();
    const { activities, teamAttendanceSessions, updateActivity, updateTeamAttendanceSessionData } = useActivityStore();

    const [initialData, setInitialData] = useState<Activity | TeamAttendanceSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState(''); // Untuk activity
    const [sessionType, setSessionType] = useState(''); // Untuk session (type field)
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [zoomUrl, setZoomUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [type, setType] = useState(''); // Read-only display
    const [audienceType, setAudienceType] = useState<'public' | 'rules' | 'manual'>('public');

    useEffect(() => {
        const loadData = () => {
            if (!kind || !id) {
                setLoading(false);
                return;
            }

            try {
                let data: Activity | TeamAttendanceSession | undefined;

                if (kind === 'activity') {
                    data = activities.find(a => a.id === id);
                } else if (kind === 'session') {
                    data = teamAttendanceSessions.find(s => s.id === id);
                }

                if (data) {
                    setInitialData(data);

                    // Populate form
                    if (kind === 'activity') {
                        setName(data.name);
                        setDescription(data.description || '');
                    } else {
                        // Session
                        setSessionType(data.type);
                    }

                    setDate(data.date);
                    setStartTime(data.startTime);
                    setEndTime(data.endTime);
                    setZoomUrl(data.zoomUrl || '');
                    setYoutubeUrl(data.youtubeUrl || '');
                    setType('activityType' in data ? data.activityType : data.type);
                    setAudienceType(data.audienceType as 'public' | 'rules' | 'manual');
                } else {
                    addToast('Data tidak ditemukan', 'error');
                    router.push('/jadwal-sesi');
                }
            } catch (err) {
                console.error('Failed to load data:', err);
                addToast('Gagal memuat data', 'error');
                router.push('/jadwal-sesi');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [kind, id, activities, teamAttendanceSessions, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate berdasarkan kind
        if (kind === 'activity' && !name.trim()) {
            addToast('Nama kegiatan wajib diisi', 'error');
            return;
        }
        if (kind === 'session' && !sessionType.trim()) {
            addToast('Jenis sesi wajib diisi', 'error');
            return;
        }
        if (!date || !startTime || !endTime) {
            addToast('Mohon lengkapi semua field wajib', 'error');
            return;
        }

        if (startTime >= endTime) {
            addToast('Waktu mulai harus sebelum waktu selesai', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            if (kind === 'activity') {
                // Update Activity
                await updateActivity(id, {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    date,
                    startTime,
                    endTime,
                    zoomUrl: zoomUrl.trim() || undefined,
                    youtubeUrl: youtubeUrl.trim() || undefined,
                });
            } else if (kind === 'session') {
                // Update Team Session - sessions use 'type' not 'name'
                await updateTeamAttendanceSessionData(id, {
                    type: sessionType.trim(), // For sessions, the field is 'type'
                    date,
                    startTime,
                    endTime,
                    zoomUrl: zoomUrl.trim() || undefined,
                    youtubeUrl: youtubeUrl.trim() || undefined,
                } as any);
            }

            addToast('Data berhasil diupdate!', 'success');
            router.push('/jadwal-sesi');
        } catch (err) {
            console.error('Failed to update:', err);
            addToast('Gagal mengupdate data. Silakan coba lagi.', 'error');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <p>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <div className="text-white">
                    <p>Data tidak ditemukan</p>
                    <button
                        onClick={() => router.push('/jadwal-sesi')}
                        className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/jadwal-sesi')}
                        className="text-gray-300 hover:text-white flex items-center gap-2"
                    >
                        ← Kembali ke Jadwal & Sesi
                    </button>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <PencilIcon className="w-6 h-6" />
                        Edit {kind === 'activity' ? 'Kegiatan' : 'Sesi Presensi'}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name / Type - Editable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                {kind === 'activity' ? 'Nama Kegiatan' : 'Jenis Sesi'}
                            </label>
                            <input
                                type="text"
                                value={kind === 'activity' ? name : sessionType}
                                onChange={(e) => {
                                    if (kind === 'activity') {
                                        setName(e.target.value);
                                    } else {
                                        setSessionType(e.target.value);
                                    }
                                }}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                                placeholder={kind === 'activity' ? 'Masukkan nama kegiatan...' : 'Contoh: KIE, Doa Bersama'}
                                required
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                Tanggal
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-400"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Mulai
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Selesai
                                </label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Description (activities only) */}
                        {kind === 'activity' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Deskripsi
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 min-h-[100px]"
                                    placeholder="Deskripsi kegiatan..."
                                />
                            </div>
                        )}

                        {/* Zoom URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Zoom URL (Opsional)
                            </label>
                            <input
                                type="url"
                                value={zoomUrl}
                                onChange={(e) => setZoomUrl(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400"
                                placeholder="https://zoom.us/j/..."
                            />
                        </div>

                        {/* YouTube URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                YouTube URL (Opsional)
                            </label>
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => router.push('/jadwal-sesi')}
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan Perubahan'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
