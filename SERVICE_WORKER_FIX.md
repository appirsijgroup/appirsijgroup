# Service Worker Fix untuk PWA Navigation

## Masalah
PWA (Progressive Web App) me-reload seluruh aplikasi setiap kali berpindah menu di mobile/HP, sedangkan di desktop berjalan normal.

## Penyebab
Service worker meng-intercept semua permintaan navigasi (navigation requests) dan melakukan fetch penuh untuk setiap perpindahan halaman. Ini menyebabkan Next.js client-side navigation tidak berfungsi dengan baik di PWA mode.

## Solusi
Memodifikasi service worker (`/public/sw.js`) untuk:
1. **SKIP navigation requests** - Biarkan Next.js menangani navigasi dengan client-side routing
2. Hanya cache static assets (icons, manifest)
3. Tidak intercept page navigation

## Perubahan Kode
```javascript
// 🔥 CRITICAL FIX: Skip ALL navigation requests
const isNavigation = event.request.mode === 'navigate';
if (isNavigation) {
  // Let Next.js handle navigation - don't intercept
  return;
}
```

## Cara Update Service Worker di Browser

Setelah deploy, user perlu mengupdate service worker di browser mereka:

### Android (Chrome)
1. Buka Chrome
2. Kunjungi aplikasi
3. Buka Chrome menu → Settings → Privacy → Clear browsing data
4. Pilih "Cached images and files"
5. Klik "Clear data"
6. Refresh aplikasi

### iOS (Safari)
1. Buka Settings → Safari → Clear History and Website Data
2. Atau: Close app sepenuhnya, buka kembali

### Alternatif: Force Update
Tambahkan ini untuk memaksa update service worker:
```javascript
// Di ServiceWorkerRegister.tsx
navigator.serviceWorker.getRegistration().then(registration => {
  if (registration) {
    registration.update();
  }
});
```

## Testing
Setelah perbaikan:
- ✅ Berpindah menu di PWA tidak me-reload seluruh aplikasi
- ✅ Hanya konten yang berubah (content area), sidebar dan header tetap
- ✅ Navigasi terasa instan seperti desktop version
- ✅ Service worker masih berfungsi untuk offline static assets

## Cache Version
Jika perlu force update semua user:
1. Ubah `CACHE_NAME` di `sw.js` ke versi baru (misal: `'appi-rsi-group-v3'`)
2. Deploy
3. Service worker lama akan dihapus dan diganti yang baru
