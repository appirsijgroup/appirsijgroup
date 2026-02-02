import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/store/store';

const Clock: React.FC = () => {
  const displayTime = useUIStore(state => state.currentTime);

  // Format date and time
  const formattedTime = displayTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Use 24-hour format
  });

  const formattedDate = displayTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="text-right">
      <div className="text-xs text-blue-300">{formattedDate}</div>
    </div>
  );
};

export default Clock;