import React, { useState, useMemo, useEffect } from 'react';
import { type Activity, type Employee, type TeamAttendanceSession, type Attendance, AudienceRules } from '../types';
import { UserGroupIcon, CalendarDaysIcon, PlusCircleIcon, PencilIcon, SearchIcon, CheckIcon, TrashIcon, GlobeAltIcon, UserCircleIcon, ClockIcon, CheckBadgeIcon, ZoomIcon, YouTubeIcon } from './Icons';
import { createPortal } from 'react-dom';
import ConfirmationModal from './ConfirmationModal';
import { getTodayLocalDateString } from '../utils/dateUtils';

// Helper function untuk mendapatkan waktu saat ini dalam format HH:mm
const getCurrentTime = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Helper function untuk membandingkan waktu HH:mm
const isTimeInRange = (currentTime: string, startTime: string, endTime: string): boolean => {
    return currentTime >= startTime && currentTime <= endTime;
};

interface TeamAttendanceViewProps {
    loggedInEmployee: Employee;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance>; }>;
    teamAttendanceSessions: TeamAttendanceSession[];
    onCreateSessions: (sessionsData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>[]) => void;
    onAddActivity: (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdateAttendance: (sessionId: string, presentUserIds: string[]) => void;
    onUpdateSession: (sessionId: string, sessionData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>) => void;
    onDeleteSession: (session: TeamAttendanceSession) => void;
    onUpdateMonthlyActivities?: (userId: string, monthKey: string, monthProgress: Record<string, Record<string, boolean>>) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const teamActivityOptions: { label: string; value: TeamAttendanceSession['type'] }[] = [
    { label: "Doa bersama mengawali pekerjaan", value: 'Doa Bersama' },
    { label: "Tepat waktu menghadiri KIE", value: 'KIE' },
];

// Mapping session type to activity ID for monthlyActivities
const sessionTypeToActivityId: Record<TeamAttendanceSession['type'], string> = {
    'Doa Bersama': 'doa_bersama',
    'KIE': 'tepat_waktu_kie',
};

const CreateSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>[]) => void;
    allUsers: Employee[];
}> = ({ isOpen, onClose, onCreate, allUsers }) => {
    const [type, setType] = useState<TeamAttendanceSession['type']>('Doa Bersama');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('07:30');
    const [endTime, setEndTime] = useState('08:00');
    const [attendanceMode, setAttendanceMode] = useState<'leader' | 'self'>('self');
    const [audienceType, setAudienceType] = useState<'rules' | 'manual'>('rules');
    const [unit, setUnit] = useState('all');
    const [bagian, setBagian] = useState('all');
    const [manualParticipantIds, setManualParticipantIds] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');
    const [zoomUrl, setZoomUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [daysOfWeek, setDaysOfWeek] = useState<Set<number>>(new Set());

    const uniqueUnits = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.unit))).sort()], [allUsers]);
    const uniqueBagians = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.bagian))).sort()], [allUsers]);

    const rulesAudienceCount = useMemo(() => {
        if (audienceType !== 'rules') return 0;
        return allUsers.filter(u =>
            (unit === 'all' || u.unit === unit) &&
            (bagian === 'all' || u.bagian === bagian)
        ).length;
    }, [allUsers, audienceType, unit, bagian]);

    const filteredManualParticipants = useMemo(() => {
        if (!participantSearch) return allUsers;
        const lowerSearch = participantSearch.toLowerCase();
        return allUsers.filter(u => u.name.toLowerCase().includes(lowerSearch) || u.id.includes(lowerSearch));
    }, [allUsers, participantSearch]);

    const handleToggleParticipant = (id: string) => {
        setManualParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleDayToggle = (dayIndex: number) => {
        setDaysOfWeek(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayIndex)) newSet.delete(dayIndex);
            else newSet.add(dayIndex);
            return newSet;
        });
    };

    const handleSubmit = () => {
        const baseSessionData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds' | 'date'> = {
            type, startTime, endTime, audienceType, attendanceMode,
            zoomUrl: zoomUrl.trim() || undefined,
            youtubeUrl: youtubeUrl.trim() || undefined,
            audienceRules: audienceType === 'rules' ? {
                units: unit !== 'all' ? [unit] : undefined,
                bagians: bagian !== 'all' ? [bagian] : undefined,
            } : undefined,
            manualParticipantIds: audienceType === 'manual' ? Array.from(manualParticipantIds) : [],
        };
        
        const sessionsToCreate: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>[] = [];

        if (!isRecurring) {
            sessionsToCreate.push({ ...baseSessionData, date });
        } else {
            if (daysOfWeek.size === 0) {
                alert("Pilih setidaknya satu hari untuk sesi berulang.");
                return;
            }
            const startDate = new Date(date + 'T12:00:00Z');
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                if (daysOfWeek.has(d.getDay())) {
                    sessionsToCreate.push({
                        ...baseSessionData,
                        date: d.toISOString().split('T')[0],
                    });
                }
            }
        }
        
        if (sessionsToCreate.length === 0 && isRecurring) {
            alert("Tidak ada hari yang cocok dengan pilihan Anda di sisa bulan ini. Sesi tidak dibuat.");
            return;
        }

        onCreate(sessionsToCreate);
        onClose();
    };

    if (!isOpen) return null;
    
    const SegmentedControlButton: React.FC<{
        label: string;
        icon: React.FC<{className: string}>;
        isActive: boolean;
        onClick: () => void;
    }> = ({ label, icon: Icon, isActive, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center text-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${isActive ? 'bg-teal-500/20 border-teal-400 shadow-lg' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}
        >
            <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-teal-300' : 'text-gray-400'}`} />
            <span className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</span>
        </button>
    );
    
    const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-pop-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-4xl border border-white/20 h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold text-white flex-shrink-0 mb-6">Buat Sesi Presensi Baru</h3>
                <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Session Details & Mode */}
                    <div className="space-y-6">
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Detail Sesi</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Jenis Kegiatan</label>
                                    <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {teamActivityOptions.map(opt => <option key={opt.value} value={opt.value} className="text-black bg-white">{opt.label}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">{isRecurring ? 'Tanggal Mulai' : 'Tanggal'}</label>
                                    <div className="relative">
                                        <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }}/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-sm font-medium text-blue-100 block mb-1">Mulai</label>
                                         <div className="relative">
                                            <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-blue-100 block mb-1">Selesai</label>
                                         <div className="relative">
                                             <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Pengulangan Sesi</h4>
                             <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">Ulangi sesi ini setiap minggu?</span>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                </label>
                            </div>
                             {isRecurring && (
                                <div className="mt-4">
                                    <p className="text-sm text-blue-100 mb-2">Pilih hari untuk pengulangan:</p>
                                    <div className="flex justify-around bg-black/30 p-2 rounded-lg">
                                        {weekDays.map((day, index) => (
                                            <button key={index} type="button" onClick={() => handleDayToggle(index)} className={`w-10 h-10 rounded-full font-semibold transition-colors ${daysOfWeek.has(index) ? 'bg-teal-500 text-white' : 'text-blue-200 hover:bg-white/10'}`}>{day}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Mode Presensi</h4>
                             <div className="flex items-center gap-4">
                                <SegmentedControlButton
                                    label="Mandiri"
                                    icon={UserCircleIcon}
                                    isActive={attendanceMode === 'self'}
                                    onClick={() => setAttendanceMode('self')}
                                />
                                <SegmentedControlButton
                                    label="Oleh Atasan"
                                    icon={CheckBadgeIcon}
                                    isActive={attendanceMode === 'leader'}
                                    onClick={() => setAttendanceMode('leader')}
                                />
                            </div>
                        </div>
                    </div>

                     {/* Right Column: Audience */}
                    <div className="space-y-6 flex flex-col">
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Tautan Online</h4>
                             <div className="space-y-4">
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan Zoom (Opsional)</label>
                                     <div className="relative">
                                        <ZoomIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400"/>
                                        <input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white"/>
                                    </div>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan YouTube (Opsional)</label>
                                     <div className="relative">
                                        <YouTubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400"/>
                                        <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10 flex-grow flex flex-col">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Target Peserta</h4>
                             <div className="flex items-center gap-4 mb-4">
                                 <SegmentedControlButton label="Aturan" icon={GlobeAltIcon} isActive={audienceType === 'rules'} onClick={() => setAudienceType('rules')} />
                                 <SegmentedControlButton label="Manual" icon={UserGroupIcon} isActive={audienceType === 'manual'} onClick={() => setAudienceType('manual')} />
                            </div>
                             {audienceType === 'rules' && (
                                <div className="space-y-4">
                                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {uniqueUnits.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt === 'all' ? 'Semua Unit' : opt}</option>)}
                                    </select>
                                    <select value={bagian} onChange={e => setBagian(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {uniqueBagians.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt === 'all' ? 'Semua Bagian' : opt}</option>)}
                                    </select>
                                    <p className="text-sm text-center text-blue-200">Estimasi Peserta: <strong>{rulesAudienceCount} orang</strong></p>
                                </div>
                            )}
                             {audienceType === 'manual' && (
                                <div className="space-y-2 flex-grow flex flex-col">
                                    <input type="search" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} placeholder="Cari nama..." className="w-full bg-black/30 border border-white/20 rounded-lg p-2.5 text-white"/>
                                    <div className="flex-grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/30 space-y-1">
                                        {filteredManualParticipants.map(user => (
                                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                                <input type="checkbox" checked={manualParticipantIds.has(user.id)} onChange={() => handleToggleParticipant(user.id)} className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                                <p className="font-semibold text-white">{user.name}</p>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-blue-200 text-right pt-1">{manualParticipantIds.size} orang terpilih</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">
                        Buat Sesi
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ManageAttendanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (sessionData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>, presentUserIds: string[]) => void;
    session: TeamAttendanceSession;
    allUsers: Employee[];
}> = ({ isOpen, onClose, onSave, session, allUsers }) => {
    const [type, setType] = useState<TeamAttendanceSession['type']>(session.type);
    const [date, setDate] = useState(session.date);
    const [startTime, setStartTime] = useState(session.startTime);
    const [endTime, setEndTime] = useState(session.endTime);
    const [attendanceMode, setAttendanceMode] = useState<'leader' | 'self'>(session.attendanceMode);
    const [audienceType, setAudienceType] = useState<'rules' | 'manual'>(session.audienceType);
    const [unit, setUnit] = useState(session.audienceRules?.units?.[0] || 'all');
    const [bagian, setBagian] = useState(session.audienceRules?.bagians?.[0] || 'all');
    const [manualParticipantIds, setManualParticipantIds] = useState<Set<string>>(new Set(session.manualParticipantIds || []));
    const [participantSearch, setParticipantSearch] = useState('');
    const [zoomUrl, setZoomUrl] = useState(session.zoomUrl || '');
    const [youtubeUrl, setYoutubeUrl] = useState(session.youtubeUrl || '');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(session.presentUserIds));

    useEffect(() => {
        if (isOpen) {
            setType(session.type);
            setDate(session.date);
            setStartTime(session.startTime);
            setEndTime(session.endTime);
            setAttendanceMode(session.attendanceMode);
            setAudienceType(session.audienceType);
            setUnit(session.audienceRules?.units?.[0] || 'all');
            setBagian(session.audienceRules?.bagians?.[0] || 'all');
            setManualParticipantIds(new Set(session.manualParticipantIds || []));
            setZoomUrl(session.zoomUrl || '');
            setYoutubeUrl(session.youtubeUrl || '');
            setSelectedIds(new Set(session.presentUserIds));
            setParticipantSearch('');
        }
    }, [isOpen, session]);

    const uniqueUnits = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.unit))).sort()], [allUsers]);
    const uniqueBagians = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.bagian))).sort()], [allUsers]);

    const rulesAudienceCount = useMemo(() => {
        if (audienceType !== 'rules') return 0;
        return allUsers.filter(u =>
            (unit === 'all' || u.unit === unit) &&
            (bagian === 'all' || u.bagian === bagian)
        ).length;
    }, [allUsers, audienceType, unit, bagian]);

    const filteredManualParticipants = useMemo(() => {
        if (!participantSearch) return allUsers;
        const lowerSearch = participantSearch.toLowerCase();
        return allUsers.filter(u => u.name.toLowerCase().includes(lowerSearch) || u.id.includes(lowerSearch));
    }, [allUsers, participantSearch]);

    const handleToggleParticipant = (id: string) => {
        setManualParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSubmit = () => {
        const sessionData: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'> = {
            type, date, startTime, endTime, attendanceMode, audienceType,
            zoomUrl: zoomUrl.trim() || undefined,
            youtubeUrl: youtubeUrl.trim() || undefined,
            audienceRules: audienceType === 'rules' ? {
                units: unit !== 'all' ? [unit] : undefined,
                bagians: bagian !== 'all' ? [bagian] : undefined,
            } : undefined,
            manualParticipantIds: audienceType === 'manual' ? Array.from(manualParticipantIds) : [],
        };

        onSave(sessionData, Array.from(selectedIds));
        onClose();
    };

    if (!isOpen) return null;

    const SegmentedControlButton: React.FC<{
        label: string;
        icon: React.FC<{className: string}>;
        isActive: boolean;
        onClick: () => void;
    }> = ({ label, icon: Icon, isActive, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center text-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${isActive ? 'bg-teal-500/20 border-teal-400 shadow-lg' : 'bg-black/20 border-gray-600 hover:border-gray-500'}`}
        >
            <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-teal-300' : 'text-gray-400'}`} />
            <span className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</span>
        </button>
    );

    const participants = useMemo(() => {
        if (audienceType === 'manual') {
            return allUsers.filter(u => manualParticipantIds.has(u.id));
        }
        if (audienceType === 'rules') {
            return allUsers.filter(u =>
                (unit === 'all' || u.unit === unit) &&
                (bagian === 'all' || u.bagian === bagian)
            );
        }
        return [];
    }, [allUsers, audienceType, manualParticipantIds, unit, bagian]);

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-pop-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-4xl border border-white/20 h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold text-white flex-shrink-0 mb-6">Kelola Sesi Presensi</h3>
                <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Session Details & Mode */}
                    <div className="space-y-6">
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Detail Sesi</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Jenis Kegiatan</label>
                                    <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {teamActivityOptions.map(opt => <option key={opt.value} value={opt.value} className="text-black bg-white">{opt.label}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tanggal</label>
                                    <div className="relative">
                                        <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }}/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-sm font-medium text-blue-100 block mb-1">Mulai</label>
                                         <div className="relative">
                                            <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-blue-100 block mb-1">Selesai</label>
                                         <div className="relative">
                                             <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white" style={{ colorScheme: 'dark' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Mode Presensi</h4>
                             <div className="flex items-center gap-4">
                                <SegmentedControlButton
                                    label="Mandiri"
                                    icon={UserCircleIcon}
                                    isActive={attendanceMode === 'self'}
                                    onClick={() => setAttendanceMode('self')}
                                />
                                <SegmentedControlButton
                                    label="Oleh Atasan"
                                    icon={CheckBadgeIcon}
                                    isActive={attendanceMode === 'leader'}
                                    onClick={() => setAttendanceMode('leader')}
                                />
                            </div>
                        </div>
                    </div>

                     {/* Right Column: Audience */}
                    <div className="space-y-6 flex flex-col">
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Tautan Online</h4>
                             <div className="space-y-4">
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan Zoom (Opsional)</label>
                                     <div className="relative">
                                        <ZoomIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400"/>
                                        <input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white"/>
                                    </div>
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Tautan YouTube (Opsional)</label>
                                     <div className="relative">
                                        <YouTubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400"/>
                                        <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 text-white"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div className="p-4 bg-black/20 rounded-lg border border-white/10 flex-grow flex flex-col">
                            <h4 className="text-lg font-semibold text-teal-300 mb-3">Target Peserta & Presensi</h4>
                             <div className="flex items-center gap-4 mb-4">
                                 <SegmentedControlButton label="Aturan" icon={GlobeAltIcon} isActive={audienceType === 'rules'} onClick={() => setAudienceType('rules')} />
                                 <SegmentedControlButton label="Manual" icon={UserGroupIcon} isActive={audienceType === 'manual'} onClick={() => setAudienceType('manual')} />
                            </div>
                             {audienceType === 'rules' && (
                                <div className="space-y-4">
                                    <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {uniqueUnits.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt === 'all' ? 'Semua Unit' : opt}</option>)}
                                    </select>
                                    <select value={bagian} onChange={e => setBagian(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 text-white">
                                        {uniqueBagians.map(opt => <option key={opt} value={opt} className="text-black bg-white">{opt === 'all' ? 'Semua Bagian' : opt}</option>)}
                                    </select>
                                    <p className="text-sm text-center text-blue-200">Estimasi Peserta: <strong>{rulesAudienceCount} orang</strong> | Hadir: <strong>{selectedIds.size} orang</strong></p>
                                    <div className="flex-grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/30 space-y-1 max-h-60">
                                        {participants.map(user => (
                                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(user.id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const newSet = new Set(prev);
                                                            if (newSet.has(user.id)) newSet.delete(user.id);
                                                            else newSet.add(user.id);
                                                            return newSet;
                                                        });
                                                    }}
                                                    className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                                                />
                                                <div>
                                                    <p className="font-semibold text-white">{user.name}</p>
                                                    <p className="text-xs text-gray-400">{user.bagian}, {user.unit}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                             {audienceType === 'manual' && (
                                <div className="space-y-2 flex-grow flex flex-col">
                                    <input type="search" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} placeholder="Cari nama..." className="w-full bg-black/30 border border-white/20 rounded-lg p-2.5 text-white"/>
                                    <div className="flex-grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/30 space-y-1">
                                        {filteredManualParticipants.map(user => (
                                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                                <input type="checkbox" checked={manualParticipantIds.has(user.id)} onChange={() => handleToggleParticipant(user.id)} className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                                <p className="font-semibold text-white">{user.name}</p>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-blue-200 text-right pt-1">{manualParticipantIds.size} orang terpilih | Hadir: {selectedIds.size} orang</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">
                        Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const doesEmployeeMatchRules = (employee: Employee, rules: AudienceRules): boolean => {
    if (rules.hospitalIds && rules.hospitalIds.length > 0 && !rules.hospitalIds.includes(employee.hospitalId || '')) return false;
    if (rules.units && rules.units.length > 0 && !rules.units.includes(employee.unit)) return false;
    if (rules.bagians && rules.bagians.length > 0 && !rules.bagians.includes(employee.bagian)) return false;
    if (rules.professionCategories && rules.professionCategories.length > 0 && !rules.professionCategories.includes(employee.professionCategory)) return false;
    if (rules.professions && rules.professions.length > 0 && !rules.professions.includes(employee.profession)) return false;
    return true;
};

export const TeamAttendanceView: React.FC<TeamAttendanceViewProps> = ({
    loggedInEmployee,
    allUsersData,
    teamAttendanceSessions,
    onCreateSessions,
    onUpdateAttendance,
    onUpdateSession,
    onDeleteSession,
    onUpdateMonthlyActivities,
    addToast,
    onAddActivity,
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [managingAttendanceFor, setManagingAttendanceFor] = useState<TeamAttendanceSession | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<TeamAttendanceSession | null>(null);
    const [activeTab, setActiveTab] = useState<TeamAttendanceSession['type']>('KIE');

    const allUsers = useMemo(() => Object.values(allUsersData).map(d => d.employee), [allUsersData]);

    const todayStr = useMemo(() => getTodayLocalDateString(), []);

    const relevantSessions = useMemo(() => {
        return teamAttendanceSessions.filter(session => {
            if (session.creatorId === loggedInEmployee.id) {
                return true;
            }
            if (session.audienceType === 'manual') {
                return session.manualParticipantIds?.includes(loggedInEmployee.id);
            }
            if (session.audienceType === 'rules' && session.audienceRules) {
                return doesEmployeeMatchRules(loggedInEmployee, session.audienceRules);
            }
            return false;
        });
    }, [teamAttendanceSessions, loggedInEmployee]);

    const sessionsForToday = useMemo(() => {
        return relevantSessions.filter(s => s.date === todayStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [relevantSessions, todayStr]);

    const otherSessions = useMemo(() => {
        return relevantSessions.filter(s => s.date !== todayStr).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [relevantSessions, todayStr]);

    const otherKieSessions = useMemo(() => otherSessions.filter(s => s.type === 'KIE'), [otherSessions]);
    const otherDoaSessions = useMemo(() => otherSessions.filter(s => s.type === 'Doa Bersama'), [otherSessions]);

    const sessionsForTab = activeTab === 'KIE' ? otherKieSessions : otherDoaSessions;

    const handleSelfAttend = async (session: TeamAttendanceSession) => {
        if (!session.presentUserIds.includes(loggedInEmployee.id)) {
            try {
                console.log('🎯 User clicking hadir:', loggedInEmployee.name, '(', loggedInEmployee.id, ')');
                console.log('📅 Session date:', session.date);
                console.log('📋 Session type:', session.type);
                console.log('👤 Current loggedInEmployee.monthlyActivities:', loggedInEmployee.monthlyActivities);

                const newPresentIds = [...session.presentUserIds, loggedInEmployee.id];
                await onUpdateAttendance(session.id, newPresentIds);

                // Also save to monthlyActivities for dashboard display
                if (onUpdateMonthlyActivities) {
                    const monthKey = session.date.substring(0, 7); // YYYY-MM
                    const dayKey = session.date.substring(8, 10); // DD (need to check format)
                    const activityId = sessionTypeToActivityId[session.type];

                    console.log('📊 Saving to monthlyActivities:');
                    console.log('  - monthKey:', monthKey);
                    console.log('  - dayKey:', dayKey, '(type:', typeof dayKey, ')');
                    console.log('  - activityId:', activityId);

                    // Get the FRESHEST data from allUsersData instead of loggedInEmployee
                    const freshEmployee = allUsersData[loggedInEmployee.id]?.employee || loggedInEmployee;
                    const currentMonthProgress = freshEmployee.monthlyActivities?.[monthKey] || {};
                    const currentDayProgress = currentMonthProgress[dayKey] || {};

                    console.log('  - Current month progress:', currentMonthProgress);
                    console.log('  - Current day progress:', currentDayProgress);

                    const updatedMonthProgress = {
                        ...currentMonthProgress,
                        [dayKey]: {
                            ...currentDayProgress,
                            [activityId]: true,
                        }
                    };

                    console.log('  - Updated month progress:', updatedMonthProgress);
                    console.log('🔄 Calling onUpdateMonthlyActivities...');

                    await onUpdateMonthlyActivities(loggedInEmployee.id, monthKey, updatedMonthProgress);

                    console.log('✅ onUpdateMonthlyActivities completed');
                }

                addToast(`Anda berhasil presensi untuk ${session.type}.`, 'success');
            } catch (error) {
                console.error('❌ Error saat presensi:', error);
                addToast('Gagal melakukan presensi: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            }
        } else {
            console.log('ℹ️ User already present in session');
        }
    };

    const handleDelete = async () => {
        if (confirmDelete) {
            try {
                await onDeleteSession(confirmDelete);
                addToast('Sesi berhasil dihapus', 'success');
                setConfirmDelete(null);
            } catch (error) {
                console.error('❌ Error saat menghapus sesi:', error);
                addToast('Gagal menghapus sesi: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            }
        }
    };

    const SessionCard: React.FC<{session: TeamAttendanceSession}> = ({ session }) => {
        const isCreator = session.creatorId === loggedInEmployee.id;
        const isPresent = session.presentUserIds.includes(loggedInEmployee.id);

        // Check if session is today and current time is within the session time range
        const isSessionToday = session.date === todayStr;
        const currentTime = getCurrentTime();
        const isActionable = isSessionToday && isTimeInRange(currentTime, session.startTime, session.endTime);

        return (
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <p className="font-semibold text-lg text-white">{session.type}</p>
                    <p className="text-sm text-blue-200 flex items-center gap-2">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-sm text-blue-200 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        {session.startTime} - {session.endTime}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Dibuat oleh: {session.creatorName}
                    </p>
                    {(session.zoomUrl || session.youtubeUrl) && (
                        <div className="flex items-center gap-2 mt-2">
                            {session.zoomUrl && <a href={session.zoomUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-600 rounded-md"><ZoomIcon className="w-4 h-4"/> Zoom</a>}
                            {session.youtubeUrl && <a href={session.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-red-600 rounded-md"><YouTubeIcon className="w-4 h-4"/> YouTube</a>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center w-full sm:w-auto">
                    {isCreator ? (
                        <>
                            <button onClick={() => setManagingAttendanceFor(session)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-md">
                                <PencilIcon className="w-4 h-4" /> Kelola Presensi
                            </button>
                            <button onClick={() => setConfirmDelete(session)} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10" title="Hapus Sesi">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </>
                    ) : session.attendanceMode === 'self' ? (
                        isPresent ? (
                            <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-green-500/30 text-green-300 rounded-md">
                                <CheckBadgeIcon className="w-4 h-4"/> Anda Sudah Hadir
                            </div>
                        ) : (
                            <button onClick={() => handleSelfAttend(session)} disabled={!isActionable} className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-green-600 hover:bg-green-500 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                                <CheckIcon className="w-4 h-4"/> Konfirmasi Hadir
                            </button>
                        )
                    ) : (
                         <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-gray-600/50 text-gray-300 rounded-md">
                            Presensi oleh Atasan
                        </div>
                    )}
                </div>
             </div>
        );
    };
    
    const SubTabButton: React.FC<{
        active: boolean;
        onClick: () => void;
        label: string;
    }> = ({ active, onClick, label }) => (
        <button
            onClick={onClick}
            className={`flex-grow sm:flex-grow-0 py-2 px-5 rounded-full font-semibold transition-all duration-300 ease-in-out text-sm
            ${active
                ? 'bg-teal-500 text-white shadow-md'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
        >
            {label}
        </button>
    );

    return (
         <div className="space-y-8 -mx-2 sm:mx-0 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <UserGroupIcon className="w-6 h-6 text-teal-300" />
                        Manajemen Presensi Tim
                    </h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex-shrink-0 bg-teal-500 hover:bg-teal-400 text-white font-semibold p-2 rounded-lg shadow-md transition-colors flex items-center gap-2 text-sm">
                    <PlusCircleIcon className="w-5 h-5" /> Buat Sesi Baru
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-l-4 border-teal-400 pl-3">Sesi Hari Ini</h3>
                {sessionsForToday.length > 0 ? (
                    sessionsForToday.map(session => <SessionCard key={session.id} session={session} />)
                ) : (
                    <div className="text-center py-10 bg-black/20 rounded-lg">
                        <p className="text-blue-200 text-sm">Tidak ada sesi presensi hari ini</p>
                    </div>
                )}
            </div>

            <div className="space-y-4 mt-8">
                <h3 className="text-lg font-bold text-white border-l-4 border-teal-400 pl-3">Sesi Akan Datang & Riwayat</h3>
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 min-w-max">
                        <SubTabButton label="KIE" active={activeTab === 'KIE'} onClick={() => setActiveTab('KIE')} />
                        <SubTabButton label="Doa Pagi" active={activeTab === 'Doa Bersama'} onClick={() => setActiveTab('Doa Bersama')} />
                    </div>
                </div>
                {sessionsForTab.length > 0 ? (
                    <div className="space-y-3">
                        {sessionsForTab.map(session => <SessionCard key={session.id} session={session} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-black/20 rounded-lg">
                        <p className="text-blue-200 text-sm">Tidak ada sesi</p>
                    </div>
                )}
            </div>

            <CreateSessionModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={onCreateSessions}
                allUsers={allUsers}
            />
            {managingAttendanceFor && (
                <ManageAttendanceModal
                    isOpen={!!managingAttendanceFor}
                    onClose={() => setManagingAttendanceFor(null)}
                    onSave={(sessionData, presentIds) => {
                        onUpdateSession(managingAttendanceFor.id, sessionData);
                        onUpdateAttendance(managingAttendanceFor.id, presentIds);
                    }}
                    session={managingAttendanceFor}
                    allUsers={allUsers}
                />
            )}
            <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Sesi Presensi"
                message={<>Apakah Anda yakin ingin menghapus sesi <strong>{confirmDelete?.type}</strong> pada {confirmDelete?.date}? Ini akan menghapus data presensi terkait.</>}
                confirmText="Ya, Hapus"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </div>
    );
};
