/**
 * 🔍 SCRIPT DEBUG: Cek Apakah Notification Ada di Database Supabase
 *
 * MASALAH: Notification muncul di frontend tapi TIDAK BISA di-update
 * PENYEBAB: Notification mungkin TIDAK ADA di database Supabase
 *
 * CARA PAKAI:
 * 1. Buka aplikasi dan login
 * 2. Buka Console browser (F12)
 * 3. Copy dan paste script ini
 * 4. Tekan Enter
 */

// Ganti dengan notification ID yang bermasalah (dari log Anda)
const NOTIFICATION_ID = '1768343067049-0.33882563793438203';
const USER_ID = '6000'; // Ganti dengan user ID Anda

console.log('🔍 Memulai investigasi notification...');
console.log('📝 Notification ID:', NOTIFICATION_ID);
console.log('👤 User ID:', USER_ID);

// Import supabase client (available in browser console)
async function checkNotification() {
    try {
        console.log('\n========================================');
        console.log('STEP 1: Cek Notification di Supabase');
        console.log('========================================\n');

        // Cari notification by ID
        const { data: notifData, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', NOTIFICATION_ID)
            .single();

        if (notifError) {
            console.error('❌ Error mencari notification:', notifError);
            console.error('Error Details:', {
                message: notifError.message,
                code: notifError.code,
                hint: notifError.hint
            });

            if (notifError.code === 'PGRST116') {
                console.warn('\n⚠️ KESIMPULAN: Notification TIDAK DITEMUKAN di database!');
                console.warn('🔧 SOLUSI: Notification ini hanya ada di localStorage/frontend.\n');
                console.warn('Lanjung ke STEP 2 untuk melihat semua notifications...');
            }
            return;
        }

        if (!notifData) {
            console.warn('\n⚠️ Notification TIDAK DITEMUKAN di database!');
            console.warn('🔧 SOLUSI: Notification ini hanya ada di localStorage/frontend.\n');
            console.warn('Lanjung ke STEP 2 untuk melihat semua notifications...\n');
        } else {
            console.log('✅ Notification DITEMUKAN di database!');
            console.table({
                ID: notifData.id,
                'User ID': notifData.user_id,
                Title: notifData.title,
                'Is Read': notifData.is_read,
                Timestamp: new Date(notifData.timestamp).toLocaleString('id-ID'),
                'Created At': new Date(notifData.created_at).toLocaleString('id-ID')
            });

            if (notifData.is_read) {
                console.log('\n✅ Notification sudah di-mark as read di database');
            } else {
                console.log('\n❌ Notification masih UNREAD di database');
                console.log('🔧 Mencoba mengupdate...\n');

                // Coba update
                const { data: updateData, error: updateError } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', NOTIFICATION_ID)
                    .select();

                if (updateError) {
                    console.error('❌ GAGAL mengupdate notification:', updateError);
                    console.error('\n🔧 Ini kemungkinan masalah RLS Policy!');
                    console.error('SOLUSI: Jalankan script fix-notification-rls.sql di Supabase SQL Editor\n');
                } else if (updateData && updateData.length > 0) {
                    console.log('✅ Berhasil mengupdate notification!');
                    console.table(updateData[0]);
                } else {
                    console.warn('⚠️ Update mengembalikan 0 rows. RLS Policy mungkin bermasalah.');
                }
            }
            return;
        }

        console.log('\n========================================');
        console.log('STEP 2: Cek Semua Notifications User');
        console.log('========================================\n');

        // Cek semua notifications untuk user ini
        const { data: allNotifs, error: allNotifsError } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', USER_ID)
            .order('timestamp', { ascending: false });

        if (allNotifsError) {
            console.error('❌ Error mengambil semua notifications:', allNotifsError);
            return;
        }

        console.log(`📬 Total notifications di database: ${allNotifs.length}`);

        if (allNotifs.length === 0) {
            console.warn('\n⚠️ TIDAK ADA notification sama sekali di database untuk user ini!');
            console.warn('🔧 Artinya: SEMUA notifications hanya ada di localStorage/frontend.\n');
            console.warn('SOLUSI: Refresh halaman atau bersihkan localStorage.\n');
        } else {
            console.log('\n📋 Notifications di database:');
            console.table(allNotifs.map(n => ({
                ID: n.id.substring(0, 30) + '...',
                Title: n.title,
                'Is Read': n.is_read,
                Timestamp: new Date(n.timestamp).toLocaleString('id-ID')
            })));

            const unreadCount = allNotifs.filter(n => !n.is_read).length;
            console.log(`\n📊 Statistik: ${unreadCount} unread dari ${allNotifs.length} total\n`);

            // Cek apakah notification yang bermasalah ada di list
            const exists = allNotifs.some(n => n.id === NOTIFICATION_ID);
            if (!exists) {
                console.warn(`⚠️ Notification "${NOTIFICATION_ID}" TIDAK ADA di database!`);
                console.warn('🔧 Artinya: Notification ini dibuat lokal tapi GAGAL sync ke Supabase.\n');
                console.warn('SOLUSI:');
                console.warn('1. Cek createNotificationSupabase() di notificationService.ts');
                console.warn('2. Pastikan tidak ada error saat create notification');
                console.warn('3. Cek log browser saat notification dibuat\n');
            }
        }

        console.log('\n========================================');
        console.log('STEP 3: Bandingkan dengan Local State');
        console.log('========================================\n');

        // Cek local state dari zustand store
        // Note: Ini tidak akan bekerja di console biasa, perlu dijalankan di aplikasi
        try {
            const { useNotificationStore } = await import('/src/store/store.ts');
            const notifications = useNotificationStore.getState().notifications;

            console.log(`📬 Total notifications di local state: ${notifications.length}`);

            const localNotif = notifications.find(n => n.id === NOTIFICATION_ID);
            if (localNotif) {
                console.log('✅ Notification ADA di local state:');
                console.table({
                    ID: localNotif.id,
                    Title: localNotif.title,
                    'Is Read': localNotif.isRead,
                    Timestamp: new Date(localNotif.timestamp).toLocaleString('id-ID')
                });
            } else {
                console.warn('⚠️ Notification TIDAK ADA di local state');
            }

            // Bandingkan
            const dbIds = new Set(allNotifs.map(n => n.id));
            const localIds = new Set(notifications.map(n => n.id));

            const onlyInLocal = notifications.filter(n => !dbIds.has(n.id));
            const onlyInDb = allNotifs.filter(n => !localIds.has(n.id));

            if (onlyInLocal.length > 0) {
                console.warn(`\n⚠️ ${onlyInLocal.length} notifications HANYA ada di local (tidak sync ke Supabase):`);
                console.table(onlyInLocal.map(n => ({
                    ID: n.id.substring(0, 30) + '...',
                    Title: n.title,
                    'Is Read': n.isRead
                })));
            }

            if (onlyInDb.length > 0) {
                console.warn(`\n⚠️ ${onlyInDb.length} notifications HANYA ada di database (tidak ada di local):`);
                console.table(onlyInDb.map(n => ({
                    ID: n.id.substring(0, 30) + '...',
                    Title: n.title,
                    'Is Read': n.is_read
                })));
            }

        } catch (err) {
            console.warn('⚠️ Tidak bisa cek local state dari console biasa');
            console.warn('Gunakan React DevTools atau cek langsung di aplikasi\n');
        }

        console.log('\n========================================');
        console.log('KESIMPULAN & SOLUSI');
        console.log('========================================\n');

        if (!notifData && allNotifs.length > 0) {
            console.log('❌ Masalah: Notification TIDAK ADA di database Supabase');
            console.log('\n🔧 Solusi:');
            console.log('1. Notification ini dibuat lokal tapi GAGAL sync ke Supabase');
            console.log('2. Cek log saat notification dibuat (createNotification)');
            console.log('3. Pastikan createNotificationSupabase() berhasil');
            console.log('4. Refresh halaman untuk memaksa sync dari Supabase\n');
            console.log('5. ATAU gunakan script sync-notifications.js untuk sync manual\n');
        } else if (allNotifs.length === 0) {
            console.log('❌ Masalah: TIDAK ADA notification sama sekali di database');
            console.log('\n🔧 Solusi:');
            console.log('1. Cek apakah tabel notifications ada di Supabase');
            console.log('2. Cek RLS policy untuk SELECT');
            console.log('3. Refresh halaman untuk memaksa hydrate dari Supabase\n');
        } else if (notifError && notifError.code === '42501') {
            console.log('❌ Masalah: Permission denied (RLS Policy)');
            console.log('\n🔧 Solusi:');
            console.log('Jalankan script fix-notification-rls.sql di Supabase SQL Editor\n');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

// Jalankan fungsi
checkNotification().then(() => {
    console.log('\n✅ Investigasi selesai!');
    console.log('\n💡 Tips Tambahan:');
    console.log('- Jalankan checkNotification("ID_NOTIF") untuk cek notification lain');
    console.log('- Jalankan checkAllUserNotifications("USER_ID") untuk cek semua notifications');
    console.log('- Buka Supabase Dashboard > Table Editor > notifications untuk cek manual\n');
});

// Export fungsi untuk penggunaan manual
window.checkNotification = checkNotification;

window.checkAllUserNotifications = async function(userId = USER_ID) {
    console.log(`\n🔍 Memeriksa semua notifications untuk user: ${userId}\n`);

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📬 Total notifications: ${data.length}`);
    console.table(data.map(n => ({
        ID: n.id.substring(0, 30) + '...',
        Title: n.title,
        'Is Read': n.is_read,
        Timestamp: new Date(n.timestamp).toLocaleString('id-ID')
    })));

    const unreadCount = data.filter(n => !n.is_read).length;
    console.log(`\n📊 Unread: ${unreadCount} dari ${data.length}\n`);
};

console.log('✅ Script loaded! Ketik checkNotification() untuk menjalankan lagi.');
