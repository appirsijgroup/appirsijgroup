'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import { PlusCircleIcon, CalendarIcon, UsersIcon, ClockIcon } from '@/components/Icons';
import type { Activity, TeamAttendanceSession } from '@/types';
import { CombinedScheduleTable, CombinedScheduleItem } from '@/components/CombinedScheduleTable';

export default function JadwalSesiPage() {
    const { loggedInEmployee } = useAppDataStore();
    const { activities, deleteActivity, teamAttendanceSessions, deleteTeamAttendanceSession, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase } = useActivityStore();
    const router = useRouter();

    // ⚡ TAMBAH: Auto-load data dari Supabase saat halaman mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadTeamAttendanceSessionsFromSupabase();
                await loadActivitiesFromSupabase();
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        };

        if (loggedInEmployee) {
            loadData();
        }
    }, [loggedInEmployee, loadTeamAttendanceSessionsFromSupabase, loadActivitiesFromSupabase]);

    const handleEdit = (item: CombinedScheduleItem) => {
        // ⚡ FIX: Sertakan kind (activity/session) di URL agar edit page tahu jenis item
        router.push(`/jadwal-sesi/edit/${item.kind}/${item.id}`);
    };

    const handleDelete = async (item: CombinedScheduleItem) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus "${item.name}"?`)) {
            try {
                if (item.kind === 'activity') {
                    await deleteActivity(item.id);
                } else {
                    await deleteTeamAttendanceSession(item.id);
                }
                // ⚡ TAMBAH: Reload data dari Supabase setelah delete
                await loadTeamAttendanceSessionsFromSupabase();
                await loadActivitiesFromSupabase();
            } catch (error) {
                console.error('Failed to delete:', error);
                alert('Gagal menghapus item. Silakan coba lagi.');
            }
        }
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-800 flex items-center justify-center">
                <p className="text-white text-xl">Silakan login terlebih dahulu</p>
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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Jadwal & Sesi Terpadu</h1>
                    <p className="text-sm text-gray-400">Kelola semua kegiatan dan sesi presensi dalam satu tempat</p>
                </div>
                <Link href="/jadwal-sesi/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold shadow-lg transition-all">
                    <PlusCircleIcon className="w-5 h-5" />
                    Buat Baru
                </Link>
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
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
}