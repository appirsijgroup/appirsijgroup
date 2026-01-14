/**
 * =====================================================
 * MANUAL FIX: Update markNotificationAsRead function
 * =====================================================
 * Location: src/services/notificationService.ts
 * Function: markNotificationAsRead (line 123-191)
 *
 * INSTRUKSI:
 * 1. Buka file src/services/notificationService.ts
 * 2. Cari function markNotificationAsRead (sekitar line 123)
 * 3. REPLACE seluruh function dengan kode di bawah ini
 * 4. Simpan file (Ctrl+S)
 * =====================================================
 */

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    console.log('📤 Supabase: Marking notification as read:', notificationId);
    console.log('📤 Using RPC function (bypass RLS)...');

    // 🔥 FIX: Gunakan RPC function langsung karena direct UPDATE tidak reliable dengan RLS
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('mark_notification_read_v2', {
            p_notification_id: notificationId
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
            `Solusi: Jalankan script use-rpc-instead-of-direct-update.sql di Supabase SQL Editor`
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
        throw new Error(`Failed to mark notification as read: ${result.message}`);
    }

    console.log('✅ RPC Success - Notification marked as read:', result);
}

/**
 * =====================================================
 * CATATAN PENTING:
 * =====================================================
 *
 * Setelah mengupdate function ini:
 *
 * 1. PASTIKAN sudah menjalankan script use-rpc-instead-of-direct-update.sql
 *    di Supabase SQL Editor untuk membuat RPC function mark_notification_read_v2
 *
 * 2. Refresh browser (F5) untuk memuat code yang baru
 *
 * 3. Klik notification untuk test
 *
 * 4. Lihat di Console, seharusnya:
 *    📤 Using RPC function (bypass RLS)...
 *    ✅ RPC Success - Notification marked as read
 *
 * 5. Refresh browser lagi (F5)
 *
 * 6. ✅ Notification harus TETAP read (tidak muncul lagi sebagai unread)
 *
 * =====================================================
 */
