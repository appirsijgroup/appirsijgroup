import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Notification } from '../types';
import { BellIcon, CheckIcon, XIcon, CalendarDaysIcon, MegaphoneIcon, ShieldCheckIcon, ClockIcon, PencilIcon, TrashIcon } from './Icons';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (link: Notification['linkTo']) => void;
    onOpenAssignmentLetter?: (notification: Notification) => void;
    loggedInUserId: string;
}

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const iconMap: Record<Notification['type'], React.ReactNode> = {
        // Laporan Mutaba'ah
        'monthly_report_submitted': <ShieldCheckIcon className="w-5 h-5 text-yellow-300" />,
        'monthly_report_needs_review': <ShieldCheckIcon className="w-5 h-5 text-yellow-300" />,
        'monthly_report_approved': <CheckIcon className="w-5 h-5 text-green-300" />,
        'monthly_report_rejected': <XIcon className="w-5 h-5 text-red-300" />,

        // Pengajuan Presensi Terlewat
        'missed_prayer_request': <ShieldCheckIcon className="w-5 h-5 text-yellow-300" />,
        'missed_prayer_approved': <CheckIcon className="w-5 h-5 text-green-300" />,
        'missed_prayer_rejected': <XIcon className="w-5 h-5 text-red-300" />,
        
        // Pengajuan Tadarus Manual
        'tadarus_request': <ShieldCheckIcon className="w-5 h-5 text-yellow-300" />,
        'tadarus_approved': <CheckIcon className="w-5 h-5 text-green-300" />,
        'tadarus_rejected': <XIcon className="w-5 h-5 text-red-300" />,

        // Penjadwalan
        'new_activity_schedule': <CalendarDaysIcon className="w-5 h-5 text-blue-300" />,
        'new_tadarus_session_schedule': <CalendarDaysIcon className="w-5 h-5 text-blue-300" />,

        // Pengumuman
        'mentor_announcement': <MegaphoneIcon className="w-5 h-5 text-purple-300" />,
        'global_announcement': <MegaphoneIcon className="w-5 h-5 text-teal-300" />,
        
        // Perubahan Akun
        'account_role_changed': <ShieldCheckIcon className="w-5 h-5 text-indigo-300" />,
        
        // Pengingat sholat terlewat
        'missed_prayer_reminder': <ClockIcon className="w-5 h-5 text-orange-300" />,
    };
    return <div className="p-3 bg-black/20 rounded-full">{iconMap[type]}</div>;
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onNavigate, onOpenAssignmentLetter, loggedInUserId }) => {
    const { 
        notifications: allNotifications, 
        clearAll, 
        markAsRead, 
        markAllAsRead,
        dismissNotification,
        deleteNotifications
    } = useNotificationStore();

    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const notifications = useMemo(() => {
        const now = Date.now();
        const filtered = allNotifications
            .filter(n => n.userId === loggedInUserId)
            .filter(n => !(n.expiresAt && now > n.expiresAt));

        console.log('📬 NotificationPanel filtered notifications:', {
            loggedInUserId,
            totalAll: allNotifications.length,
            totalFiltered: filtered.length,
            allUserNotifications: allNotifications.filter(n => n.userId === loggedInUserId).map(n => ({ id: n.id, type: n.type, title: n.title })),
            filteredNotifications: filtered.map(n => ({ id: n.id, type: n.type, title: n.title }))
        });

        return filtered;
    }, [allNotifications, loggedInUserId]);

    const handleEnterManageMode = () => {
        setSelectedIds(new Set());
        setIsManageMode(true);
    };

    const handleCancelManageMode = () => {
        setIsManageMode(false);
        setSelectedIds(new Set());
    };

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDeleteSelected = () => {
        if (selectedIds.size > 0) {
            deleteNotifications(Array.from(selectedIds));
        }
        handleCancelManageMode(); // Reset UI
    };
    
    const handleItemClick = (notification: Notification) => {
        console.log('🔔 Notification clicked:', notification.id, notification.title);

        if (notification.dismissOnClick) {
            console.log('🗑️ Dismissing notification:', notification.id);
            dismissNotification(notification.id);
        } else if (!notification.isRead) {
            console.log('📖 Marking as read:', notification.id);
            // 🔥 FIX: Use await to ensure markAsRead completes before navigation
            markAsRead(notification.id).then(() => {
                console.log('✅ Mark as read completed for:', notification.id);
            }).catch((error) => {
                console.error('❌ Failed to mark as read:', error);
            });
        }

        if (notification.linkTo) {
            // Check if this is an assignment letter notification
            if (notification.linkTo.view === 'assignment_letter' && onOpenAssignmentLetter) {
                onOpenAssignmentLetter(notification);
            } else {
                onNavigate(notification.linkTo);
            }
        }
    };

    const handleClearAll = () => {
        clearAll(loggedInUserId);
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead(loggedInUserId);
    };

    const hasUnread = notifications.some(n => !n.isRead);

    if (!isOpen) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>
            <aside 
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900/80 backdrop-blur-lg border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                aria-modal="true"
                role="dialog"
                aria-labelledby="notification-panel-title"
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    {isManageMode ? (
                        <div className="flex items-center justify-between w-full">
                            <label className="flex items-center gap-2 text-sm text-white font-semibold">
                                <input 
                                    type="checkbox"
                                    checked={selectedIds.size === notifications.length && notifications.length > 0}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                                />
                                Pilih Semua
                            </label>
                            <button onClick={handleCancelManageMode} className="px-4 py-1.5 rounded-full bg-gray-600 hover:bg-gray-500 text-sm font-semibold">
                                Selesai
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 id="notification-panel-title" className="text-lg font-bold text-white flex items-center gap-2">
                                <BellIcon className="w-6 h-6 text-teal-300" />
                                Notifikasi
                            </h2>
                             <div className="flex items-center gap-1">
                                {notifications.length > 0 && (
                                    <button onClick={handleEnterManageMode} className="p-2 text-teal-400 rounded-full hover:bg-teal-500/20" title="Kelola Notifikasi">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 -mr-2 text-teal-400 rounded-full hover:bg-teal-500/20 transition-colors" aria-label="Tutup notifikasi">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </>
                    )}
                </header>
                <div className="flex-grow overflow-y-auto">
                    {notifications.length > 0 ? (
                        <ul>
                            {notifications.map(notif => (
                                <li key={notif.id} className={`border-b border-white/10 last:border-b-0 transition-colors ${isManageMode && selectedIds.has(notif.id) ? 'bg-teal-500/20' : ''}`}>
                                     {isManageMode ? (
                                        <label className="w-full text-left p-4 flex items-start gap-4 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={selectedIds.has(notif.id)}
                                                onChange={() => handleToggleSelection(notif.id)}
                                                className="w-5 h-5 rounded mt-3 bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                                            />
                                            <NotificationIcon type={notif.type} />
                                            <div className="flex-grow">
                                                <p className="font-semibold text-white">{notif.title}</p>
                                                <p className="text-sm text-blue-200">{notif.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </label>
                                    ) : (
                                        <button
                                            onClick={() => handleItemClick(notif)}
                                            className={`w-full text-left p-4 flex items-start gap-4 transition-colors ${!notif.isRead ? 'bg-teal-500/10' : ''} ${notif.linkTo ? 'hover:bg-white/10' : 'cursor-default'}`}
                                        >
                                            {!notif.isRead && (
                                                <div className="w-2.5 h-2.5 bg-teal-400 rounded-full flex-shrink-0 mt-1.5 animate-pulse"></div>
                                            )}
                                            <NotificationIcon type={notif.type} />
                                            <div className={`flex-grow ${notif.isRead ? 'pl-5' : ''}`}>
                                                <p className={`font-semibold ${!notif.isRead ? 'text-white' : 'text-gray-300'}`}>{notif.title}</p>
                                                <p className={`text-sm ${!notif.isRead ? 'text-blue-200' : 'text-gray-400'}`}>{notif.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
                            <BellIcon className="w-12 h-12 mb-4" />
                            <p className="font-semibold">Tidak ada notifikasi baru.</p>
                            <p className="text-sm">Semua informasi Anda sudah yang terbaru.</p>
                        </div>
                    )}
                </div>
                {notifications.length > 0 && (
                    <footer className="p-2 border-t border-white/10 flex-shrink-0">
                         {isManageMode ? (
                            <div className="p-2">
                                <button 
                                    onClick={handleDeleteSelected} 
                                    disabled={selectedIds.size === 0}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                    Hapus ({selectedIds.size}) Notifikasi
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                 <button onClick={handleMarkAllAsRead} disabled={!hasUnread} className="text-xs text-blue-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1">
                                    Tandai semua dibaca
                                </button>
                                <button onClick={handleClearAll} className="text-xs text-red-400 hover:underline px-2 py-1">
                                    Bersihkan Semua
                                </button>
                            </div>
                        )}
                    </footer>
                )}
            </aside>
        </>,
        document.body
    );
};

export default NotificationPanel;