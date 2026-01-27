'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarDaysIcon,
    ClockIcon,
    XMarkIcon,
    CheckIcon,
    UserCircleIcon,
    CheckBadgeIcon,
    GlobeAltIcon,
    UserGroupIcon,
    ZoomIcon,
    YouTubeIcon
} from './Icons';
import type { Employee, Activity, TeamAttendanceSession, AudienceRules } from '@/types';
import { useRouter } from 'next/navigation';

type ActivitySessionType =
    | 'UMUM'
    | 'KAJIAN SELASA'
    | 'PENGAJIAN PERSYARIKATAN'
    | 'KIE'
    | 'DOA BERSAMA'
    | 'BBQ';

interface UnifiedActivitySessionFormProps {
    allUsers: Employee[];
    onCreateActivity: (data: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => void;
    onCreateSessions: (sessions: any[]) => void; // ⚡ Allow any type to bypass strict TeamAttendanceSession check
    initialData?: Activity | TeamAttendanceSession | null;
    isEditing?: boolean;
    disabled?: boolean; // ⚡ Added disabled prop
}

const ACTIVITY_TYPES: ActivitySessionType[] = ['UMUM', 'KAJIAN SELASA', 'PENGAJIAN PERSYARIKATAN'];
const SESSION_TYPES: ActivitySessionType[] = ['KIE', 'DOA BERSAMA', 'BBQ', 'UMUM'];

export const UnifiedActivitySessionForm: React.FC<UnifiedActivitySessionFormProps> = ({
    allUsers,
    onCreateActivity,
    onCreateSessions,
    initialData,
    isEditing = false,
    disabled = false,
}) => {
    const router = useRouter();

    // Common fields
    const [type, setType] = useState<ActivitySessionType>('UMUM');
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [description, setDescription] = useState('');
    const [zoomUrl, setZoomUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');

    // Session-specific fields
    const [attendanceMode, setAttendanceMode] = useState<'leader' | 'self'>('self');
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

    // Audience fields
    const [audienceType, setAudienceType] = useState<'rules' | 'manual'>('rules');
    const [unit, setUnit] = useState('all');
    const [bagian, setBagian] = useState('all');
    const [manualParticipants, setManualParticipants] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');

    // UI state
    const [error, setError] = useState('');

    // Determine if current type is session or activity
    const isSessionType = SESSION_TYPES.includes(type as ActivitySessionType);
    const isActivityType = ACTIVITY_TYPES.includes(type as ActivitySessionType);

    useEffect(() => {
        if (isEditing && initialData) {
            const isActivity = 'activityType' in initialData;
            const isSession = !isActivity;

            const currentType = isActivity ? initialData.activityType || 'UMUM' : (initialData as TeamAttendanceSession).type;
            setType(currentType.toUpperCase() as any);
            setName(isActivity ? initialData.name.toUpperCase() : (initialData as TeamAttendanceSession).type.toUpperCase());
            setDate(initialData.date);
            setStartTime(initialData.startTime);
            setEndTime(initialData.endTime);
            setDescription(isActivity ? (initialData as Activity).description || '' : '');
            setZoomUrl(initialData.zoomUrl || '');
            setYoutubeUrl(initialData.youtubeUrl || '');
            setAttendanceMode(isSession ? (initialData as TeamAttendanceSession).attendanceMode || 'self' : 'self');
            setIsRecurring(false); // Editing recurring sessions is complex, disable for now.
            setSelectedDays(new Set());
            setAudienceType((initialData.audienceType as any) === 'public' ? 'rules' : (initialData.audienceType as 'rules' | 'manual') || 'rules');

            if (initialData.audienceType === 'rules' && initialData.audienceRules) {
                setUnit(initialData.audienceRules.units?.[0] || 'all');
                setBagian(initialData.audienceRules.bagians?.[0] || 'all');
                setManualParticipants(new Set());
            } else if (initialData.audienceType === 'manual') {
                const participantIds = isActivity
                    ? (initialData as Activity).participantIds
                    : (initialData as TeamAttendanceSession).manualParticipantIds;
                setManualParticipants(new Set(participantIds));
                setUnit('all');
                setBagian('all');
            } else {
                setUnit('all');
                setBagian('all');
                setManualParticipants(new Set());
            }
        } else {
            // Reset to defaults for new item
            setType('UMUM');
            setName('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setStartTime('08:00');
            setEndTime('09:00');
            setZoomUrl('');
            setYoutubeUrl('');
            setAttendanceMode('self');
            setIsRecurring(false);
            setSelectedDays(new Set());
            setAudienceType('rules');
            setUnit('all');
            setBagian('all');
            setManualParticipants(new Set());
        }
        setParticipantSearch('');
        setError('');
    }, [isEditing, initialData]);

    // Computed values
    const uniqueUnits = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.unit))).sort()], [allUsers]);
    const uniqueBagians = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.bagian))).sort()], [allUsers]);

    const audienceCount = useMemo(() => {
        if (audienceType === 'rules') {
            return allUsers.filter(u =>
                (unit === 'all' || u.unit === unit) &&
                (bagian === 'all' || u.bagian === bagian)
            ).length;
        }
        return manualParticipants.size;
    }, [allUsers, audienceType, unit, bagian, manualParticipants]);

    const filteredParticipants = useMemo(() => {
        if (!participantSearch) return allUsers;
        const search = participantSearch.toLowerCase();
        return allUsers.filter(u => u.name.toLowerCase().includes(search) || u.id.includes(search));
    }, [allUsers, participantSearch]);

    const handleParticipantToggle = (id: string) => {
        setManualParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleDayToggle = (dayIndex: number) => {
        setSelectedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayIndex)) newSet.delete(dayIndex);
            else newSet.add(dayIndex);
            return newSet;
        });
    };

    const handleSubmit = () => {
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Nama kegiatan wajib diisi');
            return;
        }
        if (startTime >= endTime) {
            setError('Waktu mulai harus sebelum waktu selesai');
            return;
        }
        if (audienceType === 'manual' && manualParticipants.size === 0) {
            setError('Pilih setidaknya satu peserta');
            return;
        }
        if (isSessionType && isRecurring && selectedDays.size === 0) {
            setError('Pilih setidaknya satu hari untuk pengulangan');
            return;
        }

        // 🚀 FORCE UPPERCASE for Consistency
        const upperName = name.trim().toUpperCase();
        const upperType = type.trim().toUpperCase();

        if (isActivityType) {
            // Create or Update Activity
            const participantIds = audienceType === 'manual' ? Array.from(manualParticipants) : [];
            const audienceRules: AudienceRules | undefined = audienceType === 'rules' ? {
                units: unit !== 'all' ? [unit] : undefined,
                bagians: bagian !== 'all' ? [bagian] : undefined,
            } : undefined;

            const activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'> = {
                name: upperName,
                description: description.trim() || undefined,
                date,
                startTime,
                endTime,
                zoomUrl: zoomUrl.trim() || undefined,
                youtubeUrl: youtubeUrl.trim() || undefined,
                activityType: upperType as Activity['activityType'],
                audienceType,
                audienceRules,
                participantIds,
                status: 'scheduled',
            };

            onCreateActivity(activityData);
        } else {
            // Create or Update Team Attendance Session(s)
            const baseSessionData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds' | 'date'> = {
                type: (upperType as any) === 'UMUM' ? 'UMUM' : (upperType as any), // Match existing logic
                startTime,
                endTime,
                attendanceMode,
                audienceType,
                zoomUrl: zoomUrl.trim() || undefined,
                youtubeUrl: youtubeUrl.trim() || undefined,
                audienceRules: audienceType === 'rules' ? {
                    units: unit !== 'all' ? [unit] : undefined,
                    bagians: bagian !== 'all' ? [bagian] : undefined,
                } : undefined,
                manualParticipantIds: audienceType === 'manual' ? Array.from(manualParticipants) : [],
            };

            const sessionsToCreate: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>[] = [];

            if (!isRecurring || isEditing) { // don't allow recurring edits for now
                sessionsToCreate.push({ ...baseSessionData, date });
            } else {
                // Create recurring sessions
                const startDate = new Date(date + 'T12:00:00Z');
                const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    if (selectedDays.has(d.getDay())) {
                        sessionsToCreate.push({
                            ...baseSessionData,
                            date: d.toISOString().split('T')[0],
                        });
                    }
                }
            }

            if (sessionsToCreate.length === 0) {
                setError('Tidak ada hari yang cocok dengan pilihan Anda di sisa bulan ini');
                return;
            }

            onCreateSessions(sessionsToCreate);
        }

        router.push('/jadwal-sesi');
    };

    // SegmentedControlButton component
    const SegmentedControlButton: React.FC<{
        label: string;
        icon: React.FC<{ className: string }>;
        isActive: boolean;
        onClick: () => void;
    }> = ({ label, icon: Icon, isActive, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center text-center gap-3 p-4 rounded-xl border-2 ${isActive ? 'bg-teal-500/20 border-teal-400 shadow-lg' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}
        >
            <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-teal-300' : 'text-gray-400'}`} />
            <span className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</span>
        </button>
    );

    const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full border border-white/20 flex flex-col">
            {/* Form */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-4">
                        <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            {/* Type selector */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-blue-100 block mb-1">Jenis</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as ActivitySessionType)}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isEditing || disabled}
                                >
                                    <optgroup label="Kegiatan Terjadwal" className="text-black font-semibold">
                                        {ACTIVITY_TYPES.map(t => (
                                            <option key={t} value={t} className="text-black bg-white">{t}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Sesi Presensi" className="text-black font-semibold">
                                        {SESSION_TYPES.map(t => (
                                            <option key={t} value={t} className="text-black bg-white">{t === 'BBQ' ? 'Bimbingan Baca Al-Qur\'an (BBQ)' : t === 'UMUM' ? 'Tadarus Umum' : t}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            {/* Name */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-blue-100 block mb-1">Nama</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={isActivityType ? 'Contoh: Kajian Pagi' : 'Contoh: Doa Pagi'}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Description (only for activity) */}
                            {isActivityType && (
                                <div className="mb-4">
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Deskripsi (Opsional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        disabled={disabled}
                                    />
                                </div>
                            )}

                            {/* Date */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-blue-100 block mb-1">
                                    {isRecurring ? 'Tanggal Mulai' : 'Tanggal'}
                                </label>
                                <div className="relative">
                                    <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        style={{ colorScheme: 'dark' }}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>

                            {/* Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Mulai</label>
                                    <div className="relative">
                                        <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                            style={{ colorScheme: 'dark' }}
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Selesai</label>
                                    <div className="relative">
                                        <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                            style={{ colorScheme: 'dark' }}
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Mode (only for session) */}
                        <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3"></h4>
                            <div className="flex items-center gap-4">
                                <SegmentedControlButton
                                    label="Mandiri"
                                    icon={UserCircleIcon}
                                    isActive={attendanceMode === 'self'}
                                    onClick={() => !disabled && setAttendanceMode('self')}
                                />
                                <SegmentedControlButton
                                    label="Oleh Atasan"
                                    icon={CheckBadgeIcon}
                                    isActive={attendanceMode === 'leader'}
                                    onClick={() => !disabled && setAttendanceMode('leader')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Audience & Links */}
                    <div className="space-y-4">
                        {/* Links & Recurring (combined in one card) */}
                        <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3"></h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan Zoom (Opsional)</label>
                                    <div className="relative">
                                        <ZoomIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                                        <input
                                            type="url"
                                            value={zoomUrl}
                                            onChange={(e) => setZoomUrl(e.target.value)}
                                            placeholder="https://zoom.us/j/..."
                                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan YouTube (Opsional)</label>
                                    <div className="relative">
                                        <YouTubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                                        <input
                                            type="url"
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>

                                {/* Recurring (only for session) - integrated into the same card */}
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-lg font-semibold text-teal-300">Pengulangan Sesi</h4>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isRecurring}
                                                onChange={(e) => setIsRecurring(e.target.checked)}
                                                className="sr-only peer"
                                                disabled={isEditing || disabled}
                                            />
                                            <div className={`w-11 h-6 bg-gray-600 rounded-full peer ${(isEditing || disabled) && 'cursor-not-allowed opacity-50'} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-teal-500`}></div>
                                        </label>
                                    </div>
                                    {isRecurring && (
                                        <div>
                                            <p className="text-sm text-blue-100 mb-2">Pilih hari:</p>
                                            <div className="flex justify-around bg-black/30 p-2 rounded-lg">
                                                {weekDays.map((day, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => handleDayToggle(index)}
                                                        className={`w-10 h-10 rounded-full font-semibold ${selectedDays.has(index) ? 'bg-teal-500 text-white' : 'text-blue-200 hover:bg-white/10'} ${disabled && 'opacity-50 cursor-not-allowed'}`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Audience - separate card */}
                        <div className="p-4 bg-black/20 rounded-lg border border-white/10 grow flex flex-col">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3"></h4>
                            <div className="flex items-center gap-4 mb-4">
                                <SegmentedControlButton
                                    label="Aturan"
                                    icon={GlobeAltIcon}
                                    isActive={audienceType === 'rules'}
                                    onClick={() => !disabled && setAudienceType('rules')}
                                />
                                <SegmentedControlButton
                                    label="Manual"
                                    icon={UserGroupIcon}
                                    isActive={audienceType === 'manual'}
                                    onClick={() => !disabled && setAudienceType('manual')}
                                />
                            </div>
                            {audienceType === 'rules' && (
                                <div className="space-y-4">
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        disabled={disabled}
                                    >
                                        {uniqueUnits.map(u => (
                                            <option key={u} value={u} className="text-black bg-white">{u === 'all' ? 'Semua Unit' : u}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={bagian}
                                        onChange={(e) => setBagian(e.target.value)}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        disabled={disabled}
                                    >
                                        {uniqueBagians.map(b => (
                                            <option key={b} value={b} className="text-black bg-white">{b === 'all' ? 'Semua Bagian' : b}</option>
                                        ))}
                                    </select>
                                    <p className="text-sm text-center text-blue-200">Estimasi Peserta: <strong>{audienceCount} orang</strong></p>
                                </div>
                            )}
                            {audienceType === 'manual' && (
                                <div className="space-y-2 grow flex flex-col">
                                    <input
                                        type="search"
                                        value={participantSearch}
                                        onChange={(e) => setParticipantSearch(e.target.value)}
                                        placeholder="Cari nama..."
                                        className="w-full bg-black/30 border border-white/20 rounded-lg p-2.5 text-white disabled:opacity-50"
                                        disabled={disabled}
                                    />
                                    <div className="grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/30 space-y-1 max-h-48">
                                        {filteredParticipants.map(user => (
                                            <label key={user.id} className={`flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer ${disabled && 'pointer-events-none opacity-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={manualParticipants.has(user.id)}
                                                    onChange={() => handleParticipantToggle(user.id)}
                                                    className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                                                    disabled={disabled}
                                                />
                                                <p className="font-semibold text-white">{user.name}</p>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-blue-200 text-right pt-1">{manualParticipants.size} orang terpilih</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="flex-1 px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold disabled:opacity-50"
                        disabled={disabled}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={disabled}
                    >
                        {disabled ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5" />
                                <span>{isEditing ? 'Simpan Perubahan' : 'Buat'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
