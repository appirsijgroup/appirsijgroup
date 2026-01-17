-- ============================================================================
-- Correct Migration for Per-Day Structure
-- Structure: (employee_id, month_key, day_index, activities)
-- Each row = 1 employee, 1 month, 1 day
-- ============================================================================

-- First, delete any existing data for IMAM SANTIKO to avoid duplicates
DELETE FROM employee_monthly_activities
WHERE employee_id = '5343';

-- Migrate IMAM SANTIKO (5343) - Unnest nested JSON
INSERT INTO public.employee_monthly_activities (employee_id, month_key, day_index, activities)
SELECT
    e.id as employee_id,
    month.month_key,
    (day.day_index)::integer as day_index,
    day.activities
FROM employees e,
     jsonb_each(e.monthly_activities) as month(month_key, month_data),
     jsonb_each(month.month_data) as day(day_index, activities)
WHERE e.id = '5343'
  AND e.monthly_activities IS NOT NULL
  AND e.monthly_activities::text != '{}'::text;

-- Verify IMAM SANTIKO
SELECT
    e.id,
    e.name,
    ema.month_key,
    ema.day_index,
    ema.activities
FROM employees e
JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE e.id = '5343'
ORDER BY ema.month_key DESC, ema.day_index;
