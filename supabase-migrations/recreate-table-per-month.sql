-- ============================================================================
-- Recreate employee_monthly_activities Table (Per-Month Structure)
-- ============================================================================

-- STEP 1: Drop existing table
DROP TABLE IF EXISTS public.employee_monthly_activities CASCADE;

-- STEP 2: Create table with PER-MONTH structure
CREATE TABLE IF NOT EXISTS public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,
    activities JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Add foreign key constraint to employees table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'employee_monthly_activities_employee_id_fkey'
    ) THEN
        ALTER TABLE public.employee_monthly_activities
        ADD CONSTRAINT employee_monthly_activities_employee_id_fkey
        FOREIGN KEY (employee_id) 
        REFERENCES employees(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key constraint added';
    END IF;
END $$;

-- STEP 4: Enable RLS
ALTER TABLE public.employee_monthly_activities ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view own monthly activities"
ON public.employee_monthly_activities FOR SELECT
USING (auth.uid()::text = employee_id);

CREATE POLICY IF NOT EXISTS "Users can insert own monthly activities"
ON public.employee_monthly_activities FOR INSERT
WITH CHECK (auth.uid()::text = employee_id);

CREATE POLICY IF NOT EXISTS "Users can update own monthly activities"
ON public.employee_monthly_activities FOR UPDATE
USING (auth.uid()::text = employee_id);

CREATE POLICY IF NOT EXISTS "Service role can manage all monthly activities"
ON public.employee_monthly_activities FOR ALL
USING (auth.role() = 'service_role');

-- STEP 6: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.employee_monthly_activities TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.employee_monthly_activities TO authenticated;

-- STEP 7: Migrate data from employees.monthly_activities
INSERT INTO public.employee_monthly_activities (employee_id, activities)
SELECT id, monthly_activities
FROM employees
WHERE monthly_activities IS NOT NULL
  AND monthly_activities::text != '{}'::text;

-- STEP 8: Verify
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as migrated_employees,
    (SELECT COUNT(*) FROM employees WHERE monthly_activities IS NOT NULL AND monthly_activities::text != '{}'::text) as total_with_data;

-- Sample data
SELECT
    e.id,
    e.name,
    ema.activities
FROM employees e
JOIN employee_monthly_activities ema ON e.id = ema.employee_id
LIMIT 5;

RAISE NOTICE '✅ Table recreated with per-month structure and data migrated!';
