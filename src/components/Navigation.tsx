import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  id: string; // Used for permission checks
}

interface NavigationProps {
  navItems: NavItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  unreadAnnouncementsCount: number;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ navItems, isOpen, setIsOpen, unreadAnnouncementsCount, onLogout }) => {
  const pathname = usePathname();
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const handleItemClick = useCallback((href: string, e?: React.MouseEvent) => {
    // Instant visual feedback
    setClickedItem(href);

    // Close mobile menu
    setIsOpen(false);

    // Clear click state after navigation
    setTimeout(() => {
      setClickedItem(null);
    }, 300);
  }, [setIsOpen]);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const isActive = (href: string) => {
    if (!pathname) return false; // Handle the case where pathname is null
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    return pathname.startsWith(href);
  };

  const navItemClass = (href: string) => {
    const isClicked = clickedItem === href;
    const active = isActive(href);

    return `w-full flex items-center justify-start text-left gap-4 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer
      transition-all duration-150 ease-out relative overflow-hidden
      ${active
        ? 'bg-teal-500 text-white shadow-md'
        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-[1.02]'
      }
      ${isClicked ? 'scale-95 brightness-110' : ''}
    `;
  };

  return (
    <>
      {/* Overlay for mobile/tablet */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-full lg:h-screen shrink-0 w-64 bg-gray-900/70 backdrop-blur-lg border-r border-white/10 z-40 transition-transform duration-200 ease-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-start h-20 shrink-0 border-b border-white/10 px-4">
            <i className="fa-solid fa-mosque text-3xl text-teal-300 mr-3"></i>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                APPI
              </h1>
              <p className="text-[10px] text-blue-300 -mt-1 whitespace-nowrap">Aplikasi Perilaku Pelayanan Islami</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleItemClick(item.href, e)}
                className={navItemClass(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
              // Link handles accessibility roles automatically
              >
                <item.icon className="w-6 h-6 shrink-0" />
                <span>{item.label}</span>
                {item.id === 'pengumuman' && unreadAnnouncementsCount > 0 && (
                  <div className="ml-auto relative">
                    <Bell className="w-5 h-5 text-amber-400 animate-swing" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-gray-900 animate-pulse"></span>
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="shrink-0 border-t border-white/10 p-4">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-start gap-4 px-4 py-3 text-sm font-semibold rounded-lg
                transition-all duration-150 ease-out
                ${clickedItem === 'logout' ? 'scale-95 brightness-110' : ''}
                text-red-400 hover:bg-red-900/30 hover:text-red-300 hover:scale-[1.02]`}
              title="Keluar dari Aplikasi"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// 🔥 OPTIMIZATION: Memoize Navigation component to prevent unnecessary re-renders
// Navigation only re-renders when navItems, isOpen, or unreadAnnouncementsCount change
export default React.memo(Navigation);