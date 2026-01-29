

import React from 'react';
import { Menu, X, Bell } from 'lucide-react';
import type { Employee } from '../types';

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
    <header className="shrink-0 bg-gray-900/50 backdrop-blur-sm h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-white/10 sticky top-0 z-20">
      {/* Left */}
      <div className="w-12 sm:w-20">
        <button onClick={toggleMenu} className="lg:hidden p-2 -ml-2 text-white" aria-label="Toggle Menu">
          {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {/* Center - Title Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
        <h2 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight text-center line-clamp-2" title={title}>
          {title}
        </h2>
        <p className="text-[10px] sm:text-xs text-blue-300 font-medium hidden sm:block uppercase tracking-widest mt-0.5">
          RSI Jakarta Group
        </p>
      </div>

      {/* Right */}
      <div className="flex justify-end items-center gap-4">
        <button
          onClick={onToggleNotifications}
          className="relative p-2 text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Buka notifikasi"
        >
          <Bell className="h-7 w-7" />
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