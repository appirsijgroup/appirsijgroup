'use client';

import React, { useMemo, useEffect, useCallback, startTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';
import ShareImageModal from './ShareImageModal';
import NotificationPanel from './NotificationPanel';
import AssignmentLetter from './AssignmentLetter';
import { ErrorBoundary } from './ErrorBoundary';
import ActivationRequired from './ActivationRequired';
import { useUIStore, useNotificationStore, useAppDataStore, useMutabaahStore } from '@/store/store';
import { activateMonth as activateMonthService } from '@/services/monthlyActivityService';
import { useAnnouncementStore } from '@/store/announcementStore';
import type { Employee } from '@/types';
import { isAnyAdmin } from '@/lib/rolePermissions';
import {
    CalendarDaysIcon,
    MegaphoneIcon,
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
import type { Notification } from '@/types';

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
    const { isMenuOpen, setIsMenuOpen, isNotificationPanelOpen, setIsNotificationPanelOpen, toasts, removeToast, shareModalState } = useUIStore();
    const { announcements } = useAnnouncementStore();
    const { notifications } = useNotificationStore();
    const { loadFromSupabase, subscribeToRealtime } = useMutabaahStore();

    // ⚡ OPTIMIZATION: Defer non-critical counts to prevent blocking initial render
    const [deferredUnreadAnnouncements, setDeferredUnreadAnnouncements] = useState(0);
    const [deferredUnreadNotifications, setDeferredUnreadNotifications] = useState(0);
    const [isActivating, setIsActivating] = useState(false);

    // 🔥 Assignment Letter Modal State
    const [assignmentLetter, setAssignmentLetter] = useState<{
        recipient: Employee;
        roleName: 'Mentor' | 'Supervisor' | 'Kepala Unit';
        assignmentType: 'assignment' | 'removal' | 'change' | 'designation' | 'revocation';
        assigneeName?: string;
        previousAssigneeName?: string;
        notificationTimestamp: number;
    } | null>(null);

    // --- Handle Activation of Lembar Mutaba'ah ---
    const { addToast } = useUIStore();

    const handleActivation = useCallback(async (monthKey: string): Promise<boolean> => {
        if (!loggedInEmployee?.id) {
            addToast('Data user belum dimuat. Silakan coba lagi.', 'error');
            return false;
        }

        setIsActivating(true);
        try {
            const success = await activateMonthService(loggedInEmployee.id, monthKey);

            if (success) {
                // Show success toast
                addToast('Lembar Mutaba\'ah berhasil diaktifkan!', 'success');

                // Reload employee data from Supabase to get latest state
                await loadLoggedInEmployee();

                // Reset activating state
                setIsActivating(false);

                return true;
            } else {
                addToast('Gagal mengaktifkan Lembar Mutaba\'ah. Silakan coba lagi.', 'error');
                setIsActivating(false);
                return false;
            }
        } catch (error) {
            console.error('Error activating month:', error);
            addToast('Terjadi kesalahan saat mengaktifkan Lembar Mutaba\'ah.', 'error');
            setIsActivating(false);
            return false;
        }
    }, [loggedInEmployee, addToast, loadLoggedInEmployee]);

    // --- Load Employee Data from Session on Mount ---
    useEffect(() => {
        // HANYA load jika BELUM hydrate DAN employee BELUM ada
        // Jangan load lagi ketika employee sudah ada!
        if (!isHydrated && loggedInEmployee === null) {
            // Load user from session (middleware already verified the session)
            loadLoggedInEmployee();
        }
        // 🔥 FIX: Remove loadLoggedInEmployee from deps to prevent infinite reload
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated, loggedInEmployee]);

    // --- Load Mutabaah Settings from Supabase ---
    useEffect(() => {
        // Load settings after user is logged in
        if (isHydrated && loggedInEmployee) {
            loadFromSupabase().catch(error => {
                console.error('❌ Error loading mutabaah settings:', error);
            });
        }
        // 🔥 FIX: Remove loadFromSupabase from deps to prevent infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated, loggedInEmployee]);

    // --- Subscribe to Mutabaah Settings Realtime Updates ---
    useEffect(() => {
        // Subscribe to realtime updates after user is logged in
        if (isHydrated && loggedInEmployee) {
            const unsubscribe = subscribeToRealtime();

            // Cleanup on unmount
            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }
        // 🔥 FIX: Remove subscribeToRealtime from deps to prevent infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated, loggedInEmployee]);

    // --- Load Notifications from Supabase & Subscribe to Realtime ---
    useEffect(() => {
        // Load notifications after user is logged in
        if (isHydrated && loggedInEmployee) {
            const { hydrate, subscribeToRealtime } = useNotificationStore.getState();

            console.log('🔄 Loading notifications for user:', loggedInEmployee.id);

            // Load notifications from Supabase - SELALU load setiap user login (bukan cuma sekali)
            hydrate(loggedInEmployee.id).then(() => {
                console.log('✅ Notifications loaded from Supabase');
                // Force refresh component setelah hydrate selesai
                setTimeout(() => {
                    const { notifications } = useNotificationStore.getState();
                    console.log('📊 Current notifications in store:', notifications.length, 'for user', loggedInEmployee.id);
                }, 500);
            }).catch(error => {
                console.error('❌ Error loading notifications:', error);
            });

            // Subscribe to realtime notifications
            subscribeToRealtime(loggedInEmployee.id);
        }
    }, [isHydrated, loggedInEmployee]);

    // --- Handle Assignment Letter Modal from Custom Events ---
    useEffect(() => {
        const handleOpenAssignmentLetter = (event: CustomEvent) => {
            console.log('📜 Open assignment letter event received:', event.detail);
            const { link } = event.detail;
            const params = link.params;

            if (!loggedInEmployee || !params) {
                console.error('❌ Missing employee or params for assignment letter');
                return;
            }

            // Get assignee and previous assignee names from allUsers if needed
            let assigneeName = params.assigneeName;
            let previousAssigneeName = params.previousAssigneeName;

            // If names not provided but IDs are, fetch from users data
            // This will be handled by the server when notifications are created
            // For now, use what's provided in params

            setAssignmentLetter({
                recipient: loggedInEmployee,
                roleName: params.roleName,
                assignmentType: params.assignmentType,
                assigneeName: assigneeName || params.assigneeId,
                previousAssigneeName: previousAssigneeName || params.previousAssigneeId,
                notificationTimestamp: Date.now(),
            });

            console.log('✅ Assignment letter modal opened');
        };

        window.addEventListener('open-assignment-letter', handleOpenAssignmentLetter as EventListener);

        return () => {
            window.removeEventListener('open-assignment-letter', handleOpenAssignmentLetter as EventListener);
        };
    }, [loggedInEmployee]);

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

    // --- Check if current month is activated for Mutaba'ah ---
    const activationStatus = useMemo(() => {
        if (!loggedInEmployee) {
            return {
                isActivated: true,
                shouldShowActivationRequired: false,
                currentMonthName: '',
                currentMonthKey: ''
            }; // Default to true if no employee
        }

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const activatedMonths = loggedInEmployee.activatedMonths || loggedInEmployee.activated_months || [];
        const isActivated = activatedMonths.includes(currentMonthKey);

        // Don't block on the aktivitas-bulanan page itself (user can still see the activation UI there)
        const isOnAktivitasBulananPage = pathname?.startsWith('/aktivitas-bulanan');

        return {
            isActivated,
            shouldShowActivationRequired: !isActivated && !isOnAktivitasBulananPage,
            currentMonthName: now.toLocaleDateString('id-ID', { month: 'long' }) || '',
            currentMonthKey: currentMonthKey || ''
        };
    }, [loggedInEmployee, pathname]);

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

            // Special handling for assignment_letter - dispatch custom event
            if (link.view === 'assignment_letter') {
                window.dispatchEvent(new CustomEvent('open-assignment-letter', {
                    detail: { link }
                }));
                return;
            }

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

    // --- Handle Assignment Letter from Notification Click ---
    const handleOpenAssignmentLetter = useCallback((notification: Notification) => {
        console.log('📜 Assignment letter notification clicked:', notification);
        const params = notification.linkTo?.params;

        if (!loggedInEmployee || !params) {
            console.error('❌ Missing employee or params for assignment letter');
            return;
        }

        setAssignmentLetter({
            recipient: loggedInEmployee,
            roleName: params.roleName,
            assignmentType: params.assignmentType,
            assigneeName: params.assigneeName || params.assigneeId,
            previousAssigneeName: params.previousAssigneeName || params.previousAssigneeId,
            notificationTimestamp: notification.timestamp,
        });

        // Close notification panel
        setIsNotificationPanelOpen(false);

        console.log('✅ Assignment letter modal opened from notification');
    }, [loggedInEmployee, setIsNotificationPanelOpen]);

    const handleToggleMenu = useCallback(() => {
        setIsMenuOpen(!isMenuOpen);
    }, [isMenuOpen, setIsMenuOpen]);

    // 🔥 REMOVED: No loading screen - middleware handles auth redirect
    // Don't show loading spinner, just render empty or let middleware redirect

    // Guard: if no employee, don't render (middleware will redirect)
    if (!loggedInEmployee) {
        return null;
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
                <main className="flex-1 overflow-y-auto p-2 sm:p-4 relative" id="main-content-area">
                    <ErrorBoundary>
                        {/* 🔥 Smooth loading indicator */}
                        {(!isHydrated || !loggedInEmployee) && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-900/95 to-indigo-800/95 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-400 border-t-transparent mx-auto mb-4"></div>
                                    <p className="text-white text-base font-medium">Memuat...</p>
                                </div>
                            </div>
                        )}

                        {/* Page content with fade-in animation */}
                        <div className={`transition-opacity duration-200 ${isHydrated && loggedInEmployee ? 'opacity-100' : 'opacity-0'}`}>
                            {activationStatus.shouldShowActivationRequired ? (
                                <div className="flex items-center justify-center min-h-[80vh] w-full px-2">
                                    <ActivationRequired
                                        monthName={activationStatus.currentMonthName}
                                        monthKey={activationStatus.currentMonthKey}
                                        onActivate={handleActivation}
                                        isLoading={isActivating}
                                    />
                                </div>
                            ) : (
                                children
                            )}
                        </div>
                    </ErrorBoundary>
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
                onOpenAssignmentLetter={handleOpenAssignmentLetter}
                loggedInUserId={loggedInEmployee?.id || ''}
            />

            {/* Assignment Letter Modal */}
            {assignmentLetter && (
                <AssignmentLetter
                    recipient={assignmentLetter.recipient}
                    roleName={assignmentLetter.roleName}
                    assignmentType={assignmentLetter.assignmentType}
                    assigneeName={assignmentLetter.assigneeName}
                    previousAssigneeName={assignmentLetter.previousAssigneeName}
                    notificationTimestamp={assignmentLetter.notificationTimestamp}
                    onClose={() => setAssignmentLetter(null)}
                />
            )}

        </div>
    );
}
