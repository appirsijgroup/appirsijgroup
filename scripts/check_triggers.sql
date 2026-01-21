-- 🔍 CEK TRIGGER & FUNCTION - Cari yang Menambahkan Field Asing
-- Jalankan di Supabase SQL Editor

-- =====================================================
-- 1. CEK SEMUA TRIGGER di tabel employee_monthly_activities
-- =====================================================

SELECT
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'employee_monthly_activities'
   OR event_object_table = 'employees';

-- =====================================================
-- 2. CEK SEMUA FUNCTION yang mungkin modify activities
-- =====================================================

SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%activity%'
    OR routine_name LIKE '%monthly%'
    OR routine_name LIKE '%employee%'
    OR routine_name LIKE '%update%'
  )
ORDER BY routine_name;

-- =====================================================
-- 3. CEK VIEW yang mungkin menambahkan field
-- =====================================================

SELECT
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%activity%'
    OR table_name LIKE '%attendance%'
    OR table_name LIKE '%unified%'
  )
ORDER BY table_name;

-- =====================================================
-- 4. CEK apakah unified_attendance masih ada
-- =====================================================

SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%unified%'
    OR table_name LIKE '%attendance%'
  )
ORDER BY table_name;

-- =====================================================
-- INSTRUKSI:
-- =====================================================
/*
1. Copy SELURUH script ini
2. Paste di Supabase SQL Editor
3. Klik "Run"
4. Perhatikan hasil setiap section

5. Jika menemukan trigger/function yang mencurigakan:
   - Disabled atau drop jika tidak perlu
   - Modify jika masih diperlukan
*/
