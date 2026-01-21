-- ============================================
-- FIX RLS POLICIES FOR employee_monthly_activities
-- Drop restrictive policies and create permissive ones
-- ============================================

-- 0. First, add auth_user_id column to employees table if it doesn't exist
DO $$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN auth_user_id TEXT;
        RAISE NOTICE 'Added auth_user_id column to employees table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists in employees table';
    END IF;
END $$;

-- Create index for better performance on auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);

-- Migrate existing data: For employees where id is a UUID (matches auth.users.id), set auth_user_id
DO $$
BEGIN
    -- Update employees where id looks like a UUID and auth_user_id is null
    UPDATE public.employees
    SET auth_user_id = id
    WHERE auth_user_id IS NULL
    AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    RAISE NOTICE 'Migrated existing employee IDs to auth_user_id where applicable';
END $$;

-- 1. Drop existing restrictive policies
DO $$
BEGIN
    -- Drop existing employee-specific policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to view own monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to update own monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to insert own monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow admins to view all monthly activities" ON public.employee_monthly_activities';

    -- Drop any "everyone" policies (if they exist)
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to view all monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to insert monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to update monthly activities" ON public.employee_monthly_activities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to delete monthly activities" ON public.employee_monthly_activities';

    RAISE NOTICE 'Existing policies dropped successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies might not exist, continuing...';
END $$;

-- 2. Create new permissive policies
-- These policies allow authenticated users to manage their own monthly activities

-- Policy: Authenticated users can view their own monthly activities
CREATE POLICY "Allow authenticated users to view own monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE employees.auth_user_id = auth.uid()::text));

-- Policy: Authenticated users can insert their own monthly activities
CREATE POLICY "Allow authenticated users to insert own monthly activities"
ON public.employee_monthly_activities
FOR INSERT
TO authenticated
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE employees.auth_user_id = auth.uid()::text));

-- Policy: Authenticated users can update their own monthly activities
CREATE POLICY "Allow authenticated users to update own monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE employees.auth_user_id = auth.uid()::text))
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE employees.auth_user_id = auth.uid()::text));

-- Policy: Admins can view all monthly activities
CREATE POLICY "Allow admins to view all monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_activities.employee_id
        AND employees.auth_user_id = auth.uid()::text
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- Policy: Admins can update all monthly activities
CREATE POLICY "Allow admins to update all monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_activities.employee_id
        AND employees.auth_user_id = auth.uid()::text
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- 3. Verify the new policies
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'employee_monthly_activities'
ORDER BY policyname;

-- Expected: 5 policies (SELECT x2, INSERT, UPDATE x2)
