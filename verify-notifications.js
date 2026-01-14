/**
 * 🔍 VERIFICATION: Cek Apakah Notification Sudah di Database
 *
 * CARA PAKAI:
 * 1. Login ke aplikasi
 * 2. Buka Console browser (F12)
 * 3. Copy paste script ini
 * 4. Tekan Enter
 */

(async function verifyNotifications() {
    console.clear();
    console.log('🔍 VERIFICATION: Cek Notification di Database');
    console.log('================================================\n');

    try {
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            console.error('❌ User ID tidak ditemukan! Silakan login dulu.');
            return;
        }

        console.log('👤 User ID:', userId);
        console.log('📥 Mengambil data...\n');

        // Get all notifications from database
        const { data: dbNotifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('❌ Error:', error.message);
            console.error('\n🔧 SOLUSI: Jalankan fix-notification-rls.sql di Supabase SQL Editor');
            return;
        }

        console.log('================================================');
        console.log('HASIL');
        console.log('================================================\n');

        console.log(`📊 Total notifications di database: ${dbNotifications.length}\n`);

        if (dbNotifications.length === 0) {
            console.warn('⚠️ TIDAK ADA notification di database!');
            console.warn('\n🔧 SOLUSI:\n');
            console.warn('1. Jalankan script quick-fix-notifications.js untuk sync');
            console.warn('2. Atau jalankan fix-notification-rls.sql di Supabase SQL Editor\n');
            return;
        }

        // Show statistics
        const unreadCount = dbNotifications.filter(n => !n.is_read).length;
        const readCount = dbNotifications.filter(n => n.is_read).length;

        console.log('📈 Statistik:');
        console.log(`   ✅ Read: ${readCount}`);
        console.log(`   ❌ Unread: ${unreadCount}`);
        console.log(`   📊 Total: ${dbNotifications.length}\n`);

        // Show notifications
        console.log('📋 Daftar Notifications:\n');
        console.table(dbNotifications.map((n, i) => ({
            No: i + 1,
            Title: n.title.substring(0, 35) + (n.title.length > 35 ? '...' : ''),
            Type: n.type,
            Read: n.is_read ? '✅ YES' : '❌ NO',
            Date: new Date(n.timestamp).toLocaleDateString('id-ID')
        })));

        console.log('\n================================================');
        console.log('✅ VERIFICATION SELESAI');
        console.log('================================================\n');

        if (unreadCount > 0) {
            console.log('💡 Ada ' + unreadCount + ' notifications yang masih unread.');
            console.log('Klik notification di panel untuk mark as read.\n');
        } else {
            console.log('🎉 Semua notifications sudah read!\n');
        }

        console.log('💡 Tips:');
        console.log('- Jika notification tidak sesuai, jalankan quick-fix-notifications.js');
        console.log('- Jika ada error, cek RLS Policy di Supabase SQL Editor\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
})();
