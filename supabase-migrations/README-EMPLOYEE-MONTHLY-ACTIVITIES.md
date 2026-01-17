# Migration: employee_monthly_activities Table

## Masalah
Error ketika mengambil/menyimpan monthly activities:
```
Error getting monthly activities: {}
Error inserting monthly activities: {}
```

## Penyebab
Tabel `employee_monthly_activities` belum ada di database Supabase.

## Solusi

### Langkah 1: Jalankan SQL Migration

Buka **Supabase Dashboard** → **SQL Editor** → **New Query**, lalu jalankan:

```bash
# Copy paste isi file ini:
cat supabase-migrations/create-employee-monthly-activities-table.sql
```

Atau jalankan perintah ini di terminal (jika ada psql client):

```bash
psql -h YOUR_PROJECT_URL -U postgres -d postgres < supabase-migrations/create-employee-monthly-activities-table.sql
```

### Langkah 2: Verifikasi Tabel Terbuat

Jalankan query ini di SQL Editor:

```sql
-- Cek apakah tabel sudah ada
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'employee_monthly_activities';

-- Cek struktur tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_monthly_activities';
```

### Langkah 3: Verifikasi Data Migrasi

Jika sebelumnya ada data di `employees.monthly_activities`, migration akan otomatis memindahkan data ke tabel baru.

```sql
-- Cek jumlah data
SELECT COUNT(*) as total_records
FROM employee_monthly_activities;

-- Lihat contoh data
SELECT employee_id, activities
FROM employee_monthly_activities
LIMIT 5;
```

## Struktur Tabel

```sql
CREATE TABLE public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,           -- Foreign key ke employees.id
    activities JSONB DEFAULT '{}'::jsonb,   -- Data aktivitas bulanan
    updated_at TIMESTAMP WITH TIME ZONE,    -- Timestamp update terakhir
    created_at TIMESTAMP WITH TIME ZONE     -- Timestamp pembuatan
);
```

## RLS Policies

Tabel ini dilindungi dengan Row Level Security (RLS):

1. **Users can view own monthly activities** - User hanya bisa lihat data sendiri
2. **Users can insert own monthly activities** - User hanya bisa insert data sendiri
3. **Users can update own monthly activities** - User hanya bisa update data sendiri
4. **Service role can manage all** - Service role (admin) bisa mengelola semua data

## Error Handling

Kode sekarang memiliki graceful degradation:

- ✅ Jika tabel tidak ada → Return empty object (tidak crash)
- ✅ Logging detail error untuk debugging
- ✅ Menampilkan SQL untuk membuat tabel jika belum ada

## Troubleshooting

### Masalah: "Permission denied"

**Solusi:** Tambahkan policy untuk service role:

```sql
CREATE POLICY "Service role bypass RLS"
ON public.employee_monthly_activities FOR ALL
USING (auth.role() = 'service_role');
```

### Masalah: "Foreign key violation"

**Solusi:** Pastikan `employee_id` di tabel ini cocok dengan `id` di tabel `employees`:

```sql
-- Cek employee yang tidak ada di employees
SELECT employee_id
FROM employee_monthly_activities
WHERE employee_id NOT IN (SELECT id FROM employees);
```

### Masalah: Performance lambat

**Solusi:** Index sudah dibuat, tapi pastikan:

```sql
-- Reindex jika perlu
REINDEX INDEX idx_employee_monthly_activities_employee_id;

-- Analyze table untuk update statistics
ANALYZE public.employee_monthly_activities;
```

## Testing

Setelah migration, test dengan:

1. **Login sebagai user biasa**
2. **Buka halaman Lembar Mutaba'ah**
3. **Cek console** - seharusnya tidak ada error
4. **Isi aktivitas** - data tersimpan ke tabel baru

## Rollback

Jika perlu rollback (kembali ke kolom lama):

```sql
-- Hapus tabel baru
DROP TABLE IF EXISTS public.employee_monthly_activities CASCADE;

-- Kolom lama monthly_activities di employees masih ada
-- (sebaiknya di-backup dulu sebelum di-drop)
```

---

**Dibuat:** 2025-01-17
**Versi:** 1.0.0
