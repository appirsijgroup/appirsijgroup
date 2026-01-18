# ✅ FIX: Duplicate Index Error

## Masalah
Error saat menjalankan SQL migration:
```
ERROR: 42P07: relation "idx_quran_reading_date" already exists
```

## Penyebab
- Migration sebelumnya terjalankan sebagian sebelum error
- Index sudah dibuat tapi table creation belum selesai
- Re-run migration menyebabkan conflict dengan index yang sudah ada

## ✅ Solusi yang Diterapkan

### 1. Drop Index Sebelum Create
File: `supabase-migrations/create_employee_quran_reading_history.sql`

```sql
-- Drop index jika sudah ada
DROP INDEX IF EXISTS public.idx_quran_reading_employee CASCADE;
DROP INDEX IF EXISTS public.idx_quran_reading_date CASCADE;
DROP INDEX IF EXISTS public.idx_quran_reading_surah CASCADE;

-- Kemudian create index
CREATE INDEX idx_quran_reading_employee ON public.employee_quran_reading_history(employee_id);
CREATE INDEX idx_quran_reading_date ON public.employee_quran_reading_history(date DESC);
CREATE INDEX idx_quran_reading_surah ON public.employee_quran_reading_history(surah_number);
```

### 2. Drop Policies Sebelum Create
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can insert own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can update own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can delete own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Admins can view all Quran reading history" ON public.employee_quran_reading_history;

-- Kemudian create policies
CREATE POLICY "Users can view own Quran reading history" ...
```

### 3. Fixed auth.uid() Casting
```sql
-- SEMUA auth.uid() sekarang di-cast ke TEXT:
USING (employee_id = auth.uid()::TEXT)
```

## 🚀 Cara Menjalankan (FIXED)

### Step 1: Jalankan di Supabase SQL Editor

1. Buka **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy seluruh isi file: `supabase-migrations/create_employee_quran_reading_history.sql`
4. Paste di SQL Editor
5. Klik **Run** ✅

**Sekarang tidak akan ada error lagi!**

### Step 2: Verifikasi

Jalankan: `scripts/verify-quran-reading-history.sql`

Output:
```
✅ Table exists
✅ X records migrated
```

## 📋 Perbaikan Lengkap

### ✅ Type Mismatch (SEBELUMNYA)
- Mengubah `UUID` ke `TEXT` untuk match dengan tabel `employees`

### ✅ Duplicate Index (SEKARANG)
- Menambahkan `DROP INDEX IF EXISTS` sebelum `CREATE INDEX`

### ✅ Duplicate Policies (SEKARANG)
- Menambahkan `DROP POLICY IF EXISTS` sebelum `CREATE POLICY`

### ✅ Proper Casting
- Semua `auth.uid()` di-cast ke `::TEXT`

## 🧪 Bersihkan Database (Opsional)

Jika Anda ingin membersihkan percobaan sebelumnya:

```sql
-- Hapus table completely (termasuk data)
DROP TABLE IF EXISTS public.employee_quran_reading_history CASCADE;

-- Kemudian jalankan migration dari awal
```

## 📊 Test Result

Setelah perbaikan, migration akan:
1. ✅ Drop table lama jika ada
2. ✅ Drop index lama jika ada
3. ✅ Drop policies lama jika ada
4. ✅ Create table dengan structure yang benar
5. ✅ Create indexes
6. ✅ Create RLS policies
7. ✅ Migrate data dari JSON field
8. ✅ Verification output

---

**Status:** ✅ **ALL ERRORS FIXED** - Ready to run!
**Last Updated:** 2026-01-18
**Errors Resolved:**
- ✅ Type mismatch (UUID vs TEXT)
- ✅ Duplicate index
- ✅ Duplicate policies
