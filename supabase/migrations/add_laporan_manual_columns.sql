-- Migration: Add columns for Laporan Manual (Manual Activity Reports)
-- Purpose: Enable saving manual activities and book reading reports to database

-- ============================================
-- 1. READING_HISTORY COLUMN
-- ============================================
-- For storing book reading history

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

        RAISE NOTICE '✅ Column reading_history added to employees table';
    ELSE
        RAISE NOTICE 'ℹ️ Column reading_history already exists in employees table';
    END IF;
END
$$;

-- Add comment
COMMENT ON COLUMN employees.reading_history IS 'Book reading history stored as JSONB array of ReadingHistory objects';

-- ============================================
-- 2. MONTHLY_ACTIVITIES COLUMN
-- ============================================
-- For storing monthly activity progress (manual activities + book reading)

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

        RAISE NOTICE '✅ Column monthly_activities added to employees table';
    ELSE
        RAISE NOTICE 'ℹ️ Column monthly_activities already exists in employees table';
    END IF;
END
$$;

-- Add comment
COMMENT ON COLUMN employees.monthly_activities IS 'Monthly activity progress stored as nested JSONB object: { "2025-01": { "01": { "activity_id": true } } }';

-- ============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for reading_history (optional, for queries filtering by reading history)
CREATE INDEX IF NOT EXISTS idx_employees_reading_history
ON employees USING GIN (reading_history);

-- Index for monthly_activities (recommended for faster queries)
CREATE INDEX IF NOT EXISTS idx_employees_monthly_activities
ON employees USING GIN (monthly_activities);

-- ============================================
-- DATA STRUCTURE EXAMPLES
-- ============================================

-- reading_history structure:
-- [
--   {
--     "id": "1704885600000",
--     "bookTitle": "The Richest Man in Babylon",
--     "pagesRead": "45",
--     "dateCompleted": "2025-01-10"
--   }
-- ]

-- monthly_activities structure:
-- {
--   "2025-01": {
--     "01": {
--       "activity_1": true,
--       "activity_2": true
--     },
--     "15": {
--       "activity_1": true
--     }
--   },
--   "2025-02": {
--     "20": {
--       "activity_1": true
--     }
--   }
-- }

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('reading_history', 'monthly_activities')
ORDER BY column_name;

-- Expected result:
-- column_name         | data_type | is_nullable | column_default
-- --------------------+-----------+-------------+----------------
-- monthly_activities | jsonb     | YES         | {}::jsonb
-- reading_history    | jsonb     | YES         | []::jsonb

-- ============================================
-- SAMPLE DATA QUERIES
-- ============================================

-- Query employees with reading history
SELECT
    id,
    name,
    jsonb_array_length(reading_history) as books_read,
    reading_history
FROM employees
WHERE reading_history IS NOT NULL
  AND jsonb_array_length(reading_history) > 0
ORDER BY jsonb_array_length(reading_history) DESC;

-- Query employees with monthly activities
SELECT
    id,
    name,
    monthly_activities
FROM employees
WHERE monthly_activities IS NOT NULL
  AND monthly_activities != '{}'::jsonb
LIMIT 10;

-- Get activity count for a specific month
SELECT
    id,
    name,
    monthly_activities->'2025-01' as january_activities
FROM employees
WHERE monthly_activities ? '2025-01';

-- ============================================
-- TEST INSERT (OPTIONAL)
-- ============================================

-- Test insert sample reading history
UPDATE employees
SET reading_history = '[
    {
        "id": "test_001",
        "bookTitle": "Test Book",
        "pagesRead": "100",
        "dateCompleted": "2025-01-10"
    }
]'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- Replace with actual employee ID
RETURNING id, name, reading_history;

-- Test insert sample monthly activities
UPDATE employees
SET monthly_activities = '{
    "2025-01": {
        "10": {
            "manual_activity_1": true,
            "manual_activity_2": true
        }
    }
}'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- Replace with actual employee ID
RETURNING id, name, monthly_activities;
