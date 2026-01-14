/**
 * Script untuk DEBUG apakah notification ada di database Supabase
 *
 * CARA PAKAI:
 * 1. Buka browser dan login ke aplikasi
 * 2. Buka Developer Tools (F12)
 * 3. Pergi ke tab Console
 * 4. Copy dan paste script ini
 * 5. Tekan Enter
 */

// Dapatkan notification ID dari log terakhir (ganti dengan ID yang sesuai)
const notificationId = '1768342726437-0.25549812295126795';

console.log('🔍 Memeriksa apakah notification ada di database...');
console.log('📝 Notification ID:', notificationId);

// Jalankan query untuk mencari notification
window.checkNotificationExists = async function(notifId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notifId)
            .single();

        if (error) {
            console.error('❌ Error fetching notification:', error);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error hint:', error.hint);
            return null;
        }

        if (!data) {
            console.warn('⚠️ Notification TIDAK ditemukan di database!');
            console.warn('Ini berarti notification hanya ada di localStorage/frontend saja');
            console.warn('Solusi: Coba refresh untuk memastikan data sinkron dengan Supabase');
            return null;
        }

        console.log('✅ Notification DITEMUKAN di database:', data);
        console.log('📊 Details:', {
            id: data.id,
            user_id: data.user_id,
            title: data.title,
            is_read: data.is_read,
            timestamp: data.timestamp,
            created_at: data.created_at
        });

        // Cek apakah is_read sudah true
        if (data.is_read) {
            console.log('✅ Notification sudah di-mark as read di database');
        } else {
            console.log('❌ Notification masih UNREAD di database (is_read = false)');
            console.log('🔧 Mencoba mengupdate...');

            // Coba update
            const { data: updateData, error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notifId)
                .select();

            if (updateError) {
                console.error('❌ Gagal mengupdate notification:', updateError);
                console.error('Ini kemungkinan besar masalah RLS Policy!');
                console.error('Solusi: Jalankan script fix-notification-rls.sql di Supabase SQL Editor');
                return false;
            }

            console.log('✅ Berhasil mengupdate notification:', updateData);
            return true;
        }

        return data;
    } catch (err) {
        console.error('❌ Unexpected error:', err);
        return null;
    }
};

// Jalankan fungsi
checkNotificationExists(notificationId);

// Fungsi untuk cek semua notifications untuk user
window.checkAllUserNotifications = async function(userId = '6000') {
    console.log('🔍 Memeriksa semua notifications untuk user:', userId);

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
        id: n.id,
        title: n.title,
        is_read: n.is_read,
        timestamp: new Date(n.timestamp).toLocaleString('id-ID')
    })));

    const unreadCount = data.filter(n => !n.is_read).length;
    console.log(`📊 Unread: ${unreadCount} dari ${data.length}`);
};

console.log('💡 Tips:');
console.log('  - Jalankan checkNotificationExists("ID_NOTIF") untuk cek satu notification');
console.log('  - Jalankan checkAllUserNotifications("USER_ID") untuk cek semua notifications');
console.log('  - User ID default adalah 6000, ganti sesuai dengan user ID Anda');
