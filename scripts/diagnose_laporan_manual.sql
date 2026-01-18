-- ============================================
-- DIAGNOSTIC SCRIPT: Laporan Manual
-- ============================================
-- Jalankan script ini satu per satu untuk menemukan masalah

-- ============================================
-- STEP 1: Cek Kolom Database
-- ============================================
-- Apakah kolom reading_history dan monthly_activities SUDAH ADA?

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('reading_history', 'monthly_activities');

-- ❌ Jika hasilnya kosong: KOLOM BELUM DITAMBAHKAN!
-- ✅ Jika muncul 2 baris: KOLOM SUDAH ADA

-- ============================================
-- STEP 2: Cek Data Spesifik User
-- ============================================
-- Ganti 'YOUR_EMPLOYEE_ID' dengan NIP/ID employee yang bermasalah

-- Cek data reading_history
SELECT
    id,
    name,
    reading_history,
    CASE
        WHEN reading_history IS NULL THEN '❌ KOLOM NULL'
        WHEN reading_history = '[]'::jsonb THEN '⚠️ ARRAY KOSONG'
        ELSE concat('✅ ADA ', jsonb_array_length(reading_history), ' BUKU')
    END as status_reading
FROM employees
WHERE id = 'YOUR_EMPLOYEE_ID';  -- GANTI INI!

-- Cek data monthly_activities
SELECT
    id,
    name,
    monthly_activities,
    CASE
        WHEN monthly_activities IS NULL THEN '❌ KOLOM NULL'
        WHEN monthly_activities = '{}'::jsonb THEN '⚠️ OBJECT KOSONG'
        ELSE concat('✅ ADA DATA')
    END as status_activities
FROM employees
WHERE id = 'YOUR_EMPLOYEE_ID';  -- GANTI INI!

-- ❌ Jika hasilnya NULL atau kosong: DATA TIDAK TERSIMPAN!

-- ============================================
-- STEP 3: Cek Semua User untuk Memastikan
-- ============================================
-- Apakah ADA user yang datanya tersimpan?

SELECT
    COUNT(*) FILTER (WHERE reading_history IS NOT NULL) as with_reading_col,
    COUNT(*) FILTER (WHERE reading_history IS NOT NULL AND jsonb_array_length(reading_history) > 0) as with_books,
    COUNT(*) FILTER (WHERE monthly_activities IS NOT NULL) as with_activities_col,
    COUNT(*) FILTER (WHERE monthly_activities IS NOT NULL AND monthly_activities != '{}'::jsonb) as with_activities,
    COUNT(*) as total_employees
FROM employees;

-- Jika with_books = 0 atau with_activities = 0: TIDAK ADA YANG BERHASIL DISIMPAN!

-- ============================================
-- STEP 4: Cek Error Logs (Recent Operations)
-- ============================================
-- Cek apakah ada error terbaru

SELECT
    id,
    name,
    reading_history,
    monthly_activities,
    updated_at
FROM employees
ORDER BY updated_at DESC
LIMIT 10;

-- Lihat updated_at - apakah berubah setelah klik "Lapor"?

-- ============================================
-- STEP 5: Test Insert Manual (Jika kolom ada)
-- ============================================
-- Coba insert manual untuk memastikan database bisa menerima data

-- Test insert reading_history
UPDATE employees
SET reading_history = '[
    {
        "id": "manual_test_' || EXTRACT(EPOCH FROM NOW())::bigint || '",
        "bookTitle": "TEST BOOK - Manual Insert",
        "pagesRead": "100",
        "dateCompleted": "' || CURRENT_DATE || '"
    }
]'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- GANTI INI!
RETURNING
    id,
    name,
    jsonb_array_length(reading_history) as total_books,
    reading_history;

-- Test insert monthly_activities
UPDATE employees
SET monthly_activities = '{
    "2025-01": {
        "' || EXTRACT(DAY FROM CURRENT_DATE) || '": {
            "test_activity": true
        }
    }
}'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- GANTI INI!
RETURNING
    id,
    name,
    monthly_activities;

-- ✅ Jika berhasil: DATABASE NORMAL
-- ❌ Jika error: ADA MASALAH DI DATABASE

-- ============================================
-- STEP 6: Cek jika ada constraint atau permission issue
-- ============================================

-- Cek RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employees';

-- Jika ada RLS policies: Pastikan user punya permission untuk UPDATE

-- ============================================
-- STEP 7: Cek Type Conversion
-- ============================================
-- Apakah ada masalah konversi data?

SELECT
    id,
    pg_typeof(reading_history) as reading_history_type,
    pg_typeof(monthly_activities) as monthly_activities_type
FROM employees
WHERE id = 'YOUR_EMPLOYEE_ID'  -- GANTI INI!
LIMIT 1;

-- Harusnya: jsonb untuk keduanya

-- ============================================
-- SUMMARY: DIAGNOSIS GUIDE
-- ============================================

-- Jalankan semua query di atas satu per satu, lalu catat hasilnya:

-- STEP 1: Apakah kolom ada?
--   [ ] YA - 2 kolom muncul
--   [ ] TIDAK - Hasil kosong

-- STEP 2: Apakah data user ada?
--   [ ] ADA - Ada buku/aktivitas
--   [ ] TIDAK - NULL atau array/object kosong

-- STEP 3: Apakah ada user lain yang datanya tersimpan?
--   [ ] YA - Ada user dengan data
--   [ ] TIDAK - Semua kosong

-- STEP 4: Apakah updated_at berubah?
--   [ ] YA - Timestamp berubah
--   [ ] TIDAK - Tidak berubah

-- STEP 5: Apakah manual insert berhasil?
--   [ ] YA - Berhasil insert
--   [ ] TIDAK - Error

-- Berdasarkan hasil di atas, kita bisa tahu masalahnya di mana!
