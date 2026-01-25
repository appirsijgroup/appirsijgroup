import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types';
import {
    createNotificationSupabase,
    getUserNotifications,
    markNotificationAsRead as markNotificationAsReadSupabase,
    markAllNotificationsAsRead as markAllAsReadSupabase,
    deleteNotificationsSupabase,
    clearAllNotificationsSupabase,
    subscribeToUserNotifications
} from '@/services/notificationService';

interface NotificationState {
    notifications: Notification[];
    isHydrated: boolean;
    hydrate: (userId: string) => Promise<void>;
    createNotification: (data: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: (userId: string) => Promise<void>;
    clearAll: (userId: string) => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
    deleteNotifications: (notificationIds: string[]) => Promise<void>;
    subscribeToRealtime: (userId: string) => (() => void);
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            isHydrated: false,

            // 🔥 Load notifications from Supabase on mount
            hydrate: async (userId: string) => {
                try {

                    const supabaseNotifications = await getUserNotifications(userId);


                    const unreadCount = supabaseNotifications.filter(n => !n.isRead).length;

                    // REPLACE notifications dengan dari Supabase (source of truth)
                    set({
                        notifications: supabaseNotifications,
                        isHydrated: true
                    });

                } catch (error) {
                    set({ isHydrated: true });
                }
            },

            // 🔥 Create notification and sync to Supabase
            createNotification: async (data) => {
                // Use temporary ID for optimistic update
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                const newNotification: Notification = {
                    ...data,
                    id: tempId,
                    timestamp: Date.now(),
                    isRead: false,
                };

                // Optimistic update to local state (selalu tampil dulu di UI)
                set((state) => {
                    const updated = { notifications: [newNotification, ...state.notifications] };
                    return updated;
                });

                // Sync to Supabase
                try {
                    // Update local notification with REAL ID from DB
                    const savedNotification = await createNotificationSupabase(newNotification);

                    set((state) => ({
                        notifications: state.notifications.map(n =>
                            n.id === tempId ? { ...savedNotification } : n
                        )
                    }));
                } catch (error) {
                    console.error('❌ [notificationStore] Failed to sync new notification to Supabase:', error);
                }
            },

            markAsRead: async (notificationId) => {

                // Get notification untuk mengambil userId
                const notification = get().notifications.find(n => n.id === notificationId);

                if (!notification) {
                    return;
                }


                // Update local state first (optimistic update)
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    );
                    return { notifications: updated };
                });

                // Sync to Supabase dengan userId parameter
                try {
                    await markNotificationAsReadSupabase(notificationId, notification.userId);  // 🔥 Kirim userId
                } catch (error) {
                    // Silent fail - keep local state as read
                }
            },

            markAllAsRead: async (userId) => {

                // Update local state first (optimistic update)
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.userId === userId ? { ...n, isRead: true } : n
                    );
                    return { notifications: updated };
                });

                // Sync to Supabase
                try {
                    await markAllAsReadSupabase(userId);
                } catch (error) {
                }
            },

            clearAll: async (userId) => {

                // Update local state first (optimistic update)
                set((state) => {
                    const filtered = state.notifications.filter(n => n.userId !== userId);
                    return { notifications: filtered };
                });

                // Sync to Supabase (DELETE all notifications)
                try {
                    await clearAllNotificationsSupabase(userId);
                } catch (error) {
                }
            },

            dismissNotification: async (notificationId) => {
                // Update local state first (optimistic update)
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== notificationId)
                }));

                // Sync to Supabase (DELETE from database so it doesn't come back on refresh)
                try {
                    await deleteNotificationsSupabase([notificationId]);
                } catch (error) {
                    console.error('❌ [notificationStore] Failed to persist dismissal to Supabase:', error);
                }
            },

            deleteNotifications: async (notificationIds) => {

                // Update local state first (optimistic update)
                set((state) => {
                    const filtered = state.notifications.filter(n => !notificationIds.includes(n.id));
                    return { notifications: filtered };
                });

                // Sync to Supabase
                try {
                    await deleteNotificationsSupabase(notificationIds);
                } catch (error) {
                    console.error('❌ [notificationStore] Failed to delete notifications from Supabase:', error);
                }
            },

            subscribeToRealtime: (userId: string) => {
                const channel = subscribeToUserNotifications(userId, (notification) => {
                    set((state) => {
                        // Check if notification already exists
                        const exists = state.notifications.some(n => n.id === notification.id);
                        if (exists) {
                            // Update existing notification
                            return {
                                notifications: state.notifications.map(n =>
                                    n.id === notification.id ? notification : n
                                )
                            };
                        } else {
                            // Add new notification
                            return {
                                notifications: [notification, ...state.notifications]
                            };
                        }
                    });
                });

                return () => {
                    import('@/lib/supabase').then(({ supabase }) => {
                        supabase.removeChannel(channel);
                    });
                };
            },
        }),
        {
            name: 'notifications-storage',
            version: 1, // 🔥 Add version to handle future schema changes
            // 🔥 FIX: JANGAN merge state dari localStorage, Supabase adalah source of truth
            merge: (persistedState, currentState) => {
                try {

                    // Jika currentState sudah di-hydrate dari Supabase, gunakan itu
                    if (currentState.isHydrated) {
                        // Bersihkan localStorage yang mungkin masih ada data notifikasi lama
                        if ((persistedState as any)?.notifications) {
                            localStorage.removeItem('notifications-storage');
                        }
                        return currentState;
                    }

                    // Jika belum hydrated, gunakan dari localStorage sementara (transitional state)
                    return {
                        ...currentState,
                        notifications: (persistedState as any)?.notifications || currentState.notifications
                    };
                } catch (error) {
                    // Return default state on error
                    return currentState;
                }
            },
            // 🔥 FIX: JANGAN persist notifications array ke localStorage
            partialize: (state) => {
                // HANYA simpan isHydrated flag, JANGAN simpan notifications array sama sekali
                // Supabase adalah source of truth untuk notifikasi
                return {
                    isHydrated: state.isHydrated,
                    // JANGAN simpan notifications ke localStorage - ini penting!
                    // Setiap refresh akan load dari Supabase
                };
            },
            // 🔥 FIX: Add migration handler for version changes
            migrate: (persistedState: any, version: number) => {
                // Always return clean state for notifications - Supabase is source of truth
                return {
                    isHydrated: false,
                    notifications: []
                };
            },
        }
    )
);
