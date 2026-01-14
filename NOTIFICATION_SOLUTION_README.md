# 🔧 PERBAIKAN NOTIFICATION - CARA CEPAT

## ⚠️ MASALAH
Kode frontend BELUM di-update dengan solusi RPC function. Masih pakai direct UPDATE yang tidak bekerja.

## ✅ SOLUSI CEPAT (Hanya 2 File)

### File 1: notificationService.ts

**Location:** `src/services/notificationService.ts`

**Action:** REPLACE seluruh isi file dengan kode di bawah

---

```typescript
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
export async function createNotificationSupabase(data: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> {
    const notification: Notification = {
        ...data,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        isRead: false,
    };

    // Map to database column names (snake_case)
    const dbNotification = {
        id: notification.id,
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
    console.log('📤 Attempting to insert notification to Supabase:', dbNotification);
    const { data: result, error } = await supabase
        .from('notifications')
        .insert(dbNotification)
        .select()
        .single();

    if (error) {
        console.error('❌ Supabase insert error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        // Throw error so caller knows it failed
        throw new Error(`Failed to create notification: ${error.message}`);
    }

    console.log('✅ Notification created in Supabase:', result);
    return notification; // Return local notification, not DB result
}

/**
 * Get all notifications for a specific user from Supabase
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
    console.log('🔍 Fetching notifications from Supabase for userId:', userId);

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('❌ Error fetching notifications from Supabase:', error);
        console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        return [];
    }

    console.log('✅ Supabase returned', data?.length || 0, 'notifications');

    // Map from DB format (snake_case) to App format (camelCase)
    const mapped = (data || []).map((row: any) => {
        const notification = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            timestamp: row.timestamp,
            isRead: row.is_read, // 🔥 CRITICAL: This should reflect the DB state
            relatedEntityId: row.related_entity_id,
            linkTo: row.link_to,
            expiresAt: row.expires_at,
            dismissOnClick: row.dismiss_on_click,
        };
        console.log('  📋 Mapped notification:', {
            id: notification.id,
            title: notification.title,
            isRead: notification.isRead,
            is_read_from_db: row.is_read
        });
        return notification;
    });

    const unreadCount = mapped.filter(n => !n.isRead).length;
    console.log(`✅ Total mapped notifications: ${mapped.length} (${unreadCount} unread)`);

    return mapped;
}

/**
 * Mark notification as read in Supabase - USING RPC FUNCTION
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    console.log('📤 Supabase: Marking notification as read:', notificationId);
    console.log('👤 User ID:', userId);
    console.log('📤 Using RPC function with user_id parameter...');

    // 🔥 FIX: Use RPC function with user_id parameter
    // (karena auth.uid() tidak bekerja reliable)
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('mark_notification_read_v2', {
            p_notification_id: notificationId,
            p_user_id: userId  // 🔥 Kirim user_id dari frontend
        });

    console.log('📤 RPC Response:', { data: rpcData, error: rpcError });

    if (rpcError) {
        console.error('❌ RPC failed:', rpcError);
        console.error('RPC Error details:', {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code
        });

        throw new Error(
            `Failed to mark notification as read: ${rpcError.message}\n\n` +
            `Solusi: Jalankan script diagnose-and-fix-user-id.sql di Supabase SQL Editor`
        );
    }

    if (!rpcData) {
        console.error('❌ RPC returned no data!');
        throw new Error('RPC function succeeded but returned no data');
    }

    // Parse JSON result
    const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;

    if (!result.success) {
        console.error('❌ RPC returned failure:', result.message);
        console.error('Details:', result);

        throw new Error(
            `Failed to mark notification as read: ${result.message}\n` +
            `Notification ID: ${result.notification_id}\n` +
            `User ID: ${result.user_id}\n` +
            `Rows Affected: ${result.rows_affected}`
        );
    }

    console.log('✅ RPC Success - Notification marked as read:', result);
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
        console.error('❌ Error marking all notifications as read:', error);
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
        console.error('❌ Error deleting notifications:', error);
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
        console.error('❌ Error clearing all notifications:', error);
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
                console.log('🔔 Realtime INSERT received:', payload.new);
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
                console.log('🔔 Realtime UPDATE received:', payload.new);
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
            console.log('🔔 Realtime subscription status:', status);
        });

    return channel;
}
```

---

### File 2: notificationStore.ts

**Location:** `src/store/notificationStore.ts`

**Action:** REPLACE function `markAsRead` (sekitar line 88-134) dengan kode di bawah

---

```typescript
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
```

---

## ✅ CHECKLIST

Setelah mengupdate kedua file:

- [ ] notificationService.ts - Function `markNotificationAsRead` menerima 2 parameter
- [ ] notificationStore.ts - Function `markAsRead` mengambil notification dan mengirim userId
- [ ] Simpan kedua file (Ctrl+S)
- [ ] Refresh browser (F5)
- [ ] Test klik notification

---

## 🧪 VERIFIKASI

Setelah refresh, klik notification dan lihat Console.

**LOG YANG BENAR (SUKSES):**
```
📖 Marking notification as read: [ID]
👤 Notification userId: 6000
🔄 Syncing to Supabase with userId...
📤 Using RPC function with user_id parameter...
✅ RPC Success - Notification marked as read
```

**LOG YANG SALAH (MASIH PAKAI KODE LAMA):**
```
📖 Marking notification as read: [ID]
🔄 Syncing to Supabase...
📤 Payload: { is_read: true }    ← SALAH! Ini kode lama
❌ No rows updated!
```

---

Jika masih ada error, kirim log Console lengkap setelah refresh! 🚀
