-- ============================================================================
-- FORCE DROP and Recreate - Final Solution
-- ============================================================================

-- STEP 1: Force drop the table
DROP TABLE IF EXISTS public.employee_monthly_activities CASCADE;

-- Verify it's dropped
SELECT 'Table dropped' as status;

-- STEP 2: Create table with PER-MONTH structure (1 row per employee)
CREATE TABLE public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,
    activities JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Add foreign key
ALTER TABLE public.employee_monthly_activities
ADD CONSTRAINT employee_monthly_activities_employee_id_fkey
FOREIGN KEY (employee_id) 
REFERENCES employees(id) 
ON DELETE CASCADE;

-- STEP 4: Enable RLS
ALTER TABLE public.employee_monthly_activities ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create policies
CREATE POLICY "Users can view own monthly activities"
ON public.employee_monthly_activities FOR SELECT
USING (auth.uid()::text = employee_id);

CREATE POLICY "Users can insert own monthly activities"
ON public.employee_monthly_activities FOR INSERT
WITH CHECK (auth.uid()::text = employee_id);

CREATE POLICY "Users can update own monthly activities"
ON public.employee_monthly_activities FOR UPDATE
USING (auth.uid()::text = employee_id);

CREATE POLICY "Service role bypass RLS"
ON public.employee_monthly_activities FOR ALL
USING (auth.role() = 'service_role');

-- STEP 6: Grant permissions
GRANT ALL ON public.employee_monthly_activities TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.employee_monthly_activities TO authenticated;

-- STEP 7: Migrate ALL data
INSERT INTO public.employee_monthly_activities (employee_id, activities)
SELECT id, monthly_activities
FROM employees
WHERE monthly_activities IS NOT NULL
  AND monthly_activities::text != '{}'::text;

-- STEP 8: Verify structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_monthly_activities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 9: Verify data
SELECT
    (SELECT COUNT(*) FROM employee_monthly_activities) as records_count,
    (SELECT COUNT(DISTINCT employee_id) FROM employee_monthly_activities) as employees_count;

RAISE NOTICE '✅ Table recreated successfully!';
