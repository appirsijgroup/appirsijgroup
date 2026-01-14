# Panduan Testing Pengaturan Penguncian Lembar Mutaba'ah

## 📋 Ringkasan Masalah
Sebelumnya, ketika Super Admin mengubah "Pengaturan Penguncian Lembar Mutaba'ah" (Perpekan/Perbulan), perubahan **hanya berlaku untuk Super Admin tersebut**, sedangkan user lain tidak mendapatkan perubahan.

## ✅ Perbaikan yang Dilakukan

### 1. **Realtime Updates**
- Menambahkan realtime subscription menggunakan Supabase Realtime
- Semua user akan mendapatkan update **secara otomatis** tanpa perlu refresh halaman
- Ketika Super Admin mengubah setting, semua user yang sedang online akan langsung mendapatkan update

### 2. **Forced Load from Supabase**
- Setiap kali user membuka aplikasi, setting akan di-load dari Supabase
- Nilai dari localStorage HANYA digunakan sebagai fallback sementara
- Nilai dari Supabase **selalu menjadi source of truth**

### 3. **Detailed Logging**
- Menambahkan logging detail untuk debugging
- Memudahkan tracking flow data dari Supabase ke aplikasi

## 🧪 Langkah-langkah Testing

### STEP 1: Enable Realtime di Supabase

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Jalankan query berikut:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
```

3. Verifikasi realtime sudah enabled:
```sql
SELECT
    schemaname,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
        ) THEN '✅ Realtime Enabled'
        ELSE '❌ Realtime NOT Enabled'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'app_settings';
```

### STEP 2: Cek Setting Saat Ini di Supabase

1. Di **Supabase SQL Editor**, jalankan:
```sql
SELECT
    key,
    value,
    description,
    updated_at,
    updated_by
FROM app_settings
WHERE key = 'mutabaah_locking_mode';
```

2. Catat nilai `value` saat ini (seharusnya 'weekly' atau 'monthly')

### STEP 3: Testing sebagai Super Admin

1. **Buka Browser A** (Chrome/Edge)
2. Login sebagai **Super Admin**
3. Buka **Developer Tools** → **Console** tab
4. Pergi ke halaman **Admin Dashboard**
5. Cari logs dengan emoji:
   - 🔄 = Loading dari Supabase
   - 🔔 = Subscribe to realtime
   - 📡 = Realtime subscription status
   - 💾 = Hydration dari localStorage
   - 📊 = Current state

6. Ubah **Pengaturan Penguncian Lembar Mutaba'ah**:
   - Dari "Perpekan" ke "Perbulanan" atau sebaliknya
7. Cek console, seharusnya ada logs:
   ```
   🔄 [MutabaahStore] setMutabaahLockingMode called with: monthly isSuperAdmin: true
   🔄 [AppSettingsService] Updating app setting: mutabaah_locking_mode = monthly
   ✅ [AppSettingsService] App setting updated successfully: mutabaah_locking_mode = monthly
   ✅ [MutabaahStore] Mutabaah locking mode saved to Supabase: monthly
   ```

### STEP 4: Verifikasi di Supabase

1. Kembali ke **Supabase SQL Editor**
2. Jalankan query dari STEP 2 lagi
3. Pastikan nilai `value` sudah berubah
4. Catat juga `updated_at` dan `updated_by`

### STEP 5: Testing sebagai User Biasa (Realtime Update)

1. **Buka Browser B** (Firefox/Safari atau Incognito mode)
2. Login sebagai **User Biasa** (bukan Super Admin)
3. Buka **Developer Tools** → **Console**
4. Pergi ke halaman **Aktivitas Bulanan** (`/aktivitas-bulanan`)
5. Cek console untuk logs inisial:
   ```
   🔄 [MutabaahStore] Loading mutabaah locking mode from Supabase...
   📥 [MutabaahStore] Received value from Supabase: monthly
   ✅ [MutabaahStore] Updating mutabaah locking mode to: monthly
   📊 [MutabaahStore] Current state: monthly
   🔔 [MutabaahStore] Subscribing to mutabaah settings realtime updates...
   📡 [MutabaahStore] Realtime subscription status: SUBSCRIBED
   ```

6. **Sambil tetap di halaman ini**, kembali ke **Browser A** (Super Admin)
7. Ubah setting lagi (dari "Perbulanan" ke "Perpekan")
8. **SEGERA** cek console di **Browser B** (User Biasa)
9. Dalam hitungan detik, seharusnya muncul log:
   ```
   📢 [MutabaahStore] Mutabaah setting changed via realtime: {old: ..., new: ...}
   ✅ [MutabaahStore] Updating mutabaah locking mode to: weekly
   📊 [MutabaahStore] Current state after realtime update: weekly
   ```

10. **TANPA REFRESH** halaman, cobalah isi aktivitas di minggu-minggu sebelumnya
    - Jika mode = **weekly**: Minggu lalu harus locked
    - Jika mode = **monthly**: Minggu lalu harus masih bisa di-edit

### STEP 6: Testing Persistensi (Refresh Halaman)

1. Di **Browser B** (User Biasa), tekan **F5** untuk refresh halaman
2. Cek console, seharusnya logs menunjukkan:
   ```
   💾 [MutabaahStore] Hydration complete. State from localStorage: weekly
   🔄 [MutabaahStore] Loading mutabaah locking mode from Supabase...
   📥 [MutabaahStore] Received value from Supabase: weekly
   ✅ [MutabaahStore] Updating mutabaah locking mode to: weekly
   📊 [MutabaahStore] Current state: weekly
   ```

3. Pastikan nilai yang digunakan adalah nilai dari **Supabase**, bukan dari localStorage

## 🐛 Troubleshooting

### Jika user lain tidak mendapatkan update secara realtime:

**Cek 1: Realtime enabled?**
```sql
-- Jalankan di Supabase SQL Editor
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings';
```
Jika tidak ada hasil, jalankan:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
```

**Cek 2: Apakah user subscribe berhasil?**
- Cek console browser user biasa
- Cari log: `📡 [MutabaahStore] Realtime subscription status:`
- Status harus `SUBSCRIBED`
- Jika `CHANNEL_ERROR`, ada masalah koneksi

**Cek 3: Apakah update masuk ke Supabase?**
- Cek console browser Super Admin
- Cari log: `✅ [AppSettingsService] App setting updated successfully`
- Verifikasi di Supabase SQL Editor

### Jika setting tidak tersimpan ke Supabase:

**Cek 1: Apakah user benar-benar Super Admin?**
```sql
-- Jalankan di Supabase SQL Editor
SELECT id, name, role FROM employees WHERE id = '<USER_ID>';
```
Role harus `super-admin`

**Cek 2: Apakah RLS policy mengizinkan update?**
```sql
-- Jalankan di Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'app_settings';
```
Pastikan ada policy: `Super-admin can update app settings`

## 📊 Expected Behavior

### ✅ Behavior yang BENAR:
1. Super Admin mengubah setting → Tersimpan ke Supabase ✅
2. Super Admin's browser → State terupdate ✅
3. User biasa browser yang sedang online → State terupdate via realtime **TANPA REFRESH** ✅
4. User biasa yang membuka aplikasi baru → Mendapat nilai terbaru dari Supabase ✅

### ❌ Behavior yang SALAH (TIDAK BOLEH TERJADI):
1. Super Admin mengubah setting → Hanya Super Admin yang terupdate ❌
2. User biasa harus refresh halaman untuk mendapat update ❌
3. User biasa melihat nilai lama dari localStorage ❌
4. Setting tidak tersimpan ke Supabase ❌

## 📝 Script Testing Lengkap

File script SQL tersedia di:
```
scripts/check-mutabaah-settings.sql
```

Jalankan script ini di Supabase SQL Editor untuk melakukan semua cek sekaligus.

---

## 🎯 Kesimpulan

Dengan perbaikan ini:
- ✅ Setting disimpan ke **tabel `app_settings`** di Supabase
- ✅ Semua user **membaca setting dari Supabase** (source of truth)
- ✅ Perubahan setting **dipropagasi via realtime** ke semua user yang online
- ✅ User yang baru membuka aplikasi **mendapat nilai terbaru**
- ✅ Tidak ada lagi masalah cached values di localStorage

**Setting ini sekarang benar-benar GLOBAL dan berlaku untuk SEMUA user!** 🎉
