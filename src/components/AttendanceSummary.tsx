import React from 'react';

interface AttendanceSummaryProps {
  wajibCount: number;
  attendedWajibCount: number;
}

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ wajibCount, attendedWajibCount }) => {
  const percentage = wajibCount > 0 ? (attendedWajibCount / wajibCount) * 100 : 0;

  return (
    <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
      <h2 className="text-xl font-bold text-white mb-3">Ringkasan Hari Ini</h2>
      
      <p className="font-semibold text-white">Progres Sholat Wajib</p>
      <div className="flex justify-between items-center mb-2 text-blue-300 text-sm">
        <p>Hadir</p>
        <p className="font-semibold text-white">{attendedWajibCount} / {wajibCount}</p>
      </div>
      <div className="w-full bg-black/30 rounded-full h-4">
        <div 
          className="bg-linear-to-r from-green-400 to-teal-500 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AttendanceSummary;
