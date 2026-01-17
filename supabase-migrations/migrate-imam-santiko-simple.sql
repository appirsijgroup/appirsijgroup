-- ============================================================================
-- Simple Migration for IMAM SANTIKO (and others)
-- ============================================================================

-- Step 1: Insert data for employees that don't exist in new table yet
INSERT INTO public.employee_monthly_activities (employee_id, activities)
SELECT id, monthly_activities
FROM employees
WHERE id = '5343'  -- IMAM SANTIKO specifically
  AND monthly_activities IS NOT NULL
  AND monthly_activities::text != '{}'::text
  AND id NOT IN (SELECT employee_id FROM employee_monthly_activities WHERE employee_id = '5343');

-- Step 2: Verify
SELECT
    e.id,
    e.name,
    CASE WHEN ema.employee_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_data_in_new_table,
    CASE WHEN e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text THEN 'YES' ELSE 'NO' END as has_data_in_old_column
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE e.id = '5343'
   OR ema.employee_id = '5343';
