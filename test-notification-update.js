/**
 * 🧪 TEST: Cek Apakah Bisa Update Notification di Supabase
 *
 * MASALAH: Kolom is_read tidak berubah saat notification diklik
 *
 * CARA PAKAI:
 * 1. Login ke aplikasi
 * 2. Buka Console browser (F12)
 * 3. Copy paste script ini
 * 4. Ganti NOTIFICATION_ID dengan ID yang bermasalah
 * 5. Tekan Enter
 */

// GANTI DENGAN NOTIFICATION ID ANDA (dari log browser)
const NOTIFICATION_ID = '1768343067049-0.33882563793438203';

async function testNotificationUpdate() {
    console.clear();
    console.log('🧪 TEST: Update Notification di Supabase');
    console.log('=========================================\n');

    try {
        console.log('📝 Notification ID:', NOTIFICATION_ID);
        console.log('👤 User ID:', localStorage.getItem('loggedInUserId'));
        console.log('\n');

        // ========================================
        // TEST 1: Cek apakah notification ADA
        // ========================================
        console.log('========================================');
        console.log('TEST 1: Cek Notification di Database');
        console.log('========================================\n');

        const { data: notifData, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', NOTIFICATION_ID)
            .single();

        if (notifError) {
            console.error('❌ Error mengambil notification:', notifError);
            console.error('\nKemungkinan masalah:');
            console.error('1. Notification tidak ada di database');
            console.error('2. RLS Policy untuk SELECT belum di-set');
            console.error('3. User tidak punya akses\n');
            console.error('🔧 SOLUSI: Jalankan fix-notification-rls.sql di Supabase SQL Editor\n');
            return;
        }

        if (!notifData) {
            console.error('❌ Notification TIDAK DITEMUKAN di database!\n');
            console.error('🔧 SOLUSI: Notification ini hanya ada di localStorage.');
            console.error('Jalankan quick-fix-notifications.js untuk sync.\n');
            return;
        }

        console.log('✅ Notification DITEMUKAN di database!');
        console.table({
            ID: notifData.id,
            Title: notifData.title,
            'User ID': notifData.user_id,
            'Is Read': notifData.is_read ? '✅ TRUE' : '❌ FALSE',
            'Created At': new Date(notifData.created_at).toLocaleString('id-ID')
        });

        if (notifData.is_read) {
            console.log('\n⚠️ Notification sudah di-mark as read di database.');
            console.log('Reset ke unread dulu untuk test...\n');

            await supabase
                .from('notifications')
                .update({ is_read: false })
                .eq('id', NOTIFICATION_ID);

            console.log('✅ Reset ke unread. Lanjut test...\n');
        }

        // ========================================
        // TEST 2: Coba Update is_read ke TRUE
        // ========================================
        console.log('\n========================================');
        console.log('TEST 2: Coba Update is_read ke TRUE');
        console.log('========================================\n');

        console.log('🔄 Mengupdate notification...');
        const { data: updateData, error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', NOTIFICATION_ID)
            .select();

        console.log('\n📤 Supabase Response:');
        console.log('   - error:', updateError);
        console.log('   - data length:', updateData?.length || 0);

        if (updateError) {
            console.error('\n❌ UPDATE GAGAL!');
            console.error('Error Details:', {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint
            });

            if (updateError.code === '42501') {
                console.error('\n🔧 MASALAH: Permission denied!');
                console.error('Penyebab: RLS Policy untuk UPDATE belum di-set dengan benar.\n');
                console.error('🔧 SOLUSI:\n');
                console.error('1. Buka file check-and-fix-rls.sql');
                console.error('2. Copy semua isinya');
                console.error('3. Paste ke Supabase SQL Editor');
                console.error('4. Run (Ctrl+Enter)\n');
            }
            return;
        }

        if (!updateData || updateData.length === 0) {
            console.error('\n❌ UPDATE return 0 rows!');
            console.error('Penyebab: RLS Policy mencegah update, atau notification tidak ditemukan.\n');
            console.error('🔧 SOLUSI:\n');
            console.error('1. Jalankan check-and-fix-rls.sql di Supabase SQL Editor');
            console.error('2. Cek apakah user_id di notifications cocok dengan auth.uid()\n');
            return;
        }

        console.log('\n✅ UPDATE BERHASIL!');
        console.table({
            ID: updateData[0].id,
            Title: updateData[0].title,
            'Is Read': updateData[0].is_read ? '✅ TRUE' : '❌ FALSE',
            'Updated At': new Date(updateData[0].updated_at || updateData[0].created_at).toLocaleString('id-ID')
        });

        // ========================================
        // TEST 3: Verifikasi Hasil
        // ========================================
        console.log('\n========================================');
        console.log('TEST 3: Verifikasi Hasil');
        console.log('========================================\n');

        const { data: verifyData } = await supabase
            .from('notifications')
            .select('id, is_read')
            .eq('id', NOTIFICATION_ID)
            .single();

        if (verifyData && verifyData.is_read) {
            console.log('✅ VERIFIED: is_read = TRUE di database!');
            console.log('\n🎉 SELAMAT! Update BEKERJA dengan sempurna!');
            console.log('\nSekarang coba di aplikasi:');
            console.log('1. Refresh halaman (F5)');
            console.log('2. Klik notification di panel');
            console.log('3. Refresh lagi');
            console.log('4. Notification harus TETAP read (tidak muncul lagi sebagai unread)\n');
        } else {
            console.error('❌ WARNING: is_read masih FALSE!');
            console.error('Ada masalah dengan update.\n');
        }

        // Reset ke unread untuk test selanjutnya
        console.log('\n🔄 Reset ke unread untuk test selanjutnya...');
        await supabase
            .from('notifications')
            .update({ is_read: false })
            .eq('id', NOTIFICATION_ID);
        console.log('✅ Reset complete.\n');

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }

    console.log('========================================');
    console.log('✅ TEST SELESAI');
    console.log('========================================\n');

    console.log('💡 Jika test berhasil, berarti:');
    console.log('✅ RLS Policy sudah benar');
    console.log('✅ Update operation bekerja');
    console.log('✅ Masalah solved!\n');

    console.log('💡 Jika test gagal, jalankan:');
    console.log('1. check-and-fix-rls.sql di Supabase SQL Editor');
    console.log('2. Lalu jalankan test ini lagi\n');
}

// Jalankan test
testNotificationUpdate();

// Export untuk test manual
window.testNotificationUpdate = testNotificationUpdate;

console.log('✅ Script loaded! Ketik testNotificationUpdate() untuk test lagi.');
console.log('💡 Ganti NOTIFICATION_ID di script dengan ID notification Anda.\n');
