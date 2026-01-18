-- ============================================================================
-- Final Verification - Check Everything
-- ============================================================================

-- 1. Check table structure (HARUS 4 columns!)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_monthly_activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Count data
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as new_table_count,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities IS NOT NULL AND monthly_activities::text != '{}'::text) as old_data_count;

-- 3. Sample data from new table
SELECT
    employee_id,
    activities
FROM employee_monthly_activities
LIMIT 5;

-- 4. Which employees have data in new table?
SELECT
    e.id,
    e.name,
    CASE WHEN ema.employee_id IS NOT NULL THEN 'YES' ELSE 'NO' END as migrated
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
ORDER BY migrated DESC, e.name
LIMIT 10;
