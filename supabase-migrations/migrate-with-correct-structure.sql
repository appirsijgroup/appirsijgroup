-- ============================================================================
-- Migration Script for Correct Table Structure
-- Assumption: employee_monthly_activities has (employee_id, month_key, activities)
-- Each row = 1 employee for 1 month
-- ============================================================================

-- Migrate IMAM SANTIKO (5343) specifically
INSERT INTO public.employee_monthly_activities (employee_id, month_key, activities)
SELECT 
    e.id as employee_id,
    key(month_key) as month_key,
    value(month_key) as activities
FROM employees e,
     jsonb_each_text(e.monthly_activities) as month_key
WHERE e.id = '5343'
  AND e.monthly_activities IS NOT NULL
  AND e.monthly_activities::text != '{}'::text
  AND NOT EXISTS (
      SELECT 1 
      FROM employee_monthly_activities ema 
      WHERE ema.employee_id = e.id 
        AND ema.month_key = key(month_key)
  );

-- Verify IMAM SANTIKO
SELECT
    e.id,
    e.name,
    ema.month_key,
    CASE WHEN ema.employee_id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_new_table
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE e.id = '5343'
ORDER BY ema.month_key;
