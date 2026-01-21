-- 🔍 CEK STRUKTUR TABEL YANG BENAR
-- Cari nama kolom yang sebenarnya

-- =====================================================
-- 1. LIHAT SEMUA TABEL
-- =====================================================

SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%attendance%'
    OR table_name LIKE '%activity%'
    OR table_name LIKE '%monthly%'
  )
ORDER BY table_name;

-- =====================================================
-- 2. CEK STRUKTUR UNIFIED_ATTENDANCE
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'unified_attendance'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. LIHAT SAMPLE DATA UNIFIED_ATTENDANCE
-- =====================================================

SELECT *
FROM unified_attendance
LIMIT 5;

-- =====================================================
-- 4. CEK STRUKTUR EMPLOYEE_MONTHLY_ACTIVITIES
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_monthly_activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 5. LIHAT SAMPLE DATA MONTHLY_ACTIVITIES
-- =====================================================

SELECT employee_id, activities
FROM employee_monthly_activities
LIMIT 5;

/*
INSTRUKSI:
1. Jalankan semua query di atas
2. Lihat struktur yang sebenarnya
3. Kirim hasilnya ke saya
4. Saya akan perbaiki query cleanup berdasarkan struktur yang benar

🔍 Yang kita cari:
- Nama kolom yang sebenarnya (mungkin user_id, bukan employee_id)
- Struktur tabel unified_attendance
- Sample data untuk memahami formatnya
*/
