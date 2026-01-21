# 🔧 Panduan Mengatasi Data Masih Muncul Setelah Dihapus

## Masalah
Data di tabel `employee_monthly_activities` sudah dihapus, namun masih muncul di aplikasi meskipun cache browser sudah dibersihkan.

## Penyebab

Ada **3 layer cache** di aplikasi ini:

### 1. **React Query Cache (TanStack Query)**
- Lokasi: `src/lib/react-query/QueryProvider.tsx:24-35`
- `staleTime: 5 menit` - Data dianggap fresh selama 5 menit
- `gcTime: 30 menit` - Cache disimpan di memory 30 menit
- `refetchOnMount: false` - Tidak refetch otomatis saat reload

### 2. **Service Worker PWA Cache**
- Lokasi: `/public/sw.js`
- Menyimpan HTTP response cache untuk PWA offline support

### 3. **Browser Cache**
- Browser's native cache (localStorage, sessionStorage, HTTP cache)

---

## 🔧 Solusi

### Option 1: Menggunakan Debug Tools (RECOMMENDED)

**Untuk Development Mode:**

1. Jalankan aplikasi di development mode:
```bash
npm run dev
```

2. Buka aplikasi di browser
3. Di pojok kanan bawah akan muncul **Cache Debug Tools** panel
4. Klik tombol sesuai kebutuhan:
   - **📊 Debug Cache** - Melihat status semua cache
   - **🔄 Clear React Query** - Hanya clear React Query cache
   - **🔧 Clear SW Cache** - Hanya clear Service Worker cache
   - **🗑️ Clear Storage** - Hanya clear localStorage/sessionStorage
   - **🧹 CLEAR ALL** - Clear SEMUA cache dan reload halaman

### Option 2: Manual Browser DevTools

**Untuk Production Mode:**

1. Buka **Browser DevTools**:
   - Chrome/Edge: `F12` atau `Ctrl+Shift+I`
   - Firefox: `F12` atau `Ctrl+Shift+K`

2. **Clear React Query Cache**:
   - Buka tab **Console**
   - Jalankan:
   ```javascript
   // Clear React Query cache
   window.location.reload()
   ```

3. **Clear Service Worker Cache**:
   - Buka tab **Application**
   - Di sidebar: **Storage** → **Service Workers**
   - Klik **Unregister** untuk setiap service worker
   - Buka **Storage** → **Cache Storage**
   - Klik kanan pada setiap cache → **Delete**

4. **Clear Browser Storage**:
   - Buka tab **Application**
   - Di sidebar: **Storage**
   - Klik **Clear site data**
   - ATAU manual:
     - **Local Storage** → Klik kanan → **Clear**
     - **Session Storage** → Klik kanan → **Clear**

5. **Hard Refresh Browser**:
   - Windows/Linux: `Ctrl + Shift + R` atau `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

### Option 3: Programmatic Clear (Untuk Production Code)

Jika ingin menambahkan tombol "Clear Cache" di aplikasi production:

```typescript
import { clearAllCache } from '@/lib/clearCache';
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleClearCache = async () => {
    if (confirm('Hapus semua cache?')) {
      await clearAllCache(queryClient, true);
    }
  };

  return (
    <button onClick={handleClearCache}>
      Clear Cache
    </button>
  );
}
```

---

## 🔍 Memverifikasi Cache Sudah Bersih

Setelah membersihkan cache, verifikasi dengan:

### 1. Check Database:
```sql
-- Pastikan data memang sudah kosong
SELECT * FROM employee_monthly_activities;
```

### 2. Check Network Requests:
- Buka **DevTools** → **Network** tab
- Refresh halaman
- Pastikan request ke API mengembalikan data kosong

### 3. Check React Query DevTools:
- Di development mode, React Query DevTools akan muncul
- Klik icon React Query di pojok kiri bawah
- Pastikan query `monthlyActivities` sudah kosong/invalidated

---

## 🛡️ Pencegahan (Best Practices)

Agar tidak terjadi lagi:

### 1. Invalidate Cache Setelah Database Changes

Setiap kali data diubah/dihapus di database, **selalu invalidate query cache**:

```typescript
// Setelah delete/update database
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate query untuk fetch data terbaru
queryClient.invalidateQueries({ queryKey: ['monthlyActivities', employeeId] });
```

### 2. Refetch On Mount (Untuk Data yang Sering Berubah)

Ubah konfigurasi React Query di `src/lib/react-query/QueryProvider.tsx`:

```typescript
defaultOptions: {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 menit
    gcTime: 1000 * 60 * 30,   // 30 menit

    // Untuk data yang sering berubah, enable refetch on mount:
    refetchOnMount: true, // ← Ubah dari false ke true
  }
}
```

### 3. Gunakan Optimistic Updates dengan Benar

Pastikan `onSuccess` selalu invalidate cache:

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['monthlyActivities'] });
  }
});
```

---

## 📝 FAQ

### Q: Kenapa harus clear 3 cache?
A: Karena ketiganya menyimpan data yang berbeda:
- **React Query**: Cache data API di memory browser
- **Service Worker**: Cache HTTP response untuk offline support
- **Browser Cache**: Native cache browser

### Q: Apakah aman menghapus semua cache?
A: Ya, cache akan otomatis ter-rebuild saat fetch data berikutnya

### Q: Berapa sering harus clear cache?
A: Tidak perlu sering. Cukup saat ada perubahan data besar di database

### Q: Apakah data user akan hilang?
A: Tidak, data disimpan di database server, bukan di cache. Cache hanya untuk optimasi performa

---

## 📚 Referensi

- **TanStack Query Cache**: https://tanstack.com/query/latest/docs/reference/QueryClient
- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Clear Site Data**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Clear-Site-Data

---

## 🚀 Quick Checklist

Jika data masih muncul setelah dihapus dari database:

- [ ] Clear React Query cache (via DevTools atau programmatic)
- [ ] Unregister Service Worker
- [ ] Clear Cache Storage
- [ ] Clear localStorage & sessionStorage
- [ ] Hard refresh browser (`Ctrl + Shift + R` / `Cmd + Shift + R`)
- [ ] Verify di DevTools → Network tab
- [ ] Verify di database (SELECT query)
- [ ] Jika masih muncul, coba di Incognito/Private mode

---

*Dibuat untuk troubleshooting cache issue pada aplikasi APPI*
