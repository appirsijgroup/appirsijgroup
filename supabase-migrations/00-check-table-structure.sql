-- ============================================================================
-- CHECK EMPLOYEES TABLE STRUCTURE
-- ============================================================================
-- Run this first to see current table structure
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
