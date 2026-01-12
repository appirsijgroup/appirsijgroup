'use client';

import React, { useMemo, useEffect, useCallback, startTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Navigation, { NavItem } from './Navigation';
import Footer from './Footer';
import ShareImageModal from './ShareImageModal';
import NotificationPanel from './NotificationPanel';
import { useUIStore, useNotificationStore, useAppDataStore, useMutabaahStore } from '@/store/store';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useMutabaah } from '@/contexts/MutabaahContext';
import { isAnyAdmin } from '@/lib/rolePermissions';
import {
    ChartBarIcon,
    CalendarDaysIcon,
    PresensiIcon,
    MegaphoneIcon,
    GroupIcon,
    BookOpenIcon,
    BookmarkIcon,
    UserIcon,
    AdminIcon,
    HomeIcon,
    QuranIcon,
    PrayerBeadIcon,
    ClipboardDocumentIcon,
    DocumentDuplicateIcon,
    IdentificationIcon,
    UsersIcon,
    ClockIcon
} from './Icons';
import type { View, Notification } from '@/types';

const allNavItemsRaw = [
    { id: 'dashboard-saya', label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
    { id: 'aktifitas-saya', label: 'Aktifitas Saya', icon: ClockIcon, href: '/aktifitas-saya' },
    { id: 'aktivitas-bulanan', label: 'Lembar Mutaba\'ah', icon: CalendarDaysIcon, href: '/aktivitas-bulanan' },
    { id: 'presensi', label: 'Presensi Harian', icon: ClipboardDocumentIcon, href: '/presensi' },
    { id: 'pengumuman', label: 'Pengumuman', icon: MegaphoneIcon, href: '/pengumuman' },
    { id: 'kegiatan', label: 'Kegiatan Terjadwal', icon: UsersIcon, href: '/kegiatan' },
    { id: 'alquran', label: 'Al-Qur\'an', icon: QuranIcon, href: '/alquran' },
    { id: 'bookmarks', label: 'Bookmark', icon: DocumentDuplicateIcon, href: '/bookmarks' },
    { id: 'panduan-doa', label: 'Panduan & Doa', icon: PrayerBeadIcon, href: '/panduan-doa' },
    { id: 'profile', label: 'Profil', icon: IdentificationIcon, href: '/profile' },
    { id: 'admin', label: 'Admin Dashboard', icon: AdminIcon, href: '/admin' },
];

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { loggedInEmployee, loadLoggedInEmployee, isHydrated, logoutEmployee, setHydrated, isLoggingOut } = useAppDataStore();
    const { isMenuOpen, setIsMenuOpen, isNotificationPanelOpen, setIsNotificationPanelOpen, toasts, removeToast, addToast, shareModalState } = useUIStore();
    const { announcements } = useAnnouncementStore();
    const { notifications } = useNotificationStore();
    const { loadFromSupabase } = useMutabaahStore();

    // ⚡ OPTIMIZATION: Defer non-critical counts to prevent blocking initial render
    const [deferredUnreadAnnouncements, setDeferredUnreadAnnouncements] = useState(0);
    const [deferredUnreadNotifications, setDeferredUnreadNotifications] = useState(0);

    // --- Auth Check (FAST PATH - runs before loading data) ---
    useEffect(() => {
        // Fast auth check using localStorage (no database query needed)
        const userId = localStorage.getItem('loggedInUserId');

        if (!userId && !isHydrated) {
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
            router.push('/login');
        }
    }, [loggedInEmployee, isHydrated, router]);

    // --- Load Mutabaah Settings from Supabase ---
    useEffect(() => {
        // Load settings after user is logged in
        if (isHydrated && loggedInEmployee) {
            loadFromSupabase().catch(error => {
                console.error('❌ Error loading mutabaah settings:', error);
            });
        }
    }, [isHydrated, loggedInEmployee, loadFromSupabase]);

    // ⚡ OPTIMIZATION: Defer unread counts calculation using startTransition
    useEffect(() => {
        if (!loggedInEmployee) return;

        // Calculate immediately but update in transition for better performance
        startTransition(() => {
            const lastRead = loggedInEmployee.lastAnnouncementReadTimestamp || 0;
            const announcementCount = announcements.filter(a => {
                if (a.timestamp <= lastRead) return false;

                // Alliansi scope without hospital targeting - everyone can see
                if (a.scope === 'alliansi' && (!a.targetHospitalIds || a.targetHospitalIds.length === 0)) return true;

                // Alliansi scope with hospital targeting - only users from those hospitals can see
                if (a.scope === 'alliansi' && a.targetHospitalIds && a.targetHospitalIds.length > 0) {
                    const isAdmin = loggedInEmployee.role === 'super-admin' || loggedInEmployee.role === 'admin' ;
                    if (isAdmin) return true;
                    return loggedInEmployee.hospitalId && a.targetHospitalIds.includes(loggedInEmployee.hospitalId);
                }

                // Mentor scope - mentors and their mentees can see
                if (a.scope === 'mentor') {
                    const isAdmin = loggedInEmployee.role === 'super-admin' || loggedInEmployee.role === 'admin' ;
                    if (isAdmin) return true;
                    if (loggedInEmployee.canBeMentor) return true;
                    if (loggedInEmployee.mentorId === a.authorId) return true;
                }

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
            const isAdmin = isAnyAdmin(loggedInEmployee); // 🔥 NOW INCLUDES OWNER!

            if (item.id === 'admin' && !isAdmin) return false;
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

    const handleCloseNotifications = useCallback(() => {
        setIsNotificationPanelOpen(false);
    }, [setIsNotificationPanelOpen]);

    const handleNotificationNavigate = useCallback((link: Notification['linkTo']) => {
        if (link) {
            setIsNotificationPanelOpen(false);

            // Build the URL based on the link structure
            const basePath = `/${link.view}`;
            const queryString = link.params
                ? '?' + new URLSearchParams(
                    Object.entries(link.params).map(([key, value]) => [key, String(value)])
                  ).toString()
                : '';

            const tabSuffix = link.tab ? `/${link.tab}` : '';
            const fullPath = `${basePath}${tabSuffix}${queryString}`;

            router.push(fullPath);
        }
    }, [router, setIsNotificationPanelOpen]);

    const handleToggleMenu = useCallback(() => {
        setIsMenuOpen(!isMenuOpen);
    }, [isMenuOpen, setIsMenuOpen]);

    // 🔥 OPTIMIZATION: Only check loggedInEmployee, defer all non-critical loading
    // Don't show loading spinner if we're logging out
    if (!loggedInEmployee && !isLoggingOut) {
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
                    employee={loggedInEmployee!}
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

            {/* Notification Panel */}
            <NotificationPanel
                isOpen={isNotificationPanelOpen}
                onClose={handleCloseNotifications}
                onNavigate={handleNotificationNavigate}
                loggedInUserId={loggedInEmployee?.id || ''}
            />

        </div>
    );
}
