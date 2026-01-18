-- =====================================================
-- VERIFICATION: employee_quran_reading_history
-- Purpose: Verify Quran reading history data and table structure
-- =====================================================

-- 1. Check if table exists
SELECT
    'employee_quran_reading_history' as table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'employee_quran_reading_history'
            AND table_schema = 'public'
        ) THEN '✅ Table exists'
        ELSE '❌ Table missing - Run create_employee_quran_reading_history.sql'
    END as status;

-- 2. Check table structure
SELECT
    'Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employee_quran_reading_history'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check total records
SELECT
    'Total Records' as info,
    COUNT(*) as total_quran_reading_records,
    COUNT(DISTINCT employee_id) as total_employees_with_quran_reading
FROM public.employee_quran_reading_history;

-- 4. Check recent Quran reading history (last 10 entries)
SELECT
    'Recent Quran Reading History' as info,
    qrh.employee_id,
    e.name as employee_name,
    qr.date,
    qr.surah_name,
    qr.surah_number,
    qr.start_ayah,
    qr.end_ayah,
    qr.created_at
FROM public.employee_quran_reading_history qr
LEFT JOIN public.employees e ON qr.employee_id = e.id
ORDER BY qr.date DESC, qr.created_at DESC
LIMIT 10;

-- 5. Check Quran reading history by employee (example: first 5 employees with data)
SELECT
    'Quran Reading by Employee' as info,
    e.id as employee_id,
    e.name as employee_name,
    COUNT(*) as total_reading_entries,
    MIN(qr.date) as first_reading_date,
    MAX(qr.date) as last_reading_date
FROM public.employee_quran_reading_history qr
INNER JOIN public.employees e ON qr.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY total_reading_entries DESC
LIMIT 5;

-- 6. Check for any orphaned records (employee_id not in employees table)
SELECT
    'Orphaned Records Check' as info,
    COUNT(*) as orphaned_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '⚠️ Found orphaned records - employee_id does not exist in employees table'
    END as status
FROM public.employee_quran_reading_history qr
WHERE NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = qr.employee_id
);

-- 7. Check RLS policies
SELECT
    'RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employee_quran_reading_history';

-- 8. Summary
SELECT
    'Summary' as info,
    '✅ Run this script in Supabase SQL Editor to verify your data' as instruction;
