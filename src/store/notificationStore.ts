import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types';

interface NotificationState {
    notifications: Notification[];
    createNotification: (data: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: (userId: string) => void;
    clearAll: (userId: string) => void;
    dismissNotification: (notificationId: string) => void;
    deleteNotifications: (notificationIds: string[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            createNotification: (data) => {
                const newNotification: Notification = {
                    ...data,
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    isRead: false,
                };
                set((state) => ({ notifications: [newNotification, ...state.notifications] }));
            },
            markAsRead: (notificationId) => {
                set((state) => ({
                    notifications: state.notifications.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    ),
                }));
            },
            markAllAsRead: (userId) => {
                set((state) => ({
                    notifications: state.notifications.map(n =>
                        n.userId === userId ? { ...n, isRead: true } : n
                    ),
                }));
            },
            clearAll: (userId) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.userId !== userId)
                }));
            },
            dismissNotification: (notificationId) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== notificationId)
                }));
            },
            deleteNotifications: (notificationIds) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => !notificationIds.includes(n.id))
                }));
            },
        }),
        {
            name: 'notifications-storage',
        }
    )
);
