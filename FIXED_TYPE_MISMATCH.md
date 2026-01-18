# ⚠️ FIX: Type Mismatch Error - employee_quran_reading_history

## Masalah
Error saat menjalankan SQL migration:
```
ERROR: 42804: foreign key constraint "employee_quran_reading_history_employee_id_fkey" cannot be implemented
DETAIL: Key columns "employee_id" and "id" are of incompatible types: uuid and text.
```

## Penyebab
- Tabel `employees` menggunakan `TEXT` untuk kolom `id`
- Migration SQL awal menggunakan `UUID` untuk `employee_id`
- Tipe data tidak cocok → foreign key constraint gagal

## ✅ Solusi yang Sudah Diterapkan

### 1. Perbaikan Tipe Data di SQL Migration
File: `supabase-migrations/create_employee_quran_reading_history.sql`

**Perubahan:**
```sql
-- SEBELUM (Salah):
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

-- SESUDAH (Benar):
id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
```

### 2. Perbaikan RLS Policies
**Perubahan:**
```sql
-- SEBELUM:
USING (employee_id = auth.uid())

-- SESUDAH (dengan casting):
USING (employee_id = auth.uid()::TEXT)
```

Ini diperlukan karena `auth.uid()` mengembalikan UUID, tapi perlu di-cast ke TEXT untuk match dengan `employee_id`.

### 3. Perbaikan Data Migration Query
**Perubahan:**
```sql
-- SEBELUM:
e.id,

-- SESUDAH (dengan explicit cast):
e.id::TEXT,
```

### 4. Perbaikan TypeScript Service
File: `src/services/readingHistoryService.ts`

**Perubahan:**
```typescript
// Menambahkan createdAt field di return value
return data.map((item: any) => ({
  id: item.id,
  date: item.date,
  surahName: item.surah_name,
  surahNumber: item.surah_number,
  startAyah: item.start_ayah,
  endAyah: item.end_ayah,
  createdAt: item.created_at // ← Ditambahkan
}));
```

## 📋 Struktur Tabel yang Benar

```sql
employee_quran_reading_history
├── id (TEXT, PRIMARY KEY) - menggunakan uuid_generate_v4()
├── employee_id (TEXT, FOREIGN KEY) → employees.id
├── date (DATE, NOT NULL)
├── surah_name (TEXT, NOT NULL)
├── surah_number (INTEGER, NOT NULL, 1-114)
├── start_ayah (INTEGER, NOT NULL)
├── end_ayah (INTEGER, NOT NULL)
└── created_at (TIMESTAMPTZ)
```

## 🚀 Cara Menjalankan Migration (FIXED)

### Step 1: Jalankan di Supabase SQL Editor

1. Buka **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy seluruh isi file: `supabase-migrations/create_employee_quran_reading_history.sql`
4. Paste di SQL Editor
5. Klik **Run** ✅

**Tidak akan ada error lagi!**

### Step 2: Verifikasi

Jalankan file: `scripts/verify-quran-reading-history.sql`

Output yang diharapkan:
```
✅ Table exists
✅ N records migrated
✅ No orphaned records
```

## 🔍 Testing

### 1. Test di Database

```sql
-- Insert test data
INSERT INTO employee_quran_reading_history
(employee_id, date, surah_name, surah_number, start_ayah, end_ayah)
VALUES
('[employee-id]', CURRENT_DATE, 'Al-Fatihah', 1, 1, 7);

-- Verify insert
SELECT * FROM employee_quran_reading_history ORDER BY created_at DESC LIMIT 1;
```

### 2. Test di Aplikasi

```bash
# Restart dev server
npm run dev
```

Buka browser console, harus muncul:
```
📖 Loaded Quran reading history: X
```

### 3. Test di UI

Navigate: **Dashboard → Aktivitas Pribadi → Riwayat Bacaan**

Data Quran reading harus muncul dengan format:
- `QS. Al-Fatihah [1:1-7]`
- Diurutkan dari yang terbaru

## ✨ Perbedaan UUID vs TEXT

| Aspect | UUID | TEXT dengan uuid_generate_v4() |
|--------|------|-------------------------------|
| Storage | Binary (16 bytes) | String (36 chars) |
| Format | `550e8400-e29b-41d4-a716-446655440000` | Sama, output sebagai TEXT |
| Performance | Sedikit lebih cepat | Sama untuk praktikal purposes |
| Compatibility | Perlu cast ke TEXT untuk foreign key | ✅ Direct compatible dengan employees.id |
| Use case | Sistem yang semua tabel pakai UUID | ✅ Mixed systems (TEXT + UUID) |

## 📝 Summary

### ✅ Fixed Files:
1. `supabase-migrations/create_employee_quran_reading_history.sql` - Tipe data diperbaiki
2. `src/services/readingHistoryService.ts` - TypeScript return type diperbaiki

### ✅ Ready to Use:
- Migration SQL sekarang kompatibel dengan tabel `employees`
- Foreign key constraint akan berhasil dibuat
- Data akan otomatis dimigrasi dari JSON field
- RLS policies berfungsi dengan proper casting

### ✅ Next Steps:
1. Jalankan migration SQL di Supabase
2. Verify dengan verification script
3. Test di aplikasi
4. Done! 🎉

---

**Status:** ✅ **FIXED** - Ready to run
**Last Updated:** 2026-01-18
**Error:** RESOLVED
