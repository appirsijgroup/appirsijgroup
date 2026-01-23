

import React from 'react';
import { MenuIcon, XIcon, BellIcon } from './Icons';
import type { Employee } from '../types';
import Clock from './Clock';

interface HeaderProps {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  employee: Employee;
  title: string;
  unreadNotificationsCount: number;
  onToggleNotifications: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMenuOpen, toggleMenu, employee, title, unreadNotificationsCount, onToggleNotifications }) => {
  return (
    <header className="shrink-0 bg-gray-900/50 backdrop-blur-sm h-20 grid grid-cols-3 items-center px-4 sm:px-6 lg:px-8 border-b border-white/10 sticky top-0 z-20">
      {/* Left */}
      <div className="flex justify-start">
        <button onClick={toggleMenu} className="lg:hidden p-2 -ml-2 text-white" aria-label="Toggle Menu">
            {isMenuOpen ? <XIcon className="h-7 w-7"/> : <MenuIcon className="h-7 w-7"/>}
        </button>
      </div>

      {/* Center */}
       <div className="text-center col-span-1">
          <h2 className="text-lg font-bold text-white tracking-wide truncate" title={title}>
            {title}
          </h2>
          <p className="text-xs text-blue-300 hidden sm:block">
            Rumah Sakit Islam Jakarta Group
          </p>
        </div>

      {/* Right */}
      <div className="flex justify-end items-center gap-4">
        <Clock />
        <button
            onClick={onToggleNotifications}
            className="relative p-2 text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Buka notifikasi"
        >
            <BellIcon className="h-7 w-7"/>
            {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center">
                        {unreadNotificationsCount}
                    </span>
                </span>
            )}
        </button>
      </div>
    </header>
  );
};

export default Header;