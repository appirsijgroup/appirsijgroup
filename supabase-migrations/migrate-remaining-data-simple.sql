-- ============================================================================
-- Simple Direct Migration - Copy Remaining Data
-- Purpose: Move data from employees.monthly_activities to employee_monthly_activities
-- ============================================================================

-- Insert data for employees that only exist in old table (IMAM SANTIKO)
INSERT INTO public.employee_monthly_activities (employee_id, activities)
SELECT id, monthly_activities
FROM employees
WHERE id NOT IN (SELECT employee_id FROM employee_monthly_activities)
  AND monthly_activities IS NOT NULL
  AND monthly_activities::text != '{}'::text
ON CONFLICT (employee_id) 
DO UPDATE SET activities = EXCLUDED.activities;

-- Verify
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
