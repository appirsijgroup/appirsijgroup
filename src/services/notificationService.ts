import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

// Type definition for notifications table (temporary, until we generate proper types)
interface NotificationsRow {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    timestamp: number;
    is_read: boolean;
    related_entity_id?: string;
    link_to?: any;
    expires_at?: number;
    dismiss_on_click?: boolean;
}

/**
 * Create a new notification in Supabase
 */
/**
 * Create a new notification in Supabase
 */
export async function createNotificationSupabase(notification: Notification): Promise<Notification> {
    // Map to database column names (snake_case)
    // NOTE: We do NOT send 'id' so Supabase generates a valid UUID
    const dbNotification = {
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        is_read: notification.isRead,
        related_entity_id: notification.relatedEntityId,
        link_to: notification.linkTo,
        expires_at: notification.expiresAt,
        dismiss_on_click: notification.dismissOnClick,
    };

    // Store in Supabase
    const { data, error } = await supabase
        .from('notifications')
        .insert(dbNotification as any)
        .select()
        .single();

    if (error) {
        // Throw error so caller knows it failed
        throw new Error(`Failed to create notification: ${error.message}`);
    }

    const result = data as any;

    // Return the ACTUAL created notification (with DB-generated ID)
    return {
        id: result.id,
        userId: result.user_id,
        type: result.type,
        title: result.title,
        message: result.message,
        timestamp: result.timestamp,
        isRead: result.is_read,
        relatedEntityId: result.related_entity_id,
        linkTo: result.link_to,
        expiresAt: result.expires_at,
        dismissOnClick: result.dismiss_on_click,
    };
}

/**
 * Get all notifications for a specific user from Supabase
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    if (error) {
        return [];
    }


    // Map from DB format (snake_case) to App format (camelCase)
    const mapped = (data || []).map((row: any) => {
        const notification = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            timestamp: row.timestamp,
            isRead: row.is_read,
            relatedEntityId: row.related_entity_id || undefined,
            linkTo: row.link_to || undefined,
            expiresAt: row.expires_at || undefined,
            dismissOnClick: row.dismiss_on_click || false,
        };
        return notification;
    });

    return mapped;
}

/**
 * Mark notification as read in Supabase
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
        // First try via API route (bypasses RLS)
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notificationId, userId })
        });

        if (response.ok) return;

        // Fallback to RPC if API fails
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('mark_notification_read_v2', {
                p_notification_id: notificationId,
                p_user_id: userId
            });

        if (rpcError) throw rpcError;
    } catch (err: any) {
        console.error('❌ [markNotificationAsRead] Error:', err);
        throw err;
    }
}

/**
 * Mark all notifications for a user as read in Supabase
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', userId })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to mark all notifications as read');
    }
}

/**
 * Delete notifications in Supabase
 */
export async function deleteNotificationsSupabase(notificationIds: string[]): Promise<void> {
    const response = await fetch(`/api/notifications?ids=${encodeURIComponent(notificationIds.join(','))}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete notifications');
    }
}

/**
 * Clear all notifications for a user in Supabase
 */
export async function clearAllNotificationsSupabase(userId: string): Promise<void> {
    const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to clear notifications');
    }
}

/**
 * Subscribe to notifications for a user (realtime)
 */
export function subscribeToUserNotifications(
    userId: string,
    callback: (notification: Notification) => void
) {
    const channel = supabase
        .channel('notifications-changes')
        // 🔥 FIX: Listen to INSERT events (new notifications)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`, // Use correct DB column name (snake_case)
            },
            (payload) => {
                // Map from DB format to App format
                const notification = {
                    id: payload.new.id,
                    userId: payload.new.user_id,
                    type: payload.new.type,
                    title: payload.new.title,
                    message: payload.new.message,
                    timestamp: payload.new.timestamp,
                    isRead: payload.new.is_read,
                    relatedEntityId: payload.new.related_entity_id,
                    linkTo: payload.new.link_to,
                    expiresAt: payload.new.expires_at,
                    dismissOnClick: payload.new.dismiss_on_click,
                };
                callback(notification as Notification);
            }
        )
        // 🔥 FIX: Listen to UPDATE events (mark as read, delete, etc.)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                // Map from DB format to App format
                const notification = {
                    id: payload.new.id,
                    userId: payload.new.user_id,
                    type: payload.new.type,
                    title: payload.new.title,
                    message: payload.new.message,
                    timestamp: payload.new.timestamp,
                    isRead: payload.new.is_read,
                    relatedEntityId: payload.new.related_entity_id,
                    linkTo: payload.new.link_to,
                    expiresAt: payload.new.expires_at,
                    dismissOnClick: payload.new.dismiss_on_click,
                };
                callback(notification as Notification);
            }
        )
        .subscribe((status) => {
        });

    return channel;
}