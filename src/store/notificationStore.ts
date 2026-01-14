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
    dismissNotification: (notificationId: string) => void;
    deleteNotifications: (notificationIds: string[]) => Promise<void>;
    subscribeToRealtime: (userId: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            isHydrated: false,

            // 🔥 Load notifications from Supabase on mount
            hydrate: async (userId: string) => {
                try {
                    console.log('🔄 [Hydrate] START - Loading notifications for user:', userId);
                    console.log('📊 [Hydrate] Current state before fetch:', {
                        currentCount: get().notifications.length,
                        currentIsHydrated: get().isHydrated
                    });

                    const supabaseNotifications = await getUserNotifications(userId);

                    console.log('📥 [Hydrate] Supabase returned', supabaseNotifications.length, 'notifications');
                    console.log('📋 [Hydrate] Notifications from Supabase:', supabaseNotifications.map(n => ({
                        id: n.id,
                        title: n.title,
                        isRead: n.isRead,
                        userId: n.userId
                    })));

                    const unreadCount = supabaseNotifications.filter(n => !n.isRead).length;
                    console.log('📬 [Hydrate] Unread notifications:', unreadCount, 'of', supabaseNotifications.length);

                    // REPLACE notifications dengan dari Supabase (source of truth)
                    set({
                        notifications: supabaseNotifications,
                        isHydrated: true
                    });

                    console.log('✅ [Hydrate] COMPLETE - Total notifications:', supabaseNotifications.length, '| Unread:', unreadCount);
                } catch (error) {
                    console.error('❌ [Hydrate] ERROR hydrating notifications:', error);
                    set({ isHydrated: true });
                }
            },

            // 🔥 Create notification and sync to Supabase
            createNotification: async (data) => {
                const newNotification: Notification = {
                    ...data,
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    isRead: false,
                };
                console.log('🔔 notificationStore.createNotification called:', {
                    newNotification,
                    currentCount: 0
                });

                // Optimistic update to local state (selalu tampil dulu di UI)
                set((state) => {
                    const updated = { notifications: [newNotification, ...state.notifications] };
                    console.log('✅ notificationStore updated (local):', {
                        previousCount: state.notifications.length,
                        newCount: updated.notifications.length
                    });
                    return updated;
                });

                // Sync to Supabase (best-effort, tidak akan menghapus notifikasi lokal jika gagal)
                try {
                    await createNotificationSupabase(data);
                    console.log('✅ Notification synced to Supabase successfully');
                } catch (error) {
                    console.error('⚠️ WARNING: Failed to sync notification to Supabase, but notification still available locally:', error);
                    // JANGAN rollback local state - user tetap bisa melihat notifikasi di browser yang sama
                    // Tambahkan flag bahwa ini belum sync ke Supabase
                }
            },

            markAsRead: async (notificationId) => {
                console.log('📖 Marking notification as read:', notificationId);

                // Get notification untuk mengambil userId
                const notification = get().notifications.find(n => n.id === notificationId);

                if (!notification) {
                    console.error('❌ Notification not found in local state:', notificationId);
                    return;
                }

                console.log('👤 Notification userId:', notification.userId);

                // Update local state first (optimistic update)
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    );
                    console.log('✅ Local state updated - isRead set to true for:', notificationId);
                    return { notifications: updated };
                });

                // Sync to Supabase dengan userId parameter
                try {
                    console.log('🔄 Syncing to Supabase with userId...');
                    await markNotificationAsReadSupabase(notificationId, notification.userId);  // 🔥 Kirim userId
                    console.log('✅ Successfully synced to Supabase:', notificationId);
                } catch (error) {
                    console.error('❌ Failed to mark as read in Supabase:', error);
                    console.error('Error details:', error);
                    // Silent fail - keep local state as read
                    console.warn('⚠️ WARNING: Could not sync to Supabase, but keeping as read locally');
                }
            },

            markAllAsRead: async (userId) => {
                console.log('📖 Marking all notifications as read for user:', userId);

                // Update local state first (optimistic update)
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.userId === userId ? { ...n, isRead: true } : n
                    );
                    console.log('✅ Local state updated - all marked as read');
                    return { notifications: updated };
                });

                // Sync to Supabase
                try {
                    console.log('🔄 Syncing all to Supabase...');
                    await markAllAsReadSupabase(userId);
                    console.log('✅ Successfully synced all to Supabase');
                } catch (error) {
                    console.error('❌ Failed to mark all as read in Supabase:', error);
                    console.warn('⚠️ WARNING: Could not sync to Supabase, but keeping as read locally');
                }
            },

            clearAll: async (userId) => {
                console.log('🗑️ Clearing all notifications for user:', userId);

                // Update local state first (optimistic update)
                set((state) => {
                    const filtered = state.notifications.filter(n => n.userId !== userId);
                    console.log('✅ Local state updated - notifications cleared');
                    return { notifications: filtered };
                });

                // Sync to Supabase (DELETE all notifications)
                try {
                    console.log('🔄 Deleting all from Supabase...');
                    await clearAllNotificationsSupabase(userId);
                    console.log('✅ Successfully deleted all from Supabase');
                } catch (error) {
                    console.error('❌ Failed to clear all in Supabase:', error);
                    console.warn('⚠️ WARNING: Notifications only cleared locally. They will reappear after refresh.');
                }
            },

            dismissNotification: (notificationId) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== notificationId)
                }));
            },

            deleteNotifications: async (notificationIds) => {
                console.log('🗑️ Deleting notifications:', notificationIds);

                // Update local state first (optimistic update)
                set((state) => {
                    const filtered = state.notifications.filter(n => !notificationIds.includes(n.id));
                    console.log('✅ Local state updated - notifications deleted');
                    return { notifications: filtered };
                });

                // Sync to Supabase
                try {
                    console.log('🔄 Deleting from Supabase...');
                    await deleteNotificationsSupabase(notificationIds);
                    console.log('✅ Successfully deleted from Supabase');
                } catch (error) {
                    console.error('❌ Failed to delete in Supabase:', error);
                    console.warn('⚠️ WARNING: Notifications only deleted locally. They will reappear after refresh.');
                }
            },

            subscribeToRealtime: (userId: string) => {
                subscribeToUserNotifications(userId, (notification) => {
                    console.log('🔔 Realtime notification received:', notification);
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
            },
        }),
        {
            name: 'notifications-storage',
            // 🔥 FIX: JANGAN merge state dari localStorage, Supabase adalah source of truth
            merge: (persistedState, currentState) => {
                console.log('🔄 [Persist Merge] Called:', {
                    persistedIsHydrated: (persistedState as any)?.isHydrated,
                    currentIsHydrated: currentState.isHydrated,
                    persistedNotificationsCount: (persistedState as any)?.notifications?.length || 0,
                    currentNotificationsCount: currentState.notifications?.length || 0
                });

                // Jika currentState sudah di-hydrate dari Supabase, gunakan itu
                if (currentState.isHydrated) {
                    console.log('✅ [Persist Merge] Using hydrated state from Supabase, ignoring localStorage notifications');
                    // Bersihkan localStorage yang mungkin masih ada data notifikasi lama
                    if ((persistedState as any)?.notifications) {
                        console.log('🧹 [Persist Merge] Cleaning up old notifications from localStorage');
                        localStorage.removeItem('notifications-storage');
                    }
                    return currentState;
                }

                // Jika belum hydrated, gunakan dari localStorage sementara (transitional state)
                console.log('⚠️ [Persist Merge] Using localStorage state (not yet hydrated from Supabase)');
                return {
                    ...currentState,
                    notifications: (persistedState as any)?.notifications || currentState.notifications
                };
            },
            // 🔥 FIX: JANGAN persist notifications array ke localStorage
            partialize: (state) => {
                // HANYA simpan isHydrated flag, JANGAN simpan notifications array sama sekali
                // Supabase adalah source of truth untuk notifikasi
                console.log('💾 [Persist Partialize] Saving to localStorage:', {
                    isHydrated: state.isHydrated,
                    notificationsCount: state.notifications?.length || 0
                });
                return {
                    isHydrated: state.isHydrated,
                    // JANGAN simpan notifications ke localStorage - ini penting!
                    // Setiap refresh akan load dari Supabase
                };
            },
        }
    )
);
