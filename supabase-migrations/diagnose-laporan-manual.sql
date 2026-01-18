-- ============================================================================
-- Diagnostic: Check if Laporan Manual Data is Being Saved
-- ============================================================================

-- 1. Check which employees have data in employee_monthly_activities
SELECT
    ema.employee_id,
    e.name,
    jsonb_object_keys(ema.activities) as months_with_data,
    jsonb_object_length(ema.activities) as total_months
FROM employee_monthly_activities ema
JOIN employees e ON e.employee_id = e.id
ORDER BY e.name;

-- 2. For a specific employee (IMAM SANTIKO), check detailed data
SELECT
    employee_id,
    activities
FROM employee_monthly_activities
WHERE employee_id = '5343';  -- IMAM SANTIKO

-- 3. Sample specific month data to see structure
SELECT
    employee_id,
    activities->'2026-01' as january_data
FROM employee_monthly_activities
WHERE employee_id = '5343'
  AND activities ? '2026-01';

-- 4. Count total activities per month (if nested structure)
-- This query assumes activities is {"2026-01": {"05": {...}, "12": {...}}}
SELECT
    employee_id,
    (SELECT COUNT(*) FROM jsonb_each(activities->'2026-01')) as activity_count_in_january
FROM employee_monthly_activities
WHERE employee_id = '5343'
  AND activities ? '2026-01';
