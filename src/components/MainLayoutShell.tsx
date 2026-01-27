'use client';

import React, { useMemo, useEffect, useCallback, startTransition, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';
import ShareImageModal from './ShareImageModal';
import NotificationPanel from './NotificationPanel';
import AssignmentLetter from './AssignmentLetter';
import { ErrorBoundary } from './ErrorBoundary';
import ActivationRequired from './ActivationRequired';
import ConfirmationModal from './ConfirmationModal';
import BrandedLoader from './BrandedLoader';
import { useUIStore, useNotificationStore, useAppDataStore, useMutabaahStore } from '@/store/store';
import { activateMonth as activateMonthService } from '@/services/monthlyActivityService';
import { useAnnouncementStore } from '@/store/announcementStore';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { useMutabaah } from '@/contexts/MutabaahContext';
import { logger } from '@/lib/logger';
import { Suspense } from 'react';
import type { Employee } from '@/types';
import { isAnyAdmin } from '@/lib/rolePermissions';
import {
    LayoutDashboard,
    History,
    CalendarDays,
    ClipboardCheck,
    Megaphone,
    Users,
    CalendarClock,
    BookOpen,
    Bookmark,
    HandHeart,
    UserCircle,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';
import type { Notification } from '@/types';

const allNavItemsRaw = [
    { id: 'dashboard-saya', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'aktifitas-saya', label: "Lapor Aktifitas", icon: History, href: '/aktifitas-saya' },
    { id: 'presensi', label: 'Presensi Harian', icon: ClipboardCheck, href: '/presensi' },
    { id: 'aktivitas-bulanan', label: "Lembar Mutaba'ah", icon: CalendarDays, href: '/aktivitas-bulanan' },
    { id: 'jadwal-sesi', label: 'Jadwal & Sesi', icon: CalendarClock, href: '/jadwal-sesi' },
    { id: 'panel-mentor', label: 'Panel Supervisi', icon: Users, href: '/panel-mentor' },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone, href: '/pengumuman' },
    { id: 'alquran', label: "Al-Qur'an", icon: BookOpen, href: '/alquran' },
    { id: 'bookmarks', label: 'Bookmark', icon: Bookmark, href: '/bookmarks' },
    { id: 'panduan-doa', label: 'Panduan & Doa', icon: HandHeart, href: '/panduan-doa' },
    { id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, href: '/admin' },
    { id: 'profile', label: 'Profil', icon: UserCircle, href: '/profile' },
];

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { loggedInEmployee, loadLoggedInEmployee, isHydrated, logoutEmployee, setHydrated, isLoggingOut } = useAppDataStore();
    const { isMenuOpen, setIsMenuOpen, isNotificationPanelOpen, setIsNotificationPanelOpen, toasts, removeToast, shareModalState, setGlobalLoading, globalLoading } = useUIStore();

    const { announcements } = useAnnouncementStore();
    const { notifications } = useNotificationStore();
    const { loadFromSupabase, subscribeToRealtime } = useMutabaahStore();

    // 🔥 FIX: Use MutabaahContext as single source of truth for activation status
    const { isCurrentMonthActivated, isLoading: isMutabaahLoading } = useMutabaah();

    // 🔥 AUTO-REFRESH SESSION: Keep user logged in by refreshing token every 10 minutes
    // This prevents the "session expired" issue after 15 minutes
    useSessionRefresh(
        10 * 60 * 1000, // Refresh every 10 minutes
        isHydrated && !!loggedInEmployee // Only refresh if user is logged in
    );

    // 🔥 AUTO-LOGOUT: Logout after 15 minutes of inactivity
    // This applies to both Desktop and PWA
    useAutoLogout(15 * 60 * 1000);

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

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // --- Handle Activation of Lembar Mutaba'ah ---
    const { addToast } = useUIStore();

    const handleActivation = useCallback(async (monthKey: string): Promise<boolean> => {
        console.log('🔍 [handleActivation] Called with monthKey:', monthKey);
        console.log('🔍 [handleActivation] loggedInEmployee:', loggedInEmployee);
        console.log('🔍 [handleActivation] loggedInEmployee?.id:', loggedInEmployee?.id);

        if (!loggedInEmployee?.id) {
            console.error('❌ [handleActivation] loggedInEmployee or loggedInEmployee.id is null/undefined!');
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
            logger.error('Error activating month:', error);
            addToast('Terjadi kesalahan saat mengaktifkan Lembar Mutaba\'ah.', 'error');
            setIsActivating(false);
            return false;
        }
    }, [loggedInEmployee, addToast, loadLoggedInEmployee]);

    // --- Load Employee Data from Session on Mount ---
    // ✅ REMOVED: Duplicate useEffect - now handled in single useEffect below (line ~370)

    // --- Load Mutabaah Settings from Supabase ---
    useEffect(() => {
        // Load settings after user is logged in
        if (isHydrated && loggedInEmployee) {
            loadFromSupabase().catch(error => {
                logger.error('Error loading mutabaah settings:', error);
            });
        }
        // 🔥 FIX: Remove loadFromSupabase from deps to prevent infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated, loggedInEmployee]);

    // --- Subscribe to Mutabaah Settings Realtime Updates ---
    useEffect(() => {
        // Subscribe to realtime updates after user is logged in
        if (isHydrated && loggedInEmployee?.id) {
            const unsubscribe = subscribeToRealtime();

            // Cleanup on unmount
            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }
    }, [isHydrated, loggedInEmployee?.id]);

    // --- Load Notifications from Supabase & Subscribe to Realtime ---
    useEffect(() => {
        // Load notifications after user is logged in
        if (isHydrated && loggedInEmployee?.id) {
            const { hydrate, subscribeToRealtime } = useNotificationStore.getState();

            logger.info('Loading notifications for user:', loggedInEmployee.id);

            // Load notifications from Supabase - SELALU load setiap user login (bukan cuma sekali)
            hydrate(loggedInEmployee.id).then(() => {
                logger.info('Notifications loaded from Supabase');
            }).catch(error => {
                logger.error('Error loading notifications:', error);
            });

            // Subscribe to realtime notifications
            const unsubscribe = subscribeToRealtime(loggedInEmployee.id);

            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }
    }, [isHydrated, loggedInEmployee?.id]);

    // --- Handle Assignment Letter Modal from Custom Events ---
    useEffect(() => {
        const handleOpenAssignmentLetter = (event: CustomEvent) => {
            logger.info('Open assignment letter event received:', event.detail);
            const { link } = event.detail;
            const params = link.params;

            if (!loggedInEmployee || !params) {
                logger.error('Missing employee or params for assignment letter');
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

            logger.info('Assignment letter modal opened');
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

                // Normalize target IDs (handle camelCase and snake_case)
                const targetIds = a.targetHospitalIds || (a as any).target_hospital_ids || [];

                // Alliansi scope
                if (a.scope === 'alliansi') {
                    // Global (no targets) - everyone can see
                    if (targetIds.length === 0) return true;

                    // Targeted
                    if (targetIds.length > 0) {
                        const isAdmin = loggedInEmployee.role === 'super-admin' || loggedInEmployee.role === 'admin';
                        if (isAdmin) return true;

                        const userHospitalId = loggedInEmployee.hospitalId || (loggedInEmployee as any).hospital_id;
                        if (!userHospitalId) return false;

                        return targetIds.some((id: any) => String(id).toLowerCase() === String(userHospitalId).toLowerCase());
                    }
                }

                // Mentor scope - mentors and their mentees can see
                if (a.scope === 'mentor') {
                    const isAdmin = loggedInEmployee.role === 'super-admin' || loggedInEmployee.role === 'admin';
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
    // 🔥 FIX: Extract role to a stable variable to prevent unnecessary recalculations
    const userRole = loggedInEmployee?.role;
    const userId = loggedInEmployee?.id;
    const isAdmin = useMemo(() => isAnyAdmin(loggedInEmployee), [userRole]); // Only depend on role

    const filteredNavItems = useMemo(() => {
        if (!loggedInEmployee) return [];

        // Check if user has any management/assignment role (Mentor, SPV, KaUnit, Dirut, or Admin)
        const hasManagementRole =
            isAdmin ||
            loggedInEmployee.canBeMentor ||
            loggedInEmployee.canBeSupervisor ||
            loggedInEmployee.canBeKaUnit ||
            loggedInEmployee.canBeDirut;

        return allNavItemsRaw.filter(item => {
            // Hide Admin menu for non-admins
            if (item.id === 'admin' && !isAdmin) return false;

            // Hide 'Jadwal & Sesi' for basic users without special assignments/roles
            if (item.id === 'jadwal-sesi' && !hasManagementRole) return false;

            // 🔥 Panel Supervisi (Universal): Untuk Mentor, Supervisor, Manager, KaUnit (atau Admin)
            if (item.id === 'panel-mentor') {
                const canAccess = isAdmin ||
                    loggedInEmployee.canBeMentor ||
                    loggedInEmployee.canBeSupervisor ||
                    loggedInEmployee.canBeManager ||
                    loggedInEmployee.canBeKaUnit;
                return canAccess;
            }

            return true;
        });
    }, [userId, userRole, isAdmin, loggedInEmployee?.canBeMentor, loggedInEmployee?.canBeSupervisor, loggedInEmployee?.canBeKaUnit, loggedInEmployee?.canBeDirut, loggedInEmployee?.canBeManager]); // 🔥 CRITICAL FIX: Add all assignment flags to deps

    // 🔥 DEBUG: Log when filtered nav items change
    React.useEffect(() => {
        console.log('🔍 [MainLayoutShell] Filtered nav items updated:', {
            employeeId: loggedInEmployee?.id,
            role: loggedInEmployee?.role,
            isAdmin: isAdmin,
            navItemCount: filteredNavItems.length,
            hasAdminMenu: filteredNavItems.some(item => item.id === 'admin')
        });
    }, [filteredNavItems, userId, userRole, isAdmin]);

    const activeTitle = useMemo(() =>
        allNavItemsRaw.find(item => pathname?.startsWith(item.href))?.label || 'Dashboard',
        [pathname]
    );

    // --- Check if current month is activated for Mutaba'ah ---
    const activationStatus = useMemo(() => {
        // 🔥 CRITICAL FIX: Check both for null/undefined AND invalid employee objects
        if (!loggedInEmployee || !loggedInEmployee.id) {
            // Only log if we are hydrated and not logging out to reduce noise during initial mount
            if (isHydrated && !isLoggingOut) {
                console.log('⚠️ [MainLayoutShell] No valid employee, hiding activation prompt');
            }
            return {
                isActivated: true,
                shouldShowActivationRequired: false,
                currentMonthName: '',
                currentMonthKey: ''
            }; // Default to true if no valid employee
        }

        // 🔥 FIX: Admin dan super-admin JUGA karyawan yang perlu mengaktifkan bulan
        // Tidak ada bypass - semua user diperlakukan sama
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        // Don't block on the aktivitas-bulanan page itself (user can still see the activation UI there)
        const isOnAktivitasBulananPage = pathname?.startsWith('/aktivitas-bulanan');

        if (isMutabaahLoading) {
            return {
                isLoading: true,
                isActivated: true, // Placeholder
                shouldShowActivationRequired: false,
                currentMonthName: now.toLocaleDateString('id-ID', { month: 'long' }) || '',
                currentMonthKey: currentMonthKey || ''
            };
        }

        const status = {
            isLoading: false,
            isActivated: isCurrentMonthActivated,
            shouldShowActivationRequired: !isCurrentMonthActivated && !isOnAktivitasBulananPage,
            currentMonthName: now.toLocaleDateString('id-ID', { month: 'long' }) || '',
            currentMonthKey: currentMonthKey || ''
        };


        // 🔥 DEBUG: Log activation status changes
        console.log('🔍 [MainLayoutShell] Activation status:', {
            employeeId: loggedInEmployee.id,
            isCurrentMonthActivated,
            shouldShow: status.shouldShowActivationRequired,
            isLoading: isMutabaahLoading
        });

        return status;
    }, [loggedInEmployee?.id, pathname, isCurrentMonthActivated, isMutabaahLoading, loggedInEmployee?.role]); // 🔥 CRITICAL FIX: Add role to dependencies for admin check

    // ⚡ OPTIMIZATION: Direct logout without router.push - logoutEmployee already redirects
    const handleLogout = useCallback(() => {
        setShowLogoutConfirm(true);
    }, []);

    const confirmLogout = useCallback(() => {
        setShowLogoutConfirm(false);
        logoutEmployee();
    }, [logoutEmployee]);

    const handleToggleNotifications = useCallback(() => {
        setIsNotificationPanelOpen(true);
    }, [setIsNotificationPanelOpen]);

    const handleCloseNotifications = useCallback(() => {
        setIsNotificationPanelOpen(false);
    }, [setIsNotificationPanelOpen]);

    const handleNotificationNavigate = useCallback((link: Notification['linkTo'] | string) => {
        if (link) {
            setIsNotificationPanelOpen(false);

            // Handle string link (legacy or direct path)
            if (typeof link === 'string') {
                router.push(link);
                return;
            }

            // Special handling for assignment_letter - dispatch custom event
            if (link.view === 'assignment_letter') {
                window.dispatchEvent(new CustomEvent('open-assignment-letter', {
                    detail: { link }
                }));
                return;
            }

            // Build the URL based on the link structure
            let viewPath = link.view as string;

            // 🔥 FIX: Map legacy 'dashboard-saya' to '/dashboard'
            if (viewPath === 'dashboard-saya') {
                viewPath = 'dashboard';
            }

            const basePath = `/${viewPath}`;

            let queryString = link.params
                ? '?' + new URLSearchParams(
                    Object.entries(link.params).map(([key, value]) => [key, String(value)])
                ).toString()
                : '';

            // 🔥 FIX: Dashboard doesn't support path-based tabs (e.g. /dashboard/panel-mentor is 404)
            // Convert tab to query param if view is dashboard
            let tabSuffix = link.tab ? `/${link.tab}` : '';

            if (viewPath === 'dashboard' && link.tab) {
                tabSuffix = ''; // Remove from path
                // Add to query params if not exists
                if (!queryString) {
                    queryString = `?tab=${link.tab}`;
                } else {
                    queryString += `&tab=${link.tab}`;
                }
            }

            const fullPath = `${basePath}${tabSuffix}${queryString}`;

            router.push(fullPath);
        }
    }, [router, setIsNotificationPanelOpen]);

    // --- Handle Assignment Letter from Notification Click ---
    const handleOpenAssignmentLetter = useCallback((notification: Notification) => {
        logger.info('Assignment letter notification clicked:', notification);

        // Safety check if linkTo is string or undefined
        if (!notification.linkTo || typeof notification.linkTo === 'string') {
            return;
        }

        const params = notification.linkTo.params;

        if (!loggedInEmployee || !params) {
            logger.error('Missing employee or params for assignment letter');
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

        logger.info('Assignment letter modal opened from notification');
    }, [loggedInEmployee, setIsNotificationPanelOpen]);

    const handleToggleMenu = useCallback(() => {
        setIsMenuOpen(!isMenuOpen);
    }, [isMenuOpen, setIsMenuOpen]);

    // 🔥 FIX: Single source of truth for loading employee data
    useEffect(() => {
        // Only load if we haven't loaded yet and haven't started hydration
        if (!loggedInEmployee && !isHydrated) {
            logger.info('MainLayoutShell: Loading employee data...');
            loadLoggedInEmployee();
        }
    }, []); // Run ONCE on mount only

    // 🔥 HYDRATION FIX: Track client-side state to prevent SSR mismatches
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // 🔥 Save last visited page to localStorage for post-login redirect
    useEffect(() => {
        if (typeof window !== 'undefined' && pathname && loggedInEmployee) {
            // Don't save login page
            if (pathname !== '/login' && pathname !== '/register') {
                localStorage.setItem('lastVisitedPage', pathname);
            }
        }
    }, [pathname, loggedInEmployee]);

    // 🔥 FIX: Show skeleton loader that matches app layout instead of spinner
    // 🔥 UNIFIED LOADING SYSTEM: 
    // Instead of showing local loaders, we update the GlobalLoadingOverlay
    // This ensures a single, stable logo throughout the entire process.
    useEffect(() => {
        if (isLoggingOut) {
            setGlobalLoading(true, "Sedang keluar...");
            return;
        }

        // --- PHASE 1: Initial Hydration & Session Recovery ---
        if (!isClient || !isHydrated) {
            setGlobalLoading(true, "Menyiapkan Sesi...");
            return;
        }

        // --- PHASE 2: Check Logged In Status ---
        if (!loggedInEmployee) {
            // No employee? This means we are likely on /login or still loading.
            // But we don't want to block EVERYTHING if we're not logged in, 
            // the layout logic will handle it.
            return;
        }

        // --- PHASE 3: Activation Check (Optimized) ---
        // We only show a BLOCKING loading message if:
        // 1. We don't know the activation status yet (isLoading is true)
        // 2. AND we haven't confirmed it's activated (isCurrentMonthActivated is false)
        if (isMutabaahLoading && !isCurrentMonthActivated) {
            setGlobalLoading(true, "Mengecek status aktifasi...");
            return;
        }

        // If we reach here, we are either:
        // - Ready to show the app
        // - Or performing a background update (which should NOT show a blocking overlay)

        const ourMessages = ["Menyiapkan Sesi...", "Mengecek status aktifasi...", "Memproses login..."];
        if (globalLoading.show && ourMessages.includes(globalLoading.message)) {
            // Tiny buffer for visual stability
            const timer = setTimeout(() => {
                setGlobalLoading(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isLoggingOut, isClient, isHydrated, loggedInEmployee, isMutabaahLoading, isCurrentMonthActivated, setGlobalLoading, globalLoading.show, globalLoading.message]);

    // Render logic: while loading, we hide everything to let GlobalLoadingOverlay do its work
    // 🔥 OPTIMIZATION: If we already have a loggedInEmployee and we are activated, we do NOT block the UI
    // even if Mutabaah is doing a background refresh.
    const isActuallyLoading = isLoggingOut || !isClient || !isHydrated || (!loggedInEmployee && isHydrated && pathname !== '/login') || (isMutabaahLoading && !isCurrentMonthActivated);

    if (isActuallyLoading) {
        return null; // The RootLayout's GlobalLoadingOverlay is already showing
    }



    return (
        <div className="min-h-screen bg-transparent text-white flex flex-col lg:flex-row relative">
            <Navigation
                navItems={filteredNavItems}
                isOpen={isMenuOpen}
                setIsOpen={setIsMenuOpen}
                unreadAnnouncementsCount={deferredUnreadAnnouncements}
                onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-transparent">
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
                        {/* 🚀 OPTIMIZED: Using Suspense here ensures sidebar/navbar STAY visible during page transitions */}
                        <Suspense fallback={
                            <div className="flex items-center justify-center min-h-[60vh] w-full">
                                <BrandedLoader fullScreen={false} message="Memuat konten..." />
                            </div>
                        }>

                            {/* Page content */}
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

                        </Suspense>
                    </ErrorBoundary>
                </main>
                <Footer />
            </div>

            {/* Toasts - kept globally here if not using a Provider */}
            <div className="fixed top-20 right-4 z-100 space-y-3 w-full max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden animate-toast-in flex border border-slate-700"
                    >
                        <div className={`w-1.5 shrink-0 ${toast.type === 'success' ? 'bg-teal-400' : 'bg-red-500'}`}></div>
                        <div className="flex items-start gap-4 p-4">
                            <div className="grow">
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

            {/* Logout Confirmation */}
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
                title="Keluar Aplikasi"
                message="Apakah Anda yakin ingin keluar dari aplikasi APPI?"
                confirmText="Ya, Keluar"
                confirmColorClass="bg-red-500 hover:bg-red-600"
            />

        </div>
    );
}
