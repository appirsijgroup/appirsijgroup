/**
 * 🔧 SCRIPT: Sync Missing Notifications ke Supabase
 *
 * MASALAH: Notification muncul di frontend tapi TIDAK ADA di database Supabase
 * SOLUSI: Sync notification tersebut ke database, atau hapus dari local state
 *
 * CARA PAKAI:
 * 1. Buka aplikasi dan login
 * 2. Buka Console browser (F12)
 * 3. Copy dan paste script ini
 * 4. Tekan Enter
 * 5. Pilih opsi yang diinginkan
 */

console.log('🔧 Script Sync Missing Notifications');
console.log('=====================================\n');

async function syncMissingNotifications() {
    try {
        // Get user ID from localStorage
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            console.error('❌ User ID tidak ditemukan. Silakan login terlebih dahulu.');
            return;
        }

        console.log('👤 User ID:', userId);

        // Get local notifications from zustand store
        const { useNotificationStore } = await import('/src/store/store.ts');
        const localNotifications = useNotificationStore.getState().notifications;

        console.log(`📬 Local notifications: ${localNotifications.length}\n`);

        // Get all notifications from Supabase
        console.log('📥 Mengambil notifications dari Supabase...');
        const { data: dbNotifications, error: fetchError } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (fetchError) {
            console.error('❌ Error mengambil dari Supabase:', fetchError);
            console.error('\n🔧 SOLUSI: Jalankan script fix-notification-rls.sql di Supabase SQL Editor');
            return;
        }

        console.log(`✅ Supabase notifications: ${dbNotifications.length}\n`);

        // Find notifications that only exist locally
        const dbIds = new Set(dbNotifications.map(n => n.id));
        const missingInDb = localNotifications.filter(n => !dbIds.has(n.id));

        console.log('========================================');
        console.log('HASIL ANALISA');
        console.log('========================================\n');

        console.log(`📊 Total local: ${localNotifications.length}`);
        console.log(`📊 Total database: ${dbNotifications.length}`);
        console.log(`⚠️ Missing di database: ${missingInDb.length}\n`);

        if (missingInDb.length === 0) {
            console.log('✅ Semua notifications sudah sync dengan Supabase!');
            console.log('Tidak ada perbaikan yang diperlukan.\n');
            return;
        }

        console.log('⚠️ Notifications yang HANYA ada di local (tidak ada di database):');
        console.table(missingInDb.map(n => ({
            ID: n.id.substring(0, 35) + '...',
            Title: n.title,
            Type: n.type,
            'Is Read': n.isRead,
            Timestamp: new Date(n.timestamp).toLocaleString('id-ID')
        })));

        console.log('\n========================================');
        console.log('PILIH SOLUSI');
        console.log('========================================\n');

        console.log('Pilih tindakan yang diinginkan:\n');
        console.log('1. Sync semua missing notifications ke Supabase (RECOMMENDED)');
        console.log('2. Hapus missing notifications dari local state');
        console.log('3. Batal dan cek manual\n');

        // Gunakan prompt untuk memilih (ini akan bekerja di browser)
        const choice = prompt(
            'Pilih solusi (1/2/3):\n' +
            '1 = Sync ke Supabase (RECOMMENDED)\n' +
            '2 = Hapus dari local\n' +
            '3 = Batal\n\n' +
            `Missing: ${missingInDb.length} notifications`,
            '1'
        );

        if (choice === '1') {
            console.log('\n🔄 Memulai sync ke Supabase...\n');

            let successCount = 0;
            let failCount = 0;

            for (const notif of missingInDb) {
                console.log(`📤 Syncing: ${notif.title.substring(0, 50)}...`);

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
                    console.error(`❌ Gagal: ${insertError.message}`);
                    failCount++;
                } else {
                    console.log(`✅ Berhasil`);
                    successCount++;
                }
            }

            console.log('\n========================================');
            console.log('HASIL SYNC');
            console.log('========================================\n');
            console.log(`✅ Berhasil: ${successCount}`);
            console.log(`❌ Gagal: ${failCount}`);
            console.log(`📊 Total: ${missingInDb.length}\n`);

            if (successCount > 0) {
                console.log('✅ Sinkronisasi berhasil!');
                console.log('🔄 Refresh halaman untuk melihat hasilnya.\n');
            }

            if (failCount > 0) {
                console.log('⚠️ Beberapa notifications gagal di-sync.');
                console.log('🔧 Cek RLS Policy di Supabase SQL Editor.\n');
            }

        } else if (choice === '2') {
            console.log('\n🗑️ Menghapus missing notifications dari local state...\n');

            const missingIds = missingInDb.map(n => n.id);

            // Hapus dari local state
            useNotificationStore.getState().deleteNotifications(missingIds);

            console.log(`✅ Berhasil menghapus ${missingIds.length} notifications dari local state.`);
            console.log('🔄 Refresh halaman untuk memuat data yang benar dari Supabase.\n');

        } else {
            console.log('❌ Dibatalkan.\n');
            console.log('💡 Tips:');
            console.log('- Cek notificationService.ts untuk memastikan createNotificationSupabase() bekerja');
            console.log('- Jalankan fix-notification-rls.sql untuk memperbaiki RLS policies');
            console.log('- Refresh halaman untuk memaksa hydrate dari Supabase\n');
        }

        // Show statistics
        console.log('========================================');
        console.log('STATISTIK FINAL');
        console.log('========================================\n');

        const finalLocal = useNotificationStore.getState().notifications;
        console.log(`📊 Local notifications sekarang: ${finalLocal.length}`);
        console.log(`📊 Database notifications: ${dbNotifications.length}`);

        const stillMissing = finalLocal.filter(n => !dbIds.has(n.id));
        if (stillMissing.length > 0) {
            console.log(`⚠️ Masih ada ${stillMissing.length} notifications yang belum sync`);
        } else {
            console.log('✅ Semua notifications sudah sync!');
        }

    } catch (err) {
        console.error('❌ Error:', err);
        console.error('Error details:', err.message);
    }
}

// Jalankan fungsi
window.syncMissingNotifications = syncMissingNotifications;

console.log('✅ Script loaded!');
console.log('💡 Ketik syncMissingNotifications() untuk menjalankan sync.\n');

// Auto-run atau tanya user
console.log('⚠️ BEFORE running sync, pastikan:');
console.log('1. Anda sudah login');
console.log('2. Script fix-notification-rls.sql sudah dijalankan di Supabase');
console.log('3. Tidak ada error di console saat ini\n');
console.log('Ketik syncMissingNotifications() untuk memulai...\n');
