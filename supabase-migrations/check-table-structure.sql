-- ============================================================================
-- Check employee_monthly_activities Table Structure
-- ============================================================================

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'employee_monthly_activities'
ORDER BY 
    ordinal_position;

-- Check constraints
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'public.employee_monthly_activities'::regclass;

-- Sample data to understand structure
SELECT * FROM employee_monthly_activities LIMIT 3;
