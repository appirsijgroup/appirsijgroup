

import React from 'react';
import { type Activity, type AttendanceStatus } from '../types';
import { GroupIcon } from './Icons';

interface ActivityCardProps {
  activity: Activity;
  attendanceStatus: AttendanceStatus | undefined;
  isActive: boolean;
  isTimePast: boolean;
  onHadir: () => void;
  onTidakHadir: () => void;
  onUbah: () => void;
  onSend: () => void;
}

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 0011.31 16.5l4 1a1 1 0 001.169-1.409l-7-14z" />
    </svg>
);

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, attendanceStatus, isActive, isTimePast, onHadir, onTidakHadir, onUbah, onSend }) => {
  const status = attendanceStatus?.status;
  const isSubmitted = attendanceStatus?.submitted;

  const cardClasses = `
    p-4 rounded-2xl flex flex-col items-center justify-between aspect-square
    transform transition-all duration-300 backdrop-blur-sm shadow-lg relative border-2
    ${isSubmitted ? 'bg-purple-600/50 border-purple-400' : ''}
    ${!isSubmitted && status === 'hadir' ? 'bg-green-500/30 border-green-400 shadow-green-500/20' : ''}
    ${!isSubmitted && status === 'tidak-hadir' ? 'bg-red-500/30 border-red-400 shadow-red-500/20' : ''}
    ${!status && isActive ? 'bg-white/10 border-white/20 hover:bg-white/20 hover:-translate-y-1' : ''}
    ${!status && !isActive && !isTimePast ? 'bg-black/30 border-gray-600' : ''}
    ${!status && isTimePast ? 'bg-yellow-500/20 border-yellow-500' : ''}
    ${!isSubmitted && status && !isActive ? 'opacity-70' : ''}
  `;
  
  const isActionable = isActive && !isSubmitted;

  return (
    <div className={cardClasses}>
       {!isActive && !isSubmitted && !isTimePast && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
          <span className="text-sm font-semibold text-gray-300 px-2 text-center">
             Belum Waktunya
          </span>
        </div>
      )}

      <div className="grow flex flex-col items-center justify-center text-center">
          <div className={`p-3 rounded-full mb-2 transition-colors ${
              isSubmitted ? 'bg-purple-500/50' :
              status === 'hadir' ? 'bg-green-500/50' : 
              status === 'tidak-hadir' ? 'bg-red-500/50' : 'bg-white/10'}`
            }>
            <GroupIcon className="h-8 w-8 text-purple-300" />
          </div>
          <h3 className="font-bold text-lg">{activity.name}</h3>
          <p className="text-xs text-blue-200">{activity.startTime} - {activity.endTime}</p>
           <div className="mt-1 h-5 flex items-center justify-center text-center">
            {status === 'tidak-hadir' && attendanceStatus?.reason ? (
                <p className="text-xs text-yellow-300 italic truncate" title={attendanceStatus.reason}>Ada alasan</p>
            ) : null}
          </div>
      </div>

      <div className="w-full mt-3 space-y-2 text-sm min-h-18 flex flex-col justify-end">
        {isSubmitted ? (
            <div className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center bg-purple-500/50 text-white shadow-md">
                <CheckIcon /> Terkirim
            </div>
        ) : !status ? (
            isTimePast ? (
                <div className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center bg-yellow-500/50 text-white/80 shadow-md">
                    Selesai
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                <button onClick={onHadir} disabled={!isActionable} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-green-500 hover:bg-green-400 text-white shadow-md disabled:bg-gray-500/50 disabled:cursor-not-allowed">
                    <CheckIcon /> Hadir
                </button>
                <button onClick={onTidakHadir} disabled={!isActionable} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-red-500 hover:bg-red-400 text-white shadow-md disabled:bg-gray-500/50 disabled:cursor-not-allowed">
                    <XIcon /> Tidak
                </button>
                </div>
            )
        ) : (
             <div className="flex flex-col items-center space-y-2">
                <p className={`font-semibold flex items-center ${status === 'hadir' ? 'text-green-300' : 'text-red-300'}`}>
                    {status === 'hadir' ? <CheckIcon/> : <XIcon/> } 
                    {status === 'hadir' ? 'Hadir' : 'Tidak Hadir'}
                </p>
                 <div className="w-full grid grid-cols-2 gap-2 text-xs">
                    <button onClick={onUbah} disabled={!isActionable} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-gray-500/50 hover:bg-gray-400/50 text-white disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-400">
                        <PencilIcon /> Ubah
                    </button>
                    <button onClick={onSend} disabled={!isActionable} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-purple-500 hover:bg-purple-400 text-white disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-400">
                        <SendIcon /> Kirim
                    </button>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;