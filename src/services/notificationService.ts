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
 * Mark notification as read in Supabase - USING RPC FUNCTION
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {

    // 🔥 FIX: Use RPC function with user_id parameter
    // (karena auth.uid() tidak bekerja reliable)
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('mark_notification_read_v2', {
            p_notification_id: notificationId,
            p_user_id: userId  // 🔥 Kirim user_id dari frontend
        });


    if (rpcError) {

        throw new Error(
            `Failed to mark notification as read: ${rpcError.message}\n\n` +
            `Solusi: Jalankan script diagnose-and-fix-user-id.sql di Supabase SQL Editor`
        );
    }

    if (!rpcData) {
        throw new Error('RPC function succeeded but returned no data');
    }

    // Parse JSON result
    const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;

    if (!result.success) {

        throw new Error(
            `Failed to mark notification as read: ${result.message}\n` +
            `Notification ID: ${result.notification_id}\n` +
            `User ID: ${result.user_id}\n` +
            `Rows Affected: ${result.rows_affected}`
        );
    }

}

/**
 * Mark all notifications for a user as read in Supabase
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        throw error;
    }
}

/**
 * Delete notifications in Supabase
 */
export async function deleteNotificationsSupabase(notificationIds: string[]): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

    if (error) {
        throw error;
    }
}

/**
 * Clear all notifications for a user in Supabase
 */
export async function clearAllNotificationsSupabase(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

    if (error) {
        throw error;
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