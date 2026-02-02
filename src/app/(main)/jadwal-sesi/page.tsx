'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { PlusCircleIcon, CalendarIcon, UsersIcon, ClockIcon } from '@/components/Icons';
import ConfirmationModal from '@/components/ConfirmationModal';
import type { Activity, TeamAttendanceSession } from '@/types';
import { CombinedScheduleTable, CombinedScheduleItem } from '@/components/CombinedScheduleTable';

export default function JadwalSesiPage() {
    const { loggedInEmployee } = useAppDataStore();
    const { addToast } = useUIStore();
    const { activities, deleteActivity, teamAttendanceSessions, deleteTeamAttendanceSession, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase } = useActivityStore();
    const { setGlobalLoading } = useUIStore();
    const router = useRouter();

    // State for ConfirmationModal
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        item: CombinedScheduleItem | null;
    }>({
        isOpen: false,
        item: null,
    });

    // ⚡ TAMBAH: Auto-load data dari Supabase saat halaman mount
    useEffect(() => {
        const loadData = async () => {
            if (!loggedInEmployee) return;

            try {
                // Filter by creatorId if not super-admin
                const isSuperAdmin = loggedInEmployee.role === 'super-admin';
                const creatorId = isSuperAdmin ? undefined : loggedInEmployee.id;

                await loadTeamAttendanceSessionsFromSupabase(creatorId);
                await loadActivitiesFromSupabase(undefined, creatorId);
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        };

        loadData();
    }, [loggedInEmployee, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase]);

    // ⚡ TAMBAH: State for filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'activity' | 'session'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    const months = [
        { value: 'all', label: 'Semua Bulan' },
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const currentYear = new Date().getFullYear();
    const years = ['all', ...Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())];

    const handleEdit = (item: CombinedScheduleItem) => {
        // ⚡ FIX: Sertakan kind (activity/session) di URL agar edit page tahu jenis item
        router.push(`/jadwal-sesi/edit/${item.kind}/${item.id}`);
    };

    const handleDeleteClick = (item: CombinedScheduleItem) => {
        setDeleteModal({
            isOpen: true,
            item,
        });
    };

    const handleDeleteConfirm = async () => {
        const item = deleteModal.item;
        if (!item) return;

        try {
            if (item.kind === 'activity') {
                await deleteActivity(item.id);
            } else {
                await deleteTeamAttendanceSession(item.id);
            }
            // ⚡ TAMBAH: Reload data dari Supabase setelah delete (tetap gunakan filter)
            const isSuperAdmin = loggedInEmployee?.role === 'super-admin';
            const creatorId = isSuperAdmin ? undefined : loggedInEmployee?.id;
            await loadTeamAttendanceSessionsFromSupabase(creatorId);
            await loadActivitiesFromSupabase(undefined, creatorId);
            addToast('Item berhasil dihapus', 'success');
        } catch (error) {
            console.error('Failed to delete:', error);
            addToast('Gagal menghapus item. Silakan coba lagi.', 'error');
        } finally {
            setDeleteModal({ isOpen: false, item: null });
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal({ isOpen: false, item: null });
    };

    const combinedItems = useMemo((): CombinedScheduleItem[] => {
        const activityItems: CombinedScheduleItem[] = activities.map(a => ({
            id: a.id,
            kind: 'activity',
            name: a.name,
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            type: a.activityType || 'Umum',
            original: a,
        }));

        const sessionItems: CombinedScheduleItem[] = (teamAttendanceSessions || []).map(s => ({
            id: s.id,
            kind: 'session',
            name: s.type,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            type: s.type,
            mode: s.attendanceMode === 'self' ? 'Mandiri' : 'Oleh Atasan',
            original: s,
        }));

        let filtered = [...activityItems, ...sessionItems];

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(item => item.kind === filterType);
        }

        // Apply date filter (Month & Year)
        if (selectedMonth !== 'all' || selectedYear !== 'all') {
            filtered = filtered.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                const itemMonth = (itemDate.getMonth() + 1).toString().padStart(2, '0');
                const itemYear = itemDate.getFullYear().toString();

                const monthMatch = selectedMonth === 'all' || itemMonth === selectedMonth;
                const yearMatch = selectedYear === 'all' || itemYear === selectedYear;

                return monthMatch && yearMatch;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) => {
            // ⚡ FIX: Handle undefined/null values safely
            const dateA = a.date || '';
            const dateB = b.date || '';
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';

            const dateComparison = dateB.localeCompare(dateA);
            if (dateComparison !== 0) return dateComparison;
            return timeA.localeCompare(timeB);
        });
    }, [activities, teamAttendanceSessions, searchQuery, filterType, selectedMonth, selectedYear]);


    if (!loggedInEmployee) {
        return (
            <div className="flex items-center justify-center py-20 text-center">
                <p className="text-white/60 text-xl font-medium">Silakan login terlebih dahulu</p>
            </div>
        );
    }

    // Calculate stats
    const totalActivities = activities.length;
    const totalSessions = teamAttendanceSessions?.length || 0;
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.date === today).length;
    const todaySessions = teamAttendanceSessions?.filter(s => s.date === today).length || 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Jadwal & <span className="text-teal-400">Sesi</span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">Kelola jadwal kegiatan dan sesi presensi karyawan secara terpusat.</p>
                </div>
                <button
                    onClick={() => {
                        router.push('/jadwal-sesi/create');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-xl font-bold shadow-xl shadow-teal-500/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                    <PlusCircleIcon className="w-6 h-6" />
                    Buat Baru
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Kegiatan</p>
                            <p className="text-2xl font-bold text-white mt-1">{totalActivities}</p>
                        </div>
                        <CalendarIcon className="w-10 h-10 text-teal-400 opacity-50" />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Kegiatan Hari Ini</p>
                            <p className="text-2xl font-bold text-white mt-1">{todayActivities}</p>
                        </div>
                        <ClockIcon className="w-10 h-10 text-blue-400 opacity-50" />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sesi</p>
                            <p className="text-2xl font-bold text-white mt-1">{totalSessions}</p>
                        </div>
                        <UsersIcon className="w-10 h-10 text-purple-400 opacity-50" />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Sesi Hari Ini</p>
                            <p className="text-2xl font-bold text-white mt-1">{todaySessions}</p>
                        </div>
                        <ClockIcon className="w-10 h-10 text-pink-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Compact Filters Section */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-8 shadow-xl">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Search bar */}
                    <div className="relative grow w-full">
                        <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-1.5 px-1">Cari Jadwal</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ketik nama kegiatan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-medium"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto shrink-0">
                        {/* Month Picker Dropdown */}
                        <div className="grow sm:w-40">
                            <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-1.5 px-1">Bulan</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-medium appearance-none cursor-pointer"
                            >
                                {months.map((m) => (
                                    <option key={m.value} value={m.value} className="bg-gray-900 text-white font-medium">
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year Picker Dropdown */}
                        <div className="grow sm:w-28">
                            <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-1.5 px-1">Tahun</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-medium appearance-none cursor-pointer"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y} className="bg-gray-900 text-white font-medium">
                                        {y === 'all' ? 'Semua Tahun' : y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="grow sm:w-auto">
                            <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-1.5 px-1">Jenis</label>
                            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${filterType === 'all' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Semua
                                </button>
                                <button
                                    onClick={() => setFilterType('activity')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${filterType === 'activity' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Kegiatan
                                </button>
                                <button
                                    onClick={() => setFilterType('session')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${filterType === 'session' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Sesi
                                </button>
                            </div>
                        </div>

                        {/* Reset Button Icon */}
                        <div className="flex items-end shrink-0">
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterType('all');
                                    setSelectedMonth('all');
                                    setSelectedYear(new Date().getFullYear().toString());
                                }}
                                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white rounded-xl transition-all aspect-square flex items-center justify-center group"
                                title="Reset Filter"
                            >
                                <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Combined Table */}
            <div className="mt-8">
                <CombinedScheduleTable
                    items={combinedItems}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Hapus Item"
                message={`Apakah Anda yakin ingin menghapus "${deleteModal.item?.name || 'item'}"?`}
                confirmText="Ya, Hapus"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </div>
    );
}