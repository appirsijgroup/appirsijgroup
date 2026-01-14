/**
 * 🚀 QUICK FIX: Sync Missing Notifications ke Supabase
 *
 * MASALAH: Notification muncul di frontend tapi TIDAK ADA di database
 * AKIBAT: Saat diklik, is_read tidak berubah karena notification tidak ada di DB
 *
 * CARA PAKAI (SANGAT MUDAH):
 * 1. Login ke aplikasi
 * 2. Buka Console browser (F12)
 * 3. Copy paste script ini
 * 4. Tekan Enter
 * 5. Tunggu selesai, lalu refresh (F5)
 */

(async function quickFixNotifications() {
    console.clear();
    console.log('🚀 QUICK FIX: Sync Missing Notifications');
    console.log('=========================================\n');

    try {
        // 1. Get user ID
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            console.error('❌ User ID tidak ditemukan! Silakan login dulu.');
            return;
        }
        console.log('👤 User ID:', userId);

        // 2. Get local notifications
        const { useNotificationStore } = await import('/src/store/store.ts');
        const localNotifications = useNotificationStore.getState().notifications;
        console.log(`📬 Local notifications: ${localNotifications.length}`);

        // 3. Get database notifications
        console.log('📥 Mengambil dari database...');
        const { data: dbNotifications, error: fetchError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId);

        if (fetchError) {
            console.error('❌ Gagal mengambil dari database:', fetchError.message);
            console.error('\n🔧 SOLUSI: Jalankan script ini di Supabase SQL Editor:\n');
            console.log('Lihat file fix-notification-rls.sql');
            return;
        }

        console.log(`✅ Database notifications: ${dbNotifications.length}\n`);

        // 4. Find missing notifications
        const dbIds = new Set(dbNotifications.map(n => n.id));
        const missingNotifications = localNotifications.filter(n => !dbIds.has(n.id));

        console.log('========================================');
        console.log('HASIL ANALISA');
        console.log('========================================\n');
        console.log(`📊 Total local: ${localNotifications.length}`);
        console.log(`📊 Total database: ${dbNotifications.length}`);
        console.log(`⚠️ Missing di database: ${missingNotifications.length}\n`);

        if (missingNotifications.length === 0) {
            console.log('✅ SEMUA SUDAH SYNC! Tidak ada perbaikan yang diperlukan.');
            console.log('💡 Jika masih ada masalah, coba refresh halaman (F5)\n');
            return;
        }

        console.log('⚠️ Notifications yang akan di-sync ke database:');
        console.table(missingNotifications.map((n, i) => ({
            No: i + 1,
            Title: n.title.substring(0, 40) + (n.title.length > 40 ? '...' : ''),
            Type: n.type,
            Read: n.isRead ? '✅' : '❌'
        })));

        // 5. Sync to database
        console.log('\n========================================');
        console.log('MEMULAI SYNC KE DATABASE...');
        console.log('========================================\n');

        let successCount = 0;
        let failCount = 0;

        for (const notif of missingNotifications) {
            process.stdout.write(`📤 Syncing: ${notif.title.substring(0, 40)}... `);

            // Map to database format
            const dbNotification = {
                id: notif.id,
                user_id: notif.userId,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                timestamp: notif.timestamp,
                is_read: notif.isRead,
                related_entity_id: notif.relatedEntityId,
                link_to: notif.linkTo,
                expires_at: notif.expiresAt,
                dismiss_on_click: notif.dismissOnClick,
            };

            const { error: insertError } = await supabase
                .from('notifications')
                .insert(dbNotification);

            if (insertError) {
                console.log(`❌ GAGAL`);
                console.error(`   Error: ${insertError.message}`);
                failCount++;
            } else {
                console.log(`✅ BERHASIL`);
                successCount++;
            }
        }

        console.log('\n========================================');
        console.log('HASIL SYNC');
        console.log('========================================\n');
        console.log(`✅ Berhasil: ${successCount} notifications`);
        console.log(`❌ Gagal: ${failCount} notifications`);
        console.log(`📊 Total: ${missingNotifications.length} notifications\n`);

        if (successCount > 0) {
            console.log('🎉 SYNC BERHASIL!\n');
            console.log('🔄 Sekarang REFRESH halaman (F5) untuk melihat hasilnya.\n');
            console.log('Setelah refresh:');
            console.log('1. Notification yang sudah dibaca akan tetap read');
            console.log('2. Indikator lonceng akan menampilkan jumlah unread dengan benar\n');
        }

        if (failCount > 0) {
            console.log('⚠️ Beberapa notifications gagal di-sync.');
            console.log('🔧 Pastikan RLS Policy sudah di-set dengan benar.\n');
            console.log('Jalankan ini di Supabase SQL Editor:');
            console.log('1. Buka file fix-notification-rls.sql');
            console.log('2. Copy semua isinya');
            console.log('3. Paste ke Supabase SQL Editor');
            console.log('4. Run (Ctrl+Enter)\n');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    }

    console.log('========================================');
    console.log('✅ SELESAI');
    console.log('========================================\n');
})();
