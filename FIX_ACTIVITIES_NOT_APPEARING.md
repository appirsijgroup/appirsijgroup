# 🔧 FIX: Data Kegiatan Tidak Muncul di UI

## 🎯 Masalah

Data activities sudah masuk ke Supabase tapi **TIDAK MUNCUL** di halaman "Kegiatan Terjadwal Hari Ini".

## 🔍 Root Cause

**Data Mapping Issue**: Supabase mengembalikan data dengan format **snake_case**, tapi kode mengasumsikan **camelCase**.

### Contoh Problem:
```javascript
// Database (Supabase) - snake_case
{
  id: "xxx",
  name: "Kajian Selasa",
  start_time: "08:00",
  audience_type: "public",
  participant_ids: [],
  zoom_url: null
}

// Kode expects - camelCase
{
  id: "xxx",
  name: "Kajian Selasa",
  startTime: "08:00",      // ❌ Tidak ada!
  audienceType: "public",  // ❌ Tidak ada!
  participantIds: [],      // ❌ Tidak ada!
  zoomUrl: null            // ❌ Tidak ada!
}
```

Karena field tidak ditemukan, filter `activity.audienceType === 'public'` **selalu return false**, sehingga tidak ada activity yang lolos filter!

## ✅ Solusi

**3 fungsi service telah diperbaiki** untuk meng-convert data dari Supabase:

### 1. `getAllActivities()`
```typescript
// SEBELUM: Return raw data dari Supabase ❌
return data || [];

// SESUDAH: Convert ke camelCase ✅
return (data || []).map(dbActivity => ({
    id: dbActivity.id,
    name: dbActivity.name,
    startTime: dbActivity.start_time,      // ✅ Convert
    audienceType: dbActivity.audience_type, // ✅ Convert
    participantIds: dbActivity.participant_ids, // ✅ Convert
    zoomUrl: dbActivity.zoom_url,          // ✅ Convert
    // ... semua field lain
}));
```

### 2. `getActivitiesByDateRange()`
Sama seperti di atas, ditambahkan snake_case → camelCase conversion.

### 3. `getActivitiesForEmployee()`
```typescript
// SEBELUM: Filter langsung dari raw Supabase data ❌
.filter(activity => {
    if (activity.audienceType === 'public') return true; // ❌ undefined!
    // ...
})

// SESUDAH: Convert dulu, baru filter ✅
.map(dbActivity => ({
    // Convert snake_case → camelCase
    audienceType: dbActivity.audience_type,
    // ...
}))
.filter(activity => {
    if (activity.audienceType === 'public') return true; // ✅ Works!
    // ...
})
```

## 🚀 Cara Testing

### **Step 1: Refresh Browser**

1. Buka halaman **`/kegiatan`**
2. **Hard refresh** (Ctrl+Shift+R atau Cmd+Shift+R)
3. Buka **Console DevTools** (F12)

### **Step 2: Cek Console Log**

Anda harusnya melihat log seperti ini:

```
🔍 Loading activities for employee: 6000
✅ Loaded activities: [{ id: "...", name: "Kajian...", ... }]
📊 Total activities: 3
```

### **Step 3: Verify Data Muncul**

Activity yang ada di Supabase harusnya muncul di tabel:
- ✅ Nama activity
- ✅ Tanggal & waktu
- ✅ Tipe activity (Kajian Selasa, Pengajian Persyarikatan, dll)
- ✅ Tombol Hadir / Tidak Hadir

## 🧪 Debug jika Masih Kosong

Jika masih kosong setelah refresh:

### **Cek 1: Apakah Data Ada di Supabase?**

```sql
-- Jalankan di Supabase SQL Editor
SELECT
    id,
    name,
    date,
    start_time,
    end_time,
    activity_type,
    audience_type,
    status
FROM activities
ORDER BY created_at DESC;
```

**Expected**: Ada data yang muncul

### **Cek 2: Apakah audience_type Cocok?**

```sql
-- Cek audience_type dari data Anda
SELECT
    name,
    audience_type,
    activity_type,
    status
FROM activities;
```

**Pastikan**:
- `status = 'scheduled'` (bukan 'cancelled' atau 'postponed')
- `audience_type` ada nilai: 'public', 'rules', atau 'manual'
- `activity_type` ada nilai: 'Umum', 'Kajian Selasa', atau 'Pengajian Persyarikatan'

### **Cek 3: Apakah Employee Match dengan Audience?**

Jika `audience_type = 'rules'`, cek apakah employee match:

```javascript
// Buka Console di browser dan paste ini:
const employee = loggedInEmployee;
console.log('Employee Unit:', employee.unit);
console.log('Employee Bagian:', employee.bagian);
console.log('Employee Hospital ID:', employee.hospitalId);
```

Lalu cek di Supabase:

```sql
-- Cek audience_rules dari activity yang punya audience_type='rules'
SELECT
    name,
    audience_rules
FROM activities
WHERE audience_type = 'rules';
```

Pastikan field employee **match** dengan rules.

### **Cek 4: Apakah Error di Console?**

Buka DevTools → Console → Cari error merah:

常见错误:
- `401 Unauthorized` → RLS policy masalah (sudah difix sebelumnya)
- `42501 violates RLS policy` → Policy belum difix (jalankan fix policy)
- `Network Error` → Cek koneksi internet

## 📋 Checklist

Sebelum consider issue resolved:

- [ ] Data activities ada di Supabase (verified via SQL)
- [ ] `audience_type` terisi dengan benar ('public', 'rules', atau 'manual')
- [ ] `status` = 'scheduled' (bukan 'cancelled'/'postponed')
- [ ] Browser sudah di-hard refresh (Ctrl+Shift+R)
- [ ] Console tidak ada error merah
- [ ] Console log menunjukkan "Total activities: X" dengan X > 0
- [ ] Activity muncul di tabel UI

## 🎯 Quick Fix jika Masih Tidak Muncul

### **Option 1: Set Semua ke Public (Temporary)**

```sql
-- Untuk testing: Set semua activities ke audience_type='public'
UPDATE activities
SET audience_type = 'public'
WHERE status = 'scheduled';

-- Refresh browser, harusnya muncul sekarang
```

### **Option 2: Cek Data Manual di Console**

```javascript
// Buka Console browser, paste ini:
(async () => {
    const { supabase } = await import('/src/lib/supabase.js');
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('status', 'scheduled');

    console.log('Raw data dari Supabase:', data);
    console.log('Error:', error);
})();
```

Lihat apakah `data` ada isinya.

## 📞 Still Not Working?

Jika setelah semua ini masih tidak muncul:

1. **Screenshot console log** (kirim ke saya)
2. **Screenshot Supabase data** (dari Table Editor)
3. **Screenshot halaman UI** (yang kosong)

Saya akan diagnose lebih dalam!

---

**Last Updated:** 2026-01-20
**Status:** ✅ Fixed (snake_case → camelCase conversion added)
**Test:** Please verify and report back
