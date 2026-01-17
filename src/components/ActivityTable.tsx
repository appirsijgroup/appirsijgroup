import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { type Activity, type Attendance, type Employee, type AudienceRules, type TeamAttendanceSession } from '../types';
import { ZoomIcon, YouTubeIcon, CheckIcon, XIcon, PencilIcon, ClockIcon, UserGroupIcon } from './Icons';


interface ActivityTableProps {
  activities: Activity[];
  teamAttendanceSessions: TeamAttendanceSession[];
  attendance: Attendance;
  onHadir: (id: string) => void;
  onTidakHadir: (activity: Pick<Activity, 'id' | 'name'>) => void;
  onUbah: (id: string) => void;
  loggedInEmployee: Employee;
}

const formatTimeDifference = (diff: number): string => {
    if (diff <= 0) return "00:00:00";
    const totalSeconds = Math.floor(diff / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    
    // If more than a day, show days
    if (totalSeconds > 86400) {
        const days = Math.floor(totalSeconds / 86400);
        return `${days} hari ${hours}:${minutes}:${seconds}`;
    }

    return `${hours}:${minutes}:${seconds}`;
};

const doesEmployeeMatchRules = (employee: Employee, rules: AudienceRules): boolean => {
    if (rules.hospitalIds && rules.hospitalIds.length > 0 && !rules.hospitalIds.includes(employee.hospitalId || '')) return false;
    if (rules.units && rules.units.length > 0 && !rules.units.includes(employee.unit)) return false;
    if (rules.bagians && rules.bagians.length > 0 && !rules.bagians.includes(employee.bagian)) return false;
    if (rules.professionCategories && rules.professionCategories.length > 0 && !rules.professionCategories.includes(employee.professionCategory)) return false;
    if (rules.professions && rules.professions.length > 0 && !rules.professions.includes(employee.profession)) return false;
    return true;
};

export const ActivityTable: React.FC<ActivityTableProps> = ({ activities, teamAttendanceSessions, attendance, onHadir, onTidakHadir, onUbah, loggedInEmployee }) => {
    const [now, setNow] = useState(new Date());
    const [isClient, setIsClient] = useState(false);

    // 🔥 FIX: Prevent hydration error by only rendering time-dependent content on client
    useEffect(() => {
        setIsClient(true);
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const unifiedSchedule = useMemo(() => {
        const regularActivities = activities.map(act => ({
            id: act.id,
            name: act.name,
            date: act.date,
            startTime: act.startTime,
            endTime: act.endTime,
            isTeamSession: false,
            originalData: act,
            audienceType: act.audienceType,
            participantIds: act.participantIds,
            audienceRules: act.audienceRules,
            zoomUrl: act.zoomUrl,
            youtubeUrl: act.youtubeUrl,
            status: act.status,
            attendanceMode: 'self' as const, // Regular activities are always self-attended
        }));

        const teamSessions = teamAttendanceSessions.map(session => ({
            id: `team-${session.id}`,
            name: session.type,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            isTeamSession: true,
            originalData: session,
            audienceType: session.audienceType,
            participantIds: session.manualParticipantIds || [],
            audienceRules: session.audienceRules,
            zoomUrl: session.zoomUrl,
            youtubeUrl: session.youtubeUrl,
            status: 'scheduled' as const,
            attendanceMode: session.attendanceMode || 'self',
        }));

        const combined = [...regularActivities, ...teamSessions];

        return combined.filter(item => {
            // Creator always sees their session to manage it
            if (item.isTeamSession && (item.originalData as TeamAttendanceSession).creatorId === loggedInEmployee.id) {
                return true;
            }

            switch (item.audienceType) {
                case 'public':
                    return true;
                case 'manual':
                    return item.participantIds.includes(loggedInEmployee.id);
                case 'rules':
                    return doesEmployeeMatchRules(loggedInEmployee, item.audienceRules || {});
                default:
                    return true;
            }
        }).sort((a, b) => {
            const dateComparison = a.date.localeCompare(b.date);
            if (dateComparison !== 0) return dateComparison;
            return a.startTime.localeCompare(b.startTime);
        });

    }, [activities, teamAttendanceSessions, loggedInEmployee]);


    if (unifiedSchedule.length === 0) {
        return (
            <section className="mt-8">
                <h2 className="text-xl font-bold text-white">Kegiatan Terjadwal Hari Ini</h2>
                <div className="bg-white/10 p-6 rounded-2xl shadow-lg border border-white/20 mt-4 text-center text-blue-200">
                    Tidak ada kegiatan yang dijadwalkan untuk Anda hari ini.
                </div>
            </section>
        );
    }

    // 🔥 FIX: Don't render time-dependent content during SSR to prevent hydration error
    if (!isClient) {
        return (
            <section className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Kegiatan Terjadwal</h2>
                <div className="bg-white/10 p-2 sm:p-4 rounded-2xl shadow-lg border border-white/20 overflow-x-auto">
                    <div className="text-center py-8 text-blue-200">
                        Memuat jadwal kegiatan...
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Kegiatan Terjadwal</h2>

            <div className="bg-white/10 p-2 sm:p-4 rounded-2xl shadow-lg border border-white/20 overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm text-left text-white">
                    <thead className="bg-black/20 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 min-w-[120px] whitespace-nowrap">Kegiatan</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Tanggal</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">Jenis</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Waktu</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell whitespace-nowrap">Status</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">Sisa Waktu</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-center hidden lg:table-cell whitespace-nowrap">Tautan Online</th>
                            <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[140px] sm:min-w-[180px] whitespace-nowrap">Aksi Presensi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unifiedSchedule.map((item) => {
                            const attendanceStatus = attendance[item.id];
                            const isSubmitted = !!attendanceStatus?.submitted;

                            const startTime = new Date(`${item.date}T${item.startTime}`);
                            const endTime = new Date(`${item.date}T${item.endTime}`);

                            const diffToStart = startTime.getTime() - now.getTime();
                            const diffToEnd = endTime.getTime() - now.getTime();

                            const isOngoing = diffToStart <= 0 && diffToEnd > 0;
                            const isStarted = diffToStart <= 0; // 🔥 FIX: Sudah mulai (bisa presensi)
                            const isNotFinished = diffToEnd > 0; // 🔥 FIX: Belum selesai
                            const isActionable = isStarted && isNotFinished && !isSubmitted && item.status === 'scheduled';

                            const isCreator = item.isTeamSession && (item.originalData as TeamAttendanceSession).creatorId === loggedInEmployee.id;

                            let statusLabel, countdownLabel, countdownTarget, statusClass;

                            if (item.status === 'postponed') {
                                statusLabel = "Ditunda";
                                statusClass = "text-yellow-400 font-bold";
                                countdownLabel = "";
                                countdownTarget = 0;
                            } else if (item.status === 'cancelled') {
                                statusLabel = "Dibatalkan";
                                statusClass = "text-red-400 font-bold";
                                countdownLabel = "";
                                countdownTarget = 0;
                            } else if (isOngoing) {
                                statusLabel = "Berlangsung";
                                statusClass = "text-green-300 animate-pulse";
                                countdownLabel = "Berakhir dalam:";
                                countdownTarget = diffToEnd;
                            } else if (diffToStart > 0) {
                                statusLabel = "Akan Datang";
                                statusClass = "text-blue-300";
                                countdownLabel = "Mulai dalam:";
                                countdownTarget = diffToStart;
                            } else {
                                statusLabel = "Selesai";
                                statusClass = "text-gray-500";
                                countdownLabel = "";
                                countdownTarget = 0;
                            }

                            return (
                                <tr key={item.id} className="hover:bg-white/5 border-b border-gray-800 last:border-b-0">
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 font-semibold text-xs sm:text-sm">{item.name}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs">
                                        {new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4">
                                        <span className={`px-1.5 sm:px-2 py-1 rounded-full text-xs font-semibold ${item.isTeamSession ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'}`}>
                                            {item.isTeamSession ? 'Tim' : 'Umum'}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 font-mono text-xs hidden sm:table-cell">{item.startTime} - {item.endTime}</td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 hidden md:table-cell"><span className={`font-bold text-xs ${statusClass}`}>{statusLabel}</span></td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 font-mono text-xs font-semibold hidden sm:table-cell">
                                        {countdownLabel && (
                                            <span>{formatTimeDifference(countdownTarget)}</span>
                                        )}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center hidden lg:table-cell">
                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                            {item.zoomUrl && (
                                                <a href={item.zoomUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow" title={item.zoomUrl}>
                                                    <ZoomIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                    <span className="hidden sm:inline">Zoom</span>
                                                </a>
                                            )}
                                            {item.youtubeUrl && (
                                                 <a href={item.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors shadow" title={item.youtubeUrl}>
                                                    <YouTubeIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                    <span className="hidden sm:inline">YouTube</span>
                                                </a>
                                            )}
                                            {!item.zoomUrl && !item.youtubeUrl && (
                                                <span className="text-gray-500 text-xs italic hidden sm:inline">Tidak ada</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-4">
                                        <div className="flex items-center justify-center space-x-1 sm:space-x-2 min-w-[120px] sm:min-w-[180px]">
                                            {(item.isTeamSession && item.attendanceMode === 'leader' && !isCreator) ? (
                                                <div className="py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg font-semibold flex items-center justify-center bg-gray-600/50 text-white/80 shadow-md text-[10px] sm:text-xs w-full">
                                                    Presensi oleh Atasan
                                                </div>
                                            ) : isSubmitted ? (
                                                <div className="w-full flex flex-col items-center">
                                                    <p className={`w-full text-center py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg font-semibold flex items-center justify-center shadow-md text-[10px] sm:text-xs ${
                                                        attendanceStatus.status === 'hadir' ? 'bg-green-500/50 text-green-200' : 'bg-red-500/50 text-red-200'
                                                    }`}>
                                                        {attendanceStatus.status === 'hadir' ? <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1"/> : <XIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1"/>}
                                                        {attendanceStatus.status === 'hadir' ? 'Hadir' : 'Tidak'}
                                                    </p>
                                                </div>
                                            ) : isActionable ? (
                                                <>
                                                    <button onClick={() => onHadir(item.id)} className="w-1/2 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-lg font-semibold flex items-center justify-center transition-all bg-green-500 hover:bg-green-400 text-white shadow-md text-[10px] sm:text-xs">
                                                        <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">Hadir</span>
                                                    </button>
                                                    <button onClick={() => onTidakHadir({id: item.id, name: item.name})} className="w-1/2 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-lg font-semibold flex items-center justify-center transition-all bg-red-500 hover:bg-red-400 text-white shadow-md text-[10px] sm:text-xs">
                                                        <XIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">Tidak</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-semibold flex items-center justify-center bg-gray-600/50 text-white/80 shadow-md text-[10px] sm:text-xs w-full`}>
                                                    {statusLabel}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};