'use client';

import React, { useState, useEffect } from 'react';

interface RealtimeClockProps {
  timezone?: string;
  variant?: 'compact' | 'full';
  className?: string;
}

const RealtimeClock: React.FC<RealtimeClockProps> = ({
  timezone = 'Asia/Jakarta',
  variant = 'compact',
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const jakartaTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));

  // Format waktu - HH:MM:SS
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format tanggal - DD MMM YYYY
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/\./g, '');
  };

  // Format hari - Senin, Selasa, etc
  const formatDay = (date: Date): string => {
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-white/5 backdrop-blur-md rounded-lg px-3 py-2.5 border border-white/10 hover:bg-white/10 transition-colors ${className}`}>
        <div className="flex items-center gap-3">
          {/* Time */}
          <div className="text-xl sm:text-2xl font-light text-white tracking-wide tabular-nums">
            {formatTime(jakartaTime)}
          </div>
          <div className="w-px h-6 bg-white/20" />
          {/* Date */}
          <div className="text-xs sm:text-sm">
            <div className="text-gray-300 leading-tight">{formatDay(jakartaTime)}</div>
            <div className="text-gray-500 leading-tight">{formatDate(jakartaTime)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-linear-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl ${className}`}>
      <div className="space-y-4">
        {/* Main Time Display */}
        <div className="text-center">
          <div className="text-6xl md:text-7xl font-light text-white tracking-wider tabular-nums">
            {formatTime(jakartaTime)}
          </div>
        </div>

        {/* Date Display */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-300 font-medium">{formatDay(jakartaTime)}</div>
            <div className="text-gray-500">{formatDate(jakartaTime)}</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <div className="text-teal-400 font-medium">WIB</div>
            <div className="text-gray-500">UTC+07:00</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeClock;