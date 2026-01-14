/**
 * =====================================================
 * FINAL SOLUTION: markNotificationAsRead with user_id
 * =====================================================
 *
 * Masalah: auth.uid() return NULL di Supabase
 * Solusi: Kirim user_id sebagai parameter dari frontend
 *
 * Location: src/services/notificationService.ts
 * Function: markNotificationAsRead
 *
 * INSTRUKSI:
 * 1. Buka file src/services/notificationService.ts
 * 2. Cari function markNotificationAsRead (sekitar line 123)
 * 3. REPLACE seluruh function dengan kode di bawah
 * 4. Simpan file (Ctrl+S)
 * =====================================================
 */

import { supabase } from '@/lib/supabase';

// Tambahkan ini di bagian import lain
// (kalau belum ada)

/**
 * Mark notification as read in Supabase
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    console.log('📤 Supabase: Marking notification as read:', notificationId);
    console.log('👤 User ID:', userId);
    console.log('📤 Using RPC function with user_id parameter...');

    // 🔥 FIX: Gunakan RPC function dengan user_id parameter
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
 * =====================================================
 * PENTING: Update juga di notificationStore.ts
 * =====================================================
 *
 * Di file src/store/notificationStore.ts,
 * cari function markAsRead (sekitar line 88-111),
 * dan UPDATE pemanggilan markNotificationAsRead:
 *
 * DARI:
 *   await markNotificationAsReadSupabase(notificationId);
 *
 * MENJADI:
 *   const { notifications } = get();
 *   const notification = notifications.find(n => n.id === notificationId);
 *   await markNotificationAsReadSupabase(notificationId, notification?.userId || '');
 *
 * =====================================================
 */
