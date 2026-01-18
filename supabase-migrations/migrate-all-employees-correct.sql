-- ============================================================================
-- Migrate ALL Employees to Per-Day Structure
-- ============================================================================

-- Delete all existing data from new table (fresh start)
TRUNCATE TABLE employee_monthly_activities;

-- Migrate ALL employees - Unnest nested JSON structure
INSERT INTO public.employee_monthly_activities (employee_id, month_key, day_index, activities)
SELECT
    e.id as employee_id,
    month.month_key,
    (day.day_index)::integer as day_index,
    day.activities
FROM employees e,
     jsonb_each(e.monthly_activities) as month(month_key, month_data),
     jsonb_each(month.month_data) as day(day_index, activities)
WHERE e.monthly_activities IS NOT NULL
  AND e.monthly_activities::text != '{}'::text;

-- Verify - count records
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as total_records_in_new_table,
    (SELECT COUNT(DISTINCT id) FROM employees WHERE monthly_activities IS NOT NULL AND monthly_activities::text != '{}'::text) as employees_with_data;

-- Sample data
SELECT
    e.id,
    e.name,
    ema.month_key,
    ema.day_index
FROM employees e
JOIN employee_monthly_activities ema ON e.id = ema.employee_id
ORDER BY e.name, ema.month_key DESC, ema.day_index
LIMIT 20;
