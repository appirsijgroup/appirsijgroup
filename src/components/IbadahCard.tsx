
import React from 'react';
import { type SunnahIbadah, type AttendanceStatus } from '../types';
import { iconMap, SparklesIcon } from './Icons';

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

interface IbadahCardProps {
    ibadah: SunnahIbadah;
    attendanceStatus: AttendanceStatus | undefined;
    onHadir: () => void;
    onTidakHadir: () => void;
    onUbah: () => void;
}

const IbadahCard: React.FC<IbadahCardProps> = ({ ibadah, attendanceStatus, onHadir, onTidakHadir, onUbah }) => {
    const isSubmitted = !!attendanceStatus?.submitted;
    const IbadahIcon = iconMap[ibadah.icon] || SparklesIcon;

    const cardClasses = `
    p-4 rounded-2xl flex flex-col items-center justify-between aspect-square
    transform transition-all duration-300 relative shadow-lg bg-white/5 backdrop-blur-sm border-2
    ${isSubmitted && attendanceStatus.status === 'hadir'
            ? 'border-green-400/80'
            : isSubmitted && attendanceStatus.status === 'tidak-hadir'
                ? 'border-red-400/80'
                : 'border-white/20 hover:-translate-y-1'
        }
  `;

    const primaryActionText = ibadah.type === 'puasa' ? 'Puasa' : 'Hadir';

    return (
        <div className={cardClasses}>
            <div className="grow flex flex-col items-center justify-center text-center">
                <div className={`p-3 rounded-full mb-2 transition-colors ${isSubmitted && attendanceStatus.status === 'hadir' ? 'bg-green-500/50' :
                        isSubmitted && attendanceStatus.status === 'tidak-hadir' ? 'bg-red-500/50' : 'bg-white/10'}`
                }>
                    <IbadahIcon className="h-8 w-8 text-teal-300" />
                </div>
                <h3 className="font-bold text-lg text-white">{ibadah.name}</h3>
                <div className="mt-1 h-10 flex flex-col items-center justify-center text-center">
                    {attendanceStatus?.status === 'tidak-hadir' && attendanceStatus?.reason && (
                        <p className="text-xs text-yellow-300 italic truncate" title={attendanceStatus.reason}>Ada alasan</p>
                    )}
                </div>
            </div>

            <div className="w-full mt-3 text-sm min-h-18 flex flex-col justify-center">
                {isSubmitted ? (
                    <div className="flex flex-col items-center">
                        <p className={`w-full text-center py-3 px-2 rounded-lg font-semibold flex items-center justify-center shadow-md ${attendanceStatus.status === 'hadir' ? 'bg-green-500/50 text-green-200' : 'bg-red-500/50 text-red-200'
                            }`}>
                            {attendanceStatus.status === 'hadir' ? <CheckIcon /> : <XIcon />}
                            {attendanceStatus.status === 'hadir' ? 'Terkirim' : 'Tidak Hadir'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onHadir} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-green-500 hover:bg-green-400 text-white shadow-md">
                            <CheckIcon /> {primaryActionText}
                        </button>
                        <button onClick={onTidakHadir} className="py-2 px-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 bg-red-500 hover:bg-red-400 text-white shadow-md">
                            <XIcon /> Tidak
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IbadahCard;
