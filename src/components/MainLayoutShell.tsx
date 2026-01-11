'use client';

import React, { useMemo, useEffect, useCallback, startTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Navigation, { NavItem } from './Navigation';
import Footer from './Footer';
import ShareImageModal from './ShareImageModal';
import { useUIStore, useNotificationStore, useAppDataStore } from '@/store/store';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useMutabaah } from '@/contexts/MutabaahContext';
import {
    ChartBarIcon,
    CalendarDaysIcon,
    PresensiIcon,
    MegaphoneIcon,
    GroupIcon,
    BookOpenIcon,
    BookmarkIcon,
    UserIcon,
    ShieldCheckIcon,
    AdminIcon
} from './Icons';
import type { View } from '@/types';

const allNavItemsRaw = [
    { id: 'dashboard-saya', label: 'Dashboard Saya', icon: ChartBarIcon, href: '/dashboard' },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon, href: '/analytics' },
    { id: 'aktivitas-bulanan', label: 'Lembar Mutaba\'ah', icon: CalendarDaysIcon, href: '/aktivitas-bulanan' },
    { id: 'presensi', label: 'Presensi Harian', icon: PresensiIcon, href: '/presensi' },
    { id: 'pengumuman', label: 'Pengumuman', icon: MegaphoneIcon, href: '/pengumuman' },
    { id: 'kegiatan', label: 'Kegiatan Terjadwal', icon: GroupIcon, href: '/kegiatan' },
    { id: 'alquran', label: 'Al-Qur\'an', icon: BookOpenIcon, href: '/alquran' },
    { id: 'bookmarks', label: 'Bookmark', icon: BookmarkIcon, href: '/bookmarks' },
    { id: 'panduan-doa', label: 'Panduan & Doa', icon: BookOpenIcon, href: '/panduan-doa' },
    { id: 'profile', label: 'Profil', icon: UserIcon, href: '/profile' },
    { id: 'dashboard-binroh', label: 'Binroh Dashboard', icon: ShieldCheckIcon, href: '/binroh' },
    { id: 'admin', label: 'Admin Dashboard', icon: AdminIcon, href: '/admin' },
];

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { loggedInEmployee, loadLoggedInEmployee, isHydrated, logoutEmployee, setHydrated } = useAppDataStore();
    const { isMenuOpen, setIsMenuOpen, isNotificationPanelOpen, setIsNotificationPanelOpen, toasts, removeToast, addToast, shareModalState } = useUIStore();
    const { announcements } = useAnnouncementStore();
    const { notifications } = useNotificationStore();

    // ⚡ OPTIMIZATION: Defer non-critical counts to prevent blocking initial render
    const [deferredUnreadAnnouncements, setDeferredUnreadAnnouncements] = useState(0);
    const [deferredUnreadNotifications, setDeferredUnreadNotifications] = useState(0);

    // --- Auth Check (FAST PATH - runs before loading data) ---
    useEffect(() => {
        // Fast auth check using localStorage (no database query needed)
        const userId = localStorage.getItem('loggedInUserId');

        if (!userId && !isHydrated) {
            console.log('🔒 No user session in localStorage - redirecting to login immediately');
            setHydrated(true);
            router.push('/login');
            return;
        }
    }, [isHydrated, router, setHydrated]);

    // --- Load Employee Data from Supabase on Mount ---
    useEffect(() => {
        if (!isHydrated && loggedInEmployee === null) {
            const userId = localStorage.getItem('loggedInUserId');
            if (userId) {
                console.log('🔄 App starting, loading employee data from Supabase...');
                loadLoggedInEmployee();
            } else {
                // No user session - mark as hydrated immediately to prevent loading
                setHydrated(true);
            }
        }
    }, [isHydrated, loggedInEmployee, loadLoggedInEmployee, setHydrated]);

    // --- Auth Check After Hydration ---
    useEffect(() => {
        // Only check auth after hydration is complete
        if (!isHydrated) return;

        // Check if user is authenticated
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId || !loggedInEmployee) {
            console.log('🔒 No valid session found, redirecting to login');
            router.push('/login');
        } else {
            console.log('✅ User is authenticated:', loggedInEmployee.name);
        }
    }, [loggedInEmployee, isHydrated, router]);

    // ⚡ OPTIMIZATION: Defer unread counts calculation using startTransition
    useEffect(() => {
        if (!loggedInEmployee) return;

        // Calculate immediately but update in transition for better performance
        startTransition(() => {
            const lastRead = loggedInEmployee.lastAnnouncementReadTimestamp || 0;
            const announcementCount = announcements.filter(a => {
                if (a.timestamp <= lastRead) return false;
                if (a.scope === 'global') return true;
                if (a.scope === 'mentor' && loggedInEmployee.mentorId === a.authorId) return true;
                return false;
            }).length;

            const now = Date.now();
            const notificationCount = notifications.filter(n =>
                !n.isRead &&
                n.userId === loggedInEmployee?.id &&
                !(n.expiresAt && now > n.expiresAt)
            ).length;

            setDeferredUnreadAnnouncements(announcementCount);
            setDeferredUnreadNotifications(notificationCount);
        });
    }, [announcements, notifications, loggedInEmployee]);


    // --- Filter Nav Items ---
    const filteredNavItems = useMemo(() => {
        if (!loggedInEmployee) return [];

        return allNavItemsRaw.filter(item => {
            const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';
            const isBinroh = loggedInEmployee.functionalRoles?.includes('BINROH');
            const hasAnalyticsAccess = isAdmin || (loggedInEmployee.functionalRoles && loggedInEmployee.functionalRoles.length > 0);

            if (item.id === 'admin' && !isAdmin) return false;
            if (item.id === 'dashboard-binroh' && !isBinroh) return false;
            if (item.id === 'analytics' && !hasAnalyticsAccess) return false;
            return true;
        });
    }, [loggedInEmployee]);

    const activeTitle = useMemo(() =>
        allNavItemsRaw.find(item => pathname?.startsWith(item.href))?.label || 'Dashboard',
        [pathname]
    );

    // ⚡ OPTIMIZATION: Use useCallback to prevent unnecessary re-renders
    const handleLogout = useCallback(() => {
        logoutEmployee();
        router.push('/login');
    }, [logoutEmployee, router]);

    const handleToggleNotifications = useCallback(() => {
        setIsNotificationPanelOpen(true);
    }, [setIsNotificationPanelOpen]);

    const handleToggleMenu = useCallback(() => {
        setIsMenuOpen(!isMenuOpen);
    }, [isMenuOpen, setIsMenuOpen]);

    // 🔥 OPTIMIZATION: Only check loggedInEmployee, defer all non-critical loading
    if (!loggedInEmployee) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-lg">{!isHydrated ? 'Memuat sesi...' : 'Memuat data user...'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row relative">
            <Navigation
                navItems={filteredNavItems}
                isOpen={isMenuOpen}
                setIsOpen={setIsMenuOpen}
                unreadAnnouncementsCount={deferredUnreadAnnouncements}
                onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-gradient-to-br from-slate-900 to-indigo-800">
                <Header
                    isMenuOpen={isMenuOpen}
                    toggleMenu={handleToggleMenu}
                    employee={loggedInEmployee}
                    title={activeTitle}
                    unreadNotificationsCount={deferredUnreadNotifications}
                    onToggleNotifications={handleToggleNotifications}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" id="main-content-area">
                    {children}
                </main>
                <Footer />
            </div>

            {/* Toasts - kept globally here if not using a Provider */}
            <div className="fixed top-20 right-4 z-[100] space-y-3 w-full max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden animate-toast-in flex border border-slate-700"
                    >
                        <div className={`w-1.5 flex-shrink-0 ${toast.type === 'success' ? 'bg-teal-400' : 'bg-red-500'}`}></div>
                        <div className="flex items-start gap-4 p-4">
                            <div className="flex-grow">
                                <p className={`font-bold ${toast.type === 'success' ? 'text-teal-300' : 'text-red-400'}`}>
                                    {toast.title}
                                </p>
                                <p className="text-sm text-slate-200">{toast.message}</p>
                            </div>
                            <button onClick={() => removeToast(toast.id)} className="text-white hover:text-gray-300">X</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Share Image Modal */}
            <ShareImageModal
                isOpen={shareModalState.isOpen}
                onClose={() => {
                    const { closeShareModal } = useUIStore.getState();
                    closeShareModal();
                }}
                type={shareModalState.type}
                content={shareModalState.content}
            />

        </div>
    );
}
