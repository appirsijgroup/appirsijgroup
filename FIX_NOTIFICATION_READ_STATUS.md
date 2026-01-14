# 🛠️ FIX: Notification yang Sudah Dibaca Muncul Lagi Setelah Refresh

## 🔍 Masalah

**Gejala:**
- User membaca notifikasi (klik notifikasi)
- Indikator "unread" hilang di panel notifikasi
- Tapi setelah refresh halaman, notifikasi muncul lagi sebagai "unread" ❌

**Penyebab Utama:**
Masalahnya ada di **Supabase RLS (Row Level Security) Policy** yang mencegah update kolom `is_read`.

Dari log browser:
```
📤 Supabase Response: {data: Array(0), error: null}
❌ No rows updated! Notification not found or already updated.
```

Artinya:
1. ✅ Frontend berhasil mengupdate local state (`isRead: true`)
2. ❌ Supabase **GAGAL** mengupdate ke database (0 rows affected)
3. Setelah refresh, data di-overwrite lagi dari Supabase yang masih `is_read: false`

---

## ✅ Solusi (Langkah demi Langkah)

### 📋 Langkah 1: Jalankan SQL Script di Supabase

1. Buka **Supabase Dashboard** → https://supabase.com/dashboard
2. Pilih project Anda
3. Pergi ke menu **SQL Editor** (di sidebar kiri)
4. Klik **New Query**
5. Copy seluruh isi file `fix-notification-rls.sql`
6. Paste ke SQL Editor
7. Klik **Run** ▶️ (atau tekan `Ctrl+Enter`)

**Apa yang dilakukan script ini:**
- ✅ Drop RLS policies yang lama (yang bermasalah)
- ✅ Create RLS policies yang baru dan BENAR
- ✅ Buat RPC function `mark_notification_read()` sebagai fallback
- ✅ Buat RPC function `mark_all_notifications_read()` untuk mark all as read
- ✅ Grant permission ke authenticated users

---

### 📋 Langkah 2: Verifikasi dengan Debug Script

Setelah menjalankan SQL script, verifikasi dengan debug script:

1. Buka aplikasi dan **login**
2. Buka **Developer Tools** → **Console** (F12)
3. Copy seluruh isi file `debug-notification-exists.js`
4. Paste ke Console
5. Tekan **Enter**

**Yang harus terjadi:**
```javascript
✅ Notification DITEMUKAN di database: {...}
✅ Berhasil mengupdate notification: [{id: "...", is_read: true}]
```

Jika masih ada error, berarti RLS policy belum berfungsi dengan benar.

---

### 📋 Langkah 3: Test Aplikasi

1. **Buka Notification Panel** (klik icon lonceng)
2. **Klik salah satu notifikasi** yang masih unread
3. Lihat di Console, seharusnya:
   ```
   📖 Marking notification as read: [ID]
   ✅ Local state updated - isRead set to true for: [ID]
   🔄 Syncing to Supabase...
   ✅ Successfully synced to Supabase: [ID]
   ```
4. **Refresh halaman** (F5)
5. **Buka Notification Panel lagi**
6. ✅ Notifikasi yang sudah diklik harus **TIDAK muncul lagi sebagai unread**

---

## 🔧 Troubleshooting

### Masalah 1: "No rows updated! Notification not found or already updated."

**Penyebab:**
- Notification tidak ada di database Supabase
- Atau RLS policy mencegah update

**Solusi:**
1. Jalankan `debug-notification-exists.js` di Console
2. Jika notification TIDAK ditemukan, berarti:
   - Notification hanya ada di localStorage/frontend
   - Coba refresh dan tunggu data sinkron dengan Supabase
3. Jika notification DITEMUKAN tapi tidak bisa di-update:
   - Pastikan SQL script `fix-notification-rls.sql` sudah dijalankan
   - Cek di Supabase Dashboard → Authentication → Users
   - Pastikan `user_id` di tabel notifications cocok dengan `id` di tabel users

---

### Masalah 2: "Permission denied for table notifications"

**Penyebab:**
- RLS policy belum dibuat atau salah

**Solusi:**
1. Pastikan script `fix-notification-rls.sql` sudah dijalankan
2. Cek apakah policies sudah dibuat:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```
3. Hasil harusnya ada 6 policies:
   - Users can insert their own notifications
   - Users can view their own notifications
   - Users can update their own notifications
   - Users can delete their own notifications
   - Enable all for service_role

---

### Masalah 3: Notification muncul lagi setelah refresh

**Penyebab:**
- localStorage masih menyimpan data lama

**Solusi:**
1. Buka file `clear-notifications-storage.js`
2. Copy seluruh isinya
3. Paste di Console browser
4. Tekan Enter
5. Refresh halaman (F5)

---

## 📊 Verifikasi Akhir

Setelah semua langkah di atas, berikut yang harus terjadi:

| Kondisi | Expected | Actual |
|---------|----------|--------|
| Klik notifikasi | Indikator unread hilang | ✅ |
| Cek Console | `Successfully synced to Supabase` | ✅ |
| Cek Database (via Supabase Dashboard) | `is_read = true` | ✅ |
| Refresh halaman | Notifikasi tetap read | ✅ |
| Buka notification panel | Tidak muncul sebagai unread | ✅ |

---

## 🎯 Summary

**Problem:** Supabase RLS Policy mencegah update kolom `is_read`
**Solution:** Jalankan `fix-notification-rls.sql` di Supabase SQL Editor
**Verification:** Gunakan `debug-notification-exists.js` di Console browser

---

## 📞 Jika Masih Ada Masalah

Jika setelah semua langkah di atas masih ada masalah:

1. **Cek log di Console browser** - kirim log lengkapnya
2. **Cek Supabase Dashboard:**
   - Database → notifications → lihat apakah data ada
   - Authentication → Users → lihat user ID yang benar
3. **Cek RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```
4. **Test langsung di Supabase SQL Editor:**
   ```sql
   UPDATE notifications
   SET is_read = true
   WHERE id = 'YOUR_NOTIFICATION_ID'
   RETURNING *;
   ```

---

## 📝 Files yang Dibuat

1. **fix-notification-rls.sql** - SQL script untuk fix RLS policies
2. **debug-notification-exists.js** - Debug script untuk cek notification di database
3. **clear-notifications-storage.js** - Script untuk bersihkan localStorage

Pastikan ketiga file ini sudah digunakan sesuai instruksi di atas! 🚀
