-- ============================================
-- CHECK JSONB VALIDITY FOR EMPLOYEE 6000
-- ============================================

-- 1. Cek data employee 6000
SELECT
    id,
    name,
    pg_typeof(reading_history) as reading_history_type,
    pg_typeof(monthly_activities) as monthly_activities_type,
    pg_typeof(todo_list) as todo_list_type
FROM employees
WHERE id = '6000';

-- 2. Cek apakah data valid JSONB
SELECT
    id,
    CASE
        WHEN reading_history IS NULL THEN 'NULL'
        WHEN jsonb_typeof(reading_history) = 'array' THEN 'Valid JSONB Array'
        ELSE concat('INVALID: ', jsonb_typeof(reading_history))
    END as reading_history_status,
    CASE
        WHEN monthly_activities IS NULL THEN 'NULL'
        WHEN jsonb_typeof(monthly_activities) = 'object' THEN 'Valid JSONB Object'
        ELSE concat('INVALID: ', jsonb_typeof(monthly_activities))
    END as monthly_activities_status,
    CASE
        WHEN todo_list IS NULL THEN 'NULL'
        WHEN jsonb_typeof(todo_list) = 'array' THEN 'Valid JSONB Array'
        ELSE concat('INVALID: ', jsonb_typeof(todo_list))
    END as todo_list_status
FROM employees
WHERE id = '6000';

-- 3. Cek ukuran data
SELECT
    id,
    pg_column_size(reading_history) as reading_history_size_bytes,
    pg_column_size(monthly_activities) as monthly_activities_size_bytes,
    pg_column_size(todo_list) as todo_list_size_bytes
FROM employees
WHERE id = '6000';

-- 4. Coba test UPDATE sederhana (untuk memastikan UPDATE bekerja)
-- Ini akan test apakah UPDATE bisa dilakukan tanpa error
UPDATE employees
SET name = name  -- No actual change, just test UPDATE
WHERE id = '6000'
RETURNING id, name, updated_at;

-- 5. Coba test UPDATE dengan JSONB kosong
UPDATE employees
SET reading_history = '[]'::jsonb
WHERE id = '6000'
RETURNING id, reading_history;

-- 6. Coba test UPDATE monthly_activities
UPDATE employees
SET monthly_activities = '{}'::jsonb
WHERE id = '6000'
RETURNING id, monthly_activities;

-- 7. Jika semua di atas berhasil, coba UPDATE dengan data nyata
DO $$
DECLARE
    test_monthly_activities jsonb;
    test_reading_history jsonb;
BEGIN
    -- Create test data
    test_monthly_activities := '{"2025-01": {"10": {"test_activity": true}}}'::jsonb;
    test_reading_history := '[{"id": "1", "bookTitle": "Test", "pagesRead": "100", "dateCompleted": "2025-01-10"}]'::jsonb;

    RAISE NOTICE 'Test data created successfully';

    -- Try update
    UPDATE employees
    SET
        monthly_activities = test_monthly_activities,
        reading_history = test_reading_history
    WHERE id = '6000';

    RAISE NOTICE '✅ UPDATE with test data successful!';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ UPDATE failed: %', SQLERRM;
END $$;

-- 8. Verify result
SELECT
    id,
    monthly_activities,
    reading_history
FROM employees
WHERE id = '6000';

-- 9. Check if there are any database constraints or triggers
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'employees';

-- 10. Check for RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'employees';
