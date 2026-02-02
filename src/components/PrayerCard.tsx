
import React from 'react';
import { type Prayer, type AttendanceStatus } from '../types';
import { CheckIcon, XIcon, ClockIcon } from './Icons';

interface PrayerCardProps {
  prayer: Prayer;
  attendanceStatus: AttendanceStatus | undefined;
  isActive: boolean;
  isTimePast: boolean;
  onHadir: () => void;
  onTidakHadir: () => void;
  onUbah: () => void;
  isAdmin?: boolean;
}

const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, attendanceStatus, isActive, isTimePast, onHadir, onTidakHadir, onUbah, isAdmin }) => {
  const isSubmitted = !!attendanceStatus?.submitted;

  const cardClasses = `
    p-4 rounded-2xl flex flex-col items-center justify-between aspect-square
    transform transition-all duration-300 relative shadow-lg bg-white/5 backdrop-blur-sm border-2
    ${isSubmitted && attendanceStatus.status === 'hadir'
      ? 'border-green-400/80'
      : isSubmitted && attendanceStatus.status === 'tidak-hadir'
        ? 'border-red-400/80'
        : isActive
          ? 'border-teal-300 shadow-teal-400/20 hover:-translate-y-1'
          : isTimePast
            ? 'border-yellow-500/50'
            : 'border-white/10 opacity-80'
    }
  `;

  return (
    <div className={cardClasses}>
      {!isActive && !isSubmitted && !isTimePast && !isAdmin && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center pt-16 z-10">
          <span className="text-sm font-semibold text-gray-300 px-2 text-center">
            Belum Waktunya
          </span>
        </div>
      )}

      <div className="grow flex flex-col items-center justify-center text-center">
        <div className={`p-3 rounded-full mb-2 transition-colors ${isSubmitted && attendanceStatus.status === 'hadir' ? 'bg-green-500/50' :
          isSubmitted && attendanceStatus.status === 'tidak-hadir' ? 'bg-red-500/50' : 'bg-white/10'}`
        }>
          {prayer.icon}
        </div>
        <h3 className="font-bold text-lg text-white">{prayer.name}</h3>
        <p className="text-xs text-blue-300">{prayer.time}</p>
        <div className="mt-1 h-5 flex items-center justify-center text-center">
          {attendanceStatus?.isLateEntry ? (
            <p className="text-xs text-yellow-400 font-semibold">Terlambat</p>
          ) : attendanceStatus?.status === 'tidak-hadir' && attendanceStatus?.reason ? (
            <p className="text-xs text-yellow-300 italic truncate" title={attendanceStatus.reason}>Ada alasan</p>
          ) : null}
        </div>
      </div>

      <div className="w-full mt-3 text-sm min-h-18 flex flex-col justify-center">
        {isSubmitted ? (
          <div className="flex flex-col items-center">
            <p className={`w-full text-center py-3 px-2 rounded-lg font-semibold flex items-center justify-center shadow-md ${attendanceStatus.status === 'hadir' ? 'bg-green-500/50 text-green-200' : 'bg-red-500/50 text-red-200'
              }`}>
              {attendanceStatus.status === 'hadir' ? <CheckIcon className="h-5 w-5 mr-1" /> : <XIcon className="h-5 w-5 mr-1" />}
              {attendanceStatus.status === 'hadir' ? 'Hadir (Terkirim)' : 'Tidak Hadir (Terkirim)'}
            </p>
          </div>
        ) : (isTimePast && !isAdmin) ? (
          <div className="flex flex-col items-center text-center gap-1 opacity-60">
            <div className="flex items-center gap-1.5 text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <p className="text-xs font-semibold">Waktu Terlewat</p>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">Gunakan menu Aktifitas Saya untuk pengajuan terlewat</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onHadir} disabled={!isActive && !isAdmin} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-green-500 hover:bg-green-400 text-white shadow-md disabled:bg-gray-500/50 disabled:cursor-not-allowed">
              <CheckIcon className="h-5 w-5 mr-1" /> Hadir
            </button>
            <button onClick={onTidakHadir} disabled={!isActive && !isAdmin} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-red-500 hover:bg-red-400 text-white shadow-md disabled:bg-gray-500/50 disabled:cursor-not-allowed">
              <XIcon className="h-5 w-5 mr-1" /> Tidak
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PrayerCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl flex flex-col items-center justify-between aspect-square bg-white/5 border-2 border-white/10 animate-pulse">
      <div className="grow flex flex-col items-center justify-center text-center w-full">
        <div className="p-3 rounded-full mb-2 bg-white/10 w-16 h-16"></div>
        <div className="h-5 bg-white/10 rounded w-2/3 mb-1"></div>
        <div className="h-3 bg-white/10 rounded w-1/3"></div>
      </div>
      <div className="w-full mt-3 h-18 bg-white/10 rounded-lg"></div>
    </div>
  );
};

export default PrayerCard;