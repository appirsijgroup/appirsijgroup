-- 🔍 CEK TRIGGER, VIEW, DAN FUNCTION
-- Cari apa yang membuat data kotor kembali

-- =====================================================
-- 1. CEK TRIGGERS
-- =====================================================

SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'employee_monthly_activities'
   OR event_object_table = 'employees';

-- =====================================================
-- 2. CEK VIEWS
-- =====================================================

SELECT
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%attendance%'
    OR table_name LIKE '%activity%'
    OR table_name LIKE '%monthly%'
  )
ORDER BY table_name;

-- =====================================================
-- 3. CEK FUNCTIONS
-- =====================================================

SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%attendance%'
    OR routine_name LIKE '%activity%'
    OR routine_name LIKE '%monthly%'
    OR routine_name LIKE '%sync%'
  )
ORDER BY routine_name;

-- =====================================================
-- 4. CEK DATA DI UNIFIED_ATTENDANCE
-- =====================================================

-- Lihat struktur unified_attendance
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'unified_attendance'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Lihat sample data untuk employee 6000
SELECT *
FROM unified_attendance
WHERE employee_id = '6000'
LIMIT 10;

-- Count data per employee
SELECT
    employee_id,
    COUNT(*) as total_records
FROM unified_attendance
GROUP BY employee_id
ORDER BY total_records DESC
LIMIT 10;

-- =====================================================
-- 5. CEK ADA DATA APA SAJA UNTUK EMPLOYEE 6000
-- =====================================================

SELECT
    field_name,
    field_type,
    COUNT(*) as total
FROM unified_attendance
WHERE employee_id = '6000'
GROUP BY field_name, field_type
ORDER BY total DESC;

/*
INSTRUKSI:
1. Run query di atas SATU PER SATU
2. Kirim hasilnya ke saya
3. Saya akan cari tahu apa yang menyebabkan data kotor

🔍 Yang kita cari:
- Trigger yang otomatis update employee_monthly_activities
- View yang menggabungkan unified_attendance
- Function yang sync data
- Data di unified_attendance untuk employee 6000

*/
