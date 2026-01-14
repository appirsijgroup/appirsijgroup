/**
 * =====================================================
 * FINAL SOLUTION: Update notificationStore markAsRead
 * =====================================================
 *
 * Location: src/store/notificationStore.ts
 * Function: markAsRead (sekitar line 88-111)
 *
 * INSTRUKSI:
 * 1. Buka file src/store/notificationStore.ts
 * 2. Cari function markAsRead
 * 3. REPLACE function tersebut dengan kode di bawah
 * 4. Simpan file (Ctrl+S)
 * =====================================================
 */

// Di dalam create<NotificationState>()((set, get) => ({
// ...

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

// ...
// }))

/**
 * =====================================================
 * CATATAN PENTING:
 * =====================================================
 *
 * Pastikan sudah mengimport:
 * import { markNotificationAsRead as markNotificationAsReadSupabase } from '@/services/notificationService';
 *
 * Dan function markNotificationAsRead di notificationService.ts
 * sudah diupdate untuk menerima 2 parameter: (notificationId, userId)
 *
 * =====================================================
 */
