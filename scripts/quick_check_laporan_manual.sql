-- ============================================
-- QUICK CHECK: Laporan Manual Data
-- ============================================

-- 1. CEK KOLOM (PENTING!)
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 1: CHECKING COLUMNS...';

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'reading_history'
    ) THEN
        RAISE NOTICE '✅ reading_history column EXISTS';
    ELSE
        RAISE NOTICE '❌ reading_history column MISSING!';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'monthly_activities'
    ) THEN
        RAISE NOTICE '✅ monthly_activities column EXISTS';
    ELSE
        RAISE NOTICE '❌ monthly_activities column MISSING!';
    END IF;

    RAISE NOTICE '===========================================';
END $$;

-- 2. LIHAT STRUKTUR KOLOM
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('reading_history', 'monthly_activities', 'todo_list');

-- 3. CEK DATA SEMUA EMPLOYEE
SELECT
    COUNT(*) as total_employees,
    COUNT(*) FILTER (WHERE reading_history IS NOT NULL) as has_reading_col,
    COUNT(*) FILTER (WHERE reading_history IS NOT NULL AND jsonb_array_length(reading_history) > 0) as has_books,
    COUNT(*) FILTER (WHERE monthly_activities IS NOT NULL) as has_activities_col,
    COUNT(*) FILTER (WHERE monthly_activities IS NOT NULL AND monthly_activities != '{}'::jsonb) as has_activities,
    COUNT(*) FILTER (WHERE todo_list IS NOT NULL) as has_todo_col,
    COUNT(*) FILTER (WHERE todo_list IS NOT NULL AND jsonb_array_length(todo_list) > 0) as has_todos
FROM employees;

-- 4. CEK 10 EMPLOYEE TERAKHIR YANG DIUPDATE
SELECT
    id,
    name,
    CASE
        WHEN reading_history IS NOT NULL THEN concat(jsonb_array_length(reading_history), ' books')
        ELSE 'No books'
    END as books,
    CASE
        WHEN monthly_activities IS NOT NULL AND monthly_activities != '{}'::jsonb THEN 'Has activities'
        ELSE 'No activities'
    END as activities,
    updated_at
FROM employees
ORDER BY updated_at DESC
LIMIT 10;

-- 5. CEK DATA SPESIFIK USER (GANTI ID NYA)
-- Uncomment dan ganti YOUR_EMPLOYEE_ID dengan ID yang bermasalah

/*
SELECT
    id,
    name,
    reading_history,
    monthly_activities,
    todo_list,
    created_at,
    updated_at
FROM employees
WHERE id = 'YOUR_EMPLOYEE_ID';
*/

-- 6. TAMBAHKAN KOLOM JIKA BELUM ADA (AUTO-FIX)
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STEP 2: ADDING MISSING COLUMNS...';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'reading_history'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN reading_history JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ ADDED: reading_history column';
    ELSE
        RAISE NOTICE 'ℹ️ EXISTS: reading_history column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'monthly_activities'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN monthly_activities JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ ADDED: monthly_activities column';
    ELSE
        RAISE NOTICE 'ℹ️ EXISTS: monthly_activities column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'todo_list'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN todo_list JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ ADDED: todo_list column';
    ELSE
        RAISE NOTICE 'ℹ️ EXISTS: todo_list column';
    END IF;

    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ ALL COLUMNS VERIFIED/ADDED!';
    RAISE NOTICE '===========================================';
END $$;

-- 7. VERIFIKASI AKHIR
SELECT
    'FINAL VERIFICATION' as status,
    column_name,
    data_type,
    'OK' as condition
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('reading_history', 'monthly_activities', 'todo_list')
ORDER BY column_name;
