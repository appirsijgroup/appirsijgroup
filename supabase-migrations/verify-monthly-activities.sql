-- ============================================================================
-- Verification Queries for Monthly Activities Migration
-- Purpose: Check where data is stored after migration
-- ============================================================================

-- Query 1: Check current state of all employees
SELECT
    e.id,
    e.name,
    e.email,
    CASE
        WHEN ema.employee_id IS NOT NULL THEN '✅ In employee_monthly_activities'
        ELSE '❌ NOT in employee_monthly_activities'
    END as table_status,
    CASE
        WHEN ema.activities IS NOT NULL THEN (SELECT COUNT(*) FROM jsonb_object_keys(ema.activities))
        ELSE 0
    END as new_table_months_count,
    CASE
        WHEN e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text
        THEN '⚠️ Still in employees.monthly_activities (OLD)'
        ELSE '✅ Not in employees.monthly_activities'
    END as column_status,
    CASE
        WHEN e.monthly_activities IS NOT NULL AND e.monthly_activities::text != '{}'::text
        THEN (SELECT COUNT(*) FROM jsonb_object_keys(e.monthly_activities))
        ELSE 0
    END as old_column_months_count
FROM employees e
LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
WHERE ema.employee_id IS NOT NULL
   OR e.monthly_activities IS NOT NULL
ORDER BY e.name
LIMIT 50;

-- Query 2: Count totals
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as new_table_count,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities IS NOT NULL AND monthly_activities::text != '{}'::text) as old_column_count;

-- Query 3: Check specific employee (uncomment and replace ID)
-- SELECT
--     e.id,
--     e.name,
--     ema.activities,
--     e.monthly_activities
-- FROM employees e
-- LEFT JOIN employee_monthly_activities ema ON e.id = ema.employee_id
-- WHERE e.id = 'YOUR_EMPLOYEE_ID';

-- Query 4: Simple check - which employees have data in which location
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
