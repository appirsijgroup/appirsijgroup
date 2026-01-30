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

        return [...activityItems, ...sessionItems].sort((a, b) => {
            // ⚡ FIX: Handle undefined/null values safely
            const dateA = a.date || '';
            const dateB = b.date || '';
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';

            const dateComparison = dateB.localeCompare(dateA);
            if (dateComparison !== 0) return dateComparison;
            return timeA.localeCompare(timeB);
        });
    }, [activities, teamAttendanceSessions]);


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