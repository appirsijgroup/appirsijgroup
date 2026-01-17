-- ============================================================================
-- Migration: Create employee_monthly_activities Table
-- Purpose: Store monthly activity progress separate from employees table
-- ============================================================================

-- STEP 1: Create the table
CREATE TABLE IF NOT EXISTS public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,
    activities JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Add foreign key constraint to employees table
-- This assumes employees.id is TEXT (adjust if needed)
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
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key constraint already exists';
    END IF;
END $$;

-- STEP 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_employee_id
ON public.employee_monthly_activities(employee_id);

-- STEP 4: Enable Row Level Security (RLS)
ALTER TABLE public.employee_monthly_activities ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies
-- Policy 1: Users can view their own monthly activities
CREATE POLICY IF NOT EXISTS "Users can view own monthly activities"
ON public.employee_monthly_activities FOR SELECT
USING (auth.uid()::text = employee_id);

-- Policy 2: Users can insert their own monthly activities
CREATE POLICY IF NOT EXISTS "Users can insert own monthly activities"
ON public.employee_monthly_activities FOR INSERT
WITH CHECK (auth.uid()::text = employee_id);

-- Policy 3: Users can update their own monthly activities
CREATE POLICY IF NOT EXISTS "Users can update own monthly activities"
ON public.employee_monthly_activities FOR UPDATE
USING (auth.uid()::text = employee_id);

-- Policy 4: Service role can do everything (bypass RLS)
-- This is important for admin operations
CREATE POLICY IF NOT EXISTS "Service role can manage all monthly activities"
ON public.employee_monthly_activities FOR ALL
USING (auth.role() = 'service_role');

-- STEP 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.employee_monthly_activities TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.employee_monthly_activities TO authenticated;

-- STEP 7: Migration data from employees.monthly_activities if exists
-- This migrates existing data from the old column to the new table
DO $$
DECLARE
    emp_record RECORD;
    migrated_count INTEGER := 0;
BEGIN
    -- Check if the old column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employees' 
        AND column_name = 'monthly_activities'
    ) THEN
        -- Migrate data
        FOR emp_record IN 
            SELECT id, monthly_activities
            FROM employees
            WHERE monthly_activities IS NOT NULL 
            AND monthly_activities::text != '{}'::text
        LOOP
            INSERT INTO public.employee_monthly_activities (employee_id, activities)
            VALUES (emp_record.id, emp_record.monthly_activities)
            ON CONFLICT (employee_id) 
            DO UPDATE SET activities = EXCLUDED.activities;
            
            migrated_count := migrated_count + 1;
        END LOOP;
        
        RAISE NOTICE '✅ Migrated % employee records from employees.monthly_activities', migrated_count;
    ELSE
        RAISE NOTICE 'ℹ️ Old column employees.monthly_activities not found, skipping migration';
    END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'employee_monthly_activities'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employee_monthly_activities';

-- Check data count
SELECT COUNT(*) as total_records FROM public.employee_monthly_activities;

RAISE NOTICE '✅ Migration completed successfully!';
