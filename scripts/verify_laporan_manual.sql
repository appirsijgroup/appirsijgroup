-- ============================================
-- VERIFICATION SCRIPT: Laporan Manual Columns
-- ============================================
-- Purpose: Verify reading_history and monthly_activities columns are properly set up

-- ============================================
-- 1. CHECK COLUMNS EXIST
-- ============================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('reading_history', 'monthly_activities')
ORDER BY column_name;

-- Expected result:
-- column_name         | data_type | is_nullable | column_default
-- --------------------+-----------+-------------+------------------
-- monthly_activities | jsonb     | YES         | {}::jsonb
-- reading_history    | jsonb     | YES         | []::jsonb

-- ============================================
-- 2. CHECK INDEXES
-- ============================================

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'employees'
  AND indexname LIKE '%reading_history%'
     OR indexname LIKE '%monthly_activities%';

-- Expected result (optional but recommended):
-- indexname                          | indexdef
-- -----------------------------------+----------
-- idx_employees_monthly_activities   | CREATE INDEX...
-- idx_employees_reading_history      | CREATE INDEX...

-- ============================================
-- 3. TEST DATA INSERT
-- ============================================

-- Test reading_history insert
UPDATE employees
SET reading_history = '[
    {
        "id": "test_001",
        "bookTitle": "The Richest Man in Babylon",
        "pagesRead": "45",
        "dateCompleted": "2025-01-10"
    },
    {
        "id": "test_002",
        "bookTitle": "Atomic Habits",
        "pagesRead": "120",
        "dateCompleted": "2025-01-12"
    }
]'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- Replace with actual employee ID
RETURNING
    id,
    name,
    jsonb_array_length(reading_history) as total_books,
    reading_history;

-- Test monthly_activities insert
UPDATE employees
SET monthly_activities = '{
    "2025-01": {
        "01": {
            "manual_activity_1": true,
            "manual_activity_2": true
        },
        "10": {
            "manual_activity_1": true,
            "book_reading_report": true
        },
        "15": {
            "book_reading_report": true
        }
    },
    "2025-02": {
        "20": {
            "manual_activity_1": true,
            "manual_activity_3": true
        }
    }
}'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- Replace with actual employee ID
RETURNING
    id,
    name,
    monthly_activities;

-- ============================================
-- 4. QUERY VERIFICATION
-- ============================================

-- Query all employees with reading history
SELECT
    id,
    name,
    jsonb_array_length(reading_history) as books_read,
    reading_history
FROM employees
WHERE reading_history IS NOT NULL
  AND jsonb_array_length(reading_history) > 0
ORDER BY jsonb_array_length(reading_history) DESC
LIMIT 10;

-- Query all employees with monthly activities
SELECT
    id,
    name,
    monthly_activities
FROM employees
WHERE monthly_activities IS NOT NULL
  AND monthly_activities != '{}'::jsonb
LIMIT 10;

-- ============================================
-- 5. ADVANCED QUERIES
-- ============================================

-- Get books read in a specific date range
SELECT
    id,
    name,
    jsonb_array_elements(reading_history)->>'bookTitle' as book_title,
    jsonb_array_elements(reading_history)->>'dateCompleted' as date_completed
FROM employees
WHERE reading_history IS NOT NULL
  AND jsonb_array_length(reading_history) > 0
  AND (jsonb_array_elements(reading_history)->>'dateCompleted') >= '2025-01-01'
  AND (jsonb_array_elements(reading_history)->>'dateCompleted') <= '2025-01-31'
ORDER BY date_completed DESC;

-- Get activity count per employee for a specific month
SELECT
    id,
    name,
    monthly_activities->'2025-01' as january_activities,
    (
        SELECT count(*)
        FROM jsonb_each_text(monthly_activities->'2025-01'->'01')
        WHERE value = 'true'
    ) as activities_on_jan_1
FROM employees
WHERE monthly_activities ? '2025-01';

-- Get employees with activity on specific date
SELECT
    id,
    name,
    monthly_activities->'2025-01'->'10' as activities_on_jan_10,
    jsonb_object_keys(monthly_activities->'2025-01'->'10') as activity_ids
FROM employees
WHERE monthly_activities->'2025-01' ? '10';

-- ============================================
-- 6. DATA INTEGRITY CHECKS
-- ============================================

-- Check for invalid reading_history (non-array)
SELECT
    id,
    name,
    reading_history,
    CASE
        WHEN jsonb_typeof(reading_history) = 'array' THEN 'Valid array'
        ELSE 'INVALID: Not an array'
    END as structure_check
FROM employees
WHERE reading_history IS NOT NULL
LIMIT 10;

-- Check for invalid monthly_activities (non-object)
SELECT
    id,
    name,
    monthly_activities,
    CASE
        WHEN jsonb_typeof(monthly_activities) = 'object' THEN 'Valid object'
        ELSE 'INVALID: Not an object'
    END as structure_check
FROM employees
WHERE monthly_activities IS NOT NULL
LIMIT 10;

-- Check for null/empty values
SELECT
    COUNT(*) FILTER (WHERE reading_history IS NULL) as null_reading_history,
    COUNT(*) FILTER (WHERE reading_history = '[]'::jsonb) as empty_reading_history,
    COUNT(*) FILTER (WHERE reading_history IS NOT NULL AND jsonb_array_length(reading_history) > 0) as with_reading_history,
    COUNT(*) FILTER (WHERE monthly_activities IS NULL) as null_monthly_activities,
    COUNT(*) FILTER (WHERE monthly_activities = '{}'::jsonb) as empty_monthly_activities,
    COUNT(*) FILTER (WHERE monthly_activities != '{}'::jsonb) as with_monthly_activities
FROM employees;

-- ============================================
-- 7. PERFORMANCE TEST
-- ============================================

-- Test query performance with GIN index
EXPLAIN ANALYZE
SELECT id, name
FROM employees
WHERE reading_history IS NOT NULL
  AND jsonb_array_length(reading_history) > 0;

EXPLAIN ANALYZE
SELECT id, name
FROM employees
WHERE monthly_activities ? '2025-01';

-- Expected: Should use "Bitmap Index Scan" or similar index operation

-- ============================================
-- 8. ADD COLUMNS IF MISSING (Safety Script)
-- ============================================

-- Add reading_history if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'reading_history'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN reading_history JSONB DEFAULT '[]'::jsonb;

        RAISE NOTICE '✅ Column reading_history has been added';
    ELSE
        RAISE NOTICE 'ℹ️ Column reading_history already exists';
    END IF;
END
$$;

-- Add monthly_activities if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'monthly_activities'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN monthly_activities JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE '✅ Column monthly_activities has been added';
    ELSE
        RAISE NOTICE 'ℹ️ Column monthly_activities already exists';
    END IF;
END
$$;

-- Create GIN indexes if missing
CREATE INDEX IF NOT EXISTS idx_employees_reading_history
ON employees USING GIN (reading_history);

CREATE INDEX IF NOT EXISTS idx_employees_monthly_activities
ON employees USING GIN (monthly_activities);

RAISE NOTICE '✅ Indexes verified/created';

-- ============================================
-- 9. CLEANUP TEST DATA (Optional)
-- ============================================

-- Uncomment to cleanup test data
/*
UPDATE employees
SET reading_history = '[]'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID';

UPDATE employees
SET monthly_activities = '{}'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID';
*/

-- ============================================
-- 10. SUMMARY REPORT
-- ============================================

-- Generate summary report
SELECT
    'Laporan Manual Setup Summary' as report_title,
    (SELECT COUNT(*) FROM employees WHERE reading_history IS NOT NULL) as employees_with_reading_history_column,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities IS NOT NULL) as employees_with_monthly_activities_column,
    (SELECT COUNT(*) FROM employees WHERE jsonb_array_length(reading_history) > 0) as employees_with_books_logged,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities != '{}'::jsonb) as employees_with_activities_logged,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'employees' AND indexname LIKE '%reading_history%') as reading_history_indexes,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'employees' AND indexname LIKE '%monthly_activities%') as monthly_activities_indexes;

-- ============================================
-- EXPECTED SUMMARY OUTPUT
-- ============================================
-- report_title                    | employees_with_... | employees_with_... | etc.
-- --------------------------------+--------------------+--------------------+-----
-- Laporan Manual Setup Summary    | 150                | 150                | ...

-- All employees should have the columns
-- Some may have empty arrays/objects (no data logged yet)
