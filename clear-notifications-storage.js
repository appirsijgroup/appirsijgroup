/**
 * Script untuk membersihkan localStorage yang mungkin masih menyimpan data notifikasi lama
 *
 * CARA PAKAI:
 * 1. Buka browser dan login ke aplikasi
 * 2. Buka Developer Tools (F12)
 * 3. Pergi ke tab Console
 * 4. Copy dan paste script ini
 * 5. Tekan Enter
 * 6. Refresh halaman (F5)
 */

console.log('🧹 Memulai pembersihan localStorage...');

// Cek apa yang ada di localStorage sekarang
const before = localStorage.getItem('notifications-storage');
console.log('📦 Sebelum cleanup:', before ? JSON.parse(before) : 'null');

// Hapus data notifikasi lama dari localStorage
localStorage.removeItem('notifications-storage');
console.log('✅ notifications-storage telah dihapus dari localStorage');

// Verifikasi bahwa sudah terhapus
const after = localStorage.getItem('notifications-storage');
console.log('📦 Sesudah cleanup:', after ? JSON.parse(after) : 'null (terhapus)');

// Refresh halaman
console.log('🔄 Silakan refresh halaman (F5) untuk memuat ulang notifikasi dari Supabase');
