-- ============================================================================
-- Migrate ALL Remaining Employees (without ON CONFLICT)
-- ============================================================================

-- This will insert all employees that don't exist in new table yet
-- Run this AFTER fixing IMAM SANTIKO individually

INSERT INTO public.employee_monthly_activities (employee_id, activities)
SELECT e.id, e.monthly_activities
FROM employees e
WHERE e.monthly_activities IS NOT NULL
  AND e.monthly_activities::text != '{}'::text
  AND NOT EXISTS (
      SELECT 1 
      FROM employee_monthly_activities ema 
      WHERE ema.employee_id = e.id
  );

-- Verify all
SELECT
    e.id,
    e.name,
    CASE WHEN ema.employee_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_data_in_new_table,
    CASE WHEN e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text THEN 'YES' ELSE 'NO' END as has_data_in_old_column
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE ema.employee_id IS NOT NULL
   OR (e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text)
ORDER BY e.name;
