# Setup Tabel employee_quran_reading_history

## Ringkasan
Dokumentasi ini menjelaskan cara setup tabel `employee_quran_reading_history` untuk menampilkan riwayat bacaan Quran karyawan secara realtime dari database.

## Apa yang Sudah Dikerjakan

### 1. ✅ Service Layer Sudah Ada
File: `src/services/readingHistoryService.ts`

Fungsi yang tersedia:
- `getQuranReadingHistory(userId)` - Mengambil riwayat bacaan Quran dari database
- `addQuranReadingHistory()` - Menambah riwayat bacaan baru
- `deleteQuranReadingHistory()` - Menghapus riwayat bacaan

### 2. ✅ UI Sudah Diupdate
File: `src/components/AktivitasPribadi.tsx`

Komponen `RiwayatBacaan` sekarang mengambil data dari:
1. **employee_quran_reading_history table** (database) - PRIORITAS UTAMA
2. quran_submissions table (database)
3. employee.quranReadingHistory JSON field (fallback/legacy)

### 3. ✅ SQL Migration File Dibuat
File: `supabase-migrations/create_employee_quran_reading_history.sql`

## Langkah-langkah Setup Database

### Step 1: Jalankan SQL Migration di Supabase

1. Buka **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy seluruh isi file: `supabase-migrations/create_employee_quran_reading_history.sql`
4. Paste di SQL Editor
5. Klik **Run** atau tekan `Ctrl+Enter`

### Step 2: Verifikasi Setup

1. Copy isi file: `scripts/verify-quran-reading-history.sql`
2. Paste di SQL Editor
3. Run untuk verifikasi

Output yang diharapkan:
```
table_name                          | status
employee_quran_reading_history      | ✅ Table exists

Total Records                       | count
total_quran_reading_records         | [jumlah data]
total_employees_with_quran_reading  | [jumlah employee]
```

## Struktur Tabel

```sql
employee_quran_reading_history
├── id (UUID, Primary Key)
├── employee_id (UUID, Foreign Key → employees.id)
├── date (DATE) - Tanggal baca
├── surah_name (TEXT) - Nama surah
├── surah_number (INTEGER) - Nomor surah (1-114)
├── start_ayah (INTEGER) - Ayat mulai
├── end_ayah (INTEGER) - Ayat selesai
└── created_at (TIMESTAMPTZ)
```

## Cara Kerja Aplikasi

### Data Flow

1. **Load Data**
   - Komponen `AktivitasPribadi` → `RiwayatBacaan`
   - Memanggil `getQuranReadingHistory(employeeId)` dari `readingHistoryService`
   - Service mengambil data dari tabel `employee_quran_reading_history`
   - Data ditampilkan di UI

2. **Fallback Logic**
   Jika tabel tidak ada, service akan otomatis:
   - Mengambil data dari `employee.quran_reading_history` JSON field
   - Log ini ada di service untuk compatibility

3. **Display Priority**
   ```
   employee_quran_reading_history (DB table)
   ↓
   quran_submissions (DB table)
   ↓
   employee.quranReadingHistory (JSON fallback)
   ```

### RLS Policies

Tabel dilengkapi Row Level Security (RLS):
- ✅ User bisa lihat riwayat sendiri
- ✅ User bisa tambah riwayat sendiri
- ✅ User bisa edit riwayat sendiri
- ✅ User bisa hapus riwayat sendiri
- ✅ Admin bisa lihat semua riwayat

## Data Migration

### Dari JSON Field ke Table

SQL migration sudah otomatis memindahkan data dari:
```sql
employees.quran_reading_history (JSON)
↓
employee_quran_reading_history (Table)
```

Query migrasi:
```sql
INSERT INTO employee_quran_reading_history (...)
SELECT
    e.id,
    (item->>'date')::DATE,
    (item->>'surahName')::TEXT,
    (item->>'surahNumber')::INTEGER,
    (item->>'startAyah')::INTEGER,
    (item->>'endAyah')::INTEGER,
    ...
FROM employees e,
     jsonb_array_elements(e.quran_reading_history) AS item
```

## Testing

### 1. Test Data Retrieval

Buka browser console di aplikasi:
```javascript
// Harus muncul log:
📖 Loaded Quran reading history: [jumlah]
```

### 2. Test di UI

Navigate ke: **Dashboard → Aktivitas Pribadi → Riwayat Bacaan**

Harus menampilkan:
- Daftar bacaan Quran
- Dengan format: `QS. [Nama Surah] [Nomor:StartAyah-EndAyah]`
- Diurutkan dari yang terbaru

### 3. Test Realtime

Tambah data baru di database:
```sql
INSERT INTO employee_quran_reading_history
(employee_id, date, surah_name, surah_number, start_ayah, end_ayah)
VALUES
('[employee-id]', CURRENT_DATE, 'Al-Fatihah', 1, 1, 7);
```

Refresh UI - data baru harus muncul!

## Troubleshooting

### Error: Table doesn't exist
**Solution:** Jalankan `create_employee_quran_reading_history.sql`

### Error: Permission denied
**Solution:** Pastikan RLS policies sudah di-setup

### Data tidak muncul di UI
**Solutions:**
1. Check browser console untuk error
2. Verifikasi data ada di database dengan `verify-quran-reading-history.sql`
3. Restart dev server: `npm run dev`

### Data duplicate muncul
**Info:** Normal ada 3 sumber data:
1. `employee_quran_reading_history` table
2. `quran_submissions` table
3. `employee.quranReadingHistory` JSON field

UI sudah punya logic untuk deduplicate berdasarkan `date` dan `detail`

## Maintenance

### Cleanup Legacy Data (Optional)

Setelah migrasi berhasil, Anda bisa menghapus JSON field lama:
```sql
-- Backup dulu
ALTER TABLE employees RENAME COLUMN quran_reading_history TO quran_reading_history_backup;

-- Test beberapa hari
-- Jika tidak ada masalah, drop column:
-- ALTER TABLE employees DROP COLUMN quran_reading_history_backup;
```

### Performance

Index sudah di-setup untuk query cepat:
- `idx_quran_reading_employee` - berdasarkan employee_id
- `idx_quran_reading_date` - berdasarkan date DESC
- `idx_quran_reading_surah` - berdasarkan surah_number

## Files yang Diupdate

1. ✅ `src/services/readingHistoryService.ts` - Service functions
2. ✅ `src/components/AktivitasPribadi.tsx` - UI component
3. ✅ `supabase-migrations/create_employee_quran_reading_history.sql` - DB migration
4. ✅ `scripts/verify-quran-reading-history.sql` - Verification script

## Next Steps

1. Jalankan SQL migration di Supabase
2. Verifikasi dengan verification script
3. Test di aplikasi
4. Done! 🎉

---

**Status:** ✅ Ready to deploy
**Last Updated:** 2026-01-18
