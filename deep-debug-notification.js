/**
 * 🔬 DEEP DEBUG: Cek Masalah Notification Update
 *
 * Masalah: is_read tidak berubah, Supabase return {data: Array(0), error: null}
 *
 * CARA PAKAI:
 * 1. Login ke aplikasi
 * 2. Buka Console browser (F12)
 * 3. Copy paste script ini
 * 4. Tekan Enter
 */

const NOTIFICATION_ID = '1768343067049-0.33882563793438203';

async function deepDebugNotification() {
    console.clear();
    console.log('🔬 DEEP DEBUG: Notification Update Issue');
    console.log('=========================================\n');

    try {
        const userId = localStorage.getItem('loggedInUserId');
        console.log('👤 Current User ID:', userId);
        console.log('📝 Notification ID:', NOTIFICATION_ID);
        console.log('\n');

        // ========================================
        // TEST 1: Cek notification di database
        // ========================================
        console.log('========================================');
        console.log('TEST 1: Cek Notification di Database');
        console.log('========================================\n');

        const { data: notif, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', NOTIFICATION_ID)
            .single();

        if (notifError || !notif) {
            console.error('❌ Notification TIDAK DITEMUKAN di database!');
            console.error('Error:', notifError);
            console.error('\n🔧 SOLUSI: Notification ini perlu di-sync ke database.');
            console.error('Jalankan script quick-fix-notifications.js\n');
            return;
        }

        console.log('✅ Notification DITEMUKAN!');
        console.log('Details:');
        console.log('  ID:', notif.id);
        console.log('  User ID:', notif.user_id);
        console.log('  Title:', notif.title);
        console.log('  Is Read:', notif.is_read ? 'TRUE ✅' : 'FALSE ❌');
        console.log('  Created:', new Date(notif.created_at).toLocaleString('id-ID'));

        // Cek apakah user_id cocok
        if (notif.user_id !== userId) {
            console.error('\n⚠️ WARNING: user_id TIDAK COCOK!');
            console.error('  user_id di notification:', notif.user_id);
            console.error('  Current logged in user:', userId);
            console.error('\n🔧 INI MASALAHNYA! RLS Policy mencegah update.');
            console.error('\nSolusi: Update user_id di notification:');
            console.error(`UPDATE notifications SET user_id = '${userId}' WHERE id = '${NOTIFICATION_ID}';\n`);
            return;
        }

        console.log('✅ user_id COCOK dengan current user!\n');

        // ========================================
        // TEST 2: Cek RLS Policy
        // ========================================
        console.log('\n========================================');
        console.log('TEST 2: Cek RLS Policy via RPC');
        console.log('========================================\n');

        // Coba update dengan cara yang sama seperti di aplikasi
        console.log('🔄 Mencoba UPDATE notification...');
        console.log('Query: UPDATE notifications SET is_read = true WHERE id = ...');

        const { data: updateResult, error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', NOTIFICATION_ID)
            .select();

        console.log('\n📤 Supabase Response:');
        console.log('  error:', updateError);
        console.log('  data:', updateResult);
        console.log('  data.length:', updateResult?.length || 0);

        if (updateError) {
            console.error('\n❌ UPDATE GAGAL dengan error!');
            console.error('Error Code:', updateError.code);
            console.error('Error Message:', updateError.message);
            console.error('Error Details:', updateError.details);
            console.error('Error Hint:', updateError.hint);

            if (updateError.code === '42501') {
                console.error('\n🔧 MASALAH: Permission denied (RLS Policy)');
                console.error('\nSolusi:');
                console.error('1. Jalankan diagnose-notification-issue.sql di Supabase');
                console.error('2. Lihat hasil STEP 4 untuk diagnosa lebih lanjut\n');
            }
            return;
        }

        if (!updateResult || updateResult.length === 0) {
            console.error('\n❌ UPDATE return 0 rows!');
            console.error('\nKemungkinan penyebab:');
            console.error('1. Notification tidak ada (padahal tadi ketemu)');
            console.error('2. RLS Policy mencegah update (tanpa error)');
            console.error('3. User tidak punya permission\n');

            console.error('🔧 SOLUSI:\n');
            console.error('Jalankan script diagnose-notification-issue.sql di Supabase SQL Editor.');
            console.error('Lihat hasil STEP 4 (Test Direct UPDATE).\n');

            if (notif.user_id !== userId) {
                console.error('⚠️ MASALAH DITEMUKAN: user_id tidak cocok!');
                console.error('Update user_id dengan:');
                console.error(`UPDATE notifications`);
                console.error(`SET user_id = '${userId}'`);
                console.error(`WHERE id = '${NOTIFICATION_ID}';\n`);
            }
            return;
        }

        console.log('\n✅ UPDATE BERHASIL!');
        console.log('Result:');
        console.log('  ID:', updateResult[0].id);
        console.log('  Is Read:', updateResult[0].is_read ? 'TRUE ✅' : 'FALSE ❌');

        // ========================================
        // TEST 3: Verifikasi
        // ========================================
        console.log('\n========================================');
        console.log('TEST 3: Verifikasi Hasil');
        console.log('========================================\n');

        const { data: verify } = await supabase
            .from('notifications')
            .select('id, is_read')
            .eq('id', NOTIFICATION_ID)
            .single();

        if (verify && verify.is_read) {
            console.log('✅ VERIFIED: is_read = TRUE di database!');
            console.log('\n🎉 UPDATE BEKERJA dengan sempurna!');
            console.log('\nSekarang coba di aplikasi:');
            console.log('1. Reset ke unread dulu (jalankan di bawah)');
            console.log('2. Refresh halaman (F5)');
            console.log('3. Klik notification di panel');
            console.log('4. Refresh lagi');
            console.log('5. Notification harus TETAP read\n');

            // Reset untuk test
            console.log('🔄 Reset ke unread untuk test aplikasi...');
            await supabase
                .from('notifications')
                .update({ is_read: false })
                .eq('id', NOTIFICATION_ID);
            console.log('✅ Reset complete! Silakan test di aplikasi.\n');
        } else {
            console.error('❌ WARNING: is_read masih FALSE setelah update!');
            console.error('Ada masalah aneh. Cek koneksi database.\n');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
    }

    console.log('========================================');
    console.log('✅ DEBUG SELESAI');
    console.log('========================================\n');
}

// Jalankan debug
deepDebugNotification();

// Export untuk test manual
window.deepDebugNotification = deepDebugNotification;

console.log('✅ Script loaded! Ketik deepDebugNotification() untuk test lagi.\n');
