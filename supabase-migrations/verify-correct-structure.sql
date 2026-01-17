-- ============================================================================
-- Simple Verification (No problematic functions)
-- ============================================================================

-- Check structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_monthly_activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check data
SELECT
    e.id,
    e.name,
    CASE WHEN ema.employee_id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_new_table,
    CASE WHEN e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text THEN 'YES' ELSE 'NO' END as in_old_column
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE ema.employee_id IS NOT NULL
   OR (e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text)
ORDER BY e.name;

-- Count totals
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as new_table_count,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities IS NOT NULL AND monthly_activities::text != '{}'::text) as old_column_count;
