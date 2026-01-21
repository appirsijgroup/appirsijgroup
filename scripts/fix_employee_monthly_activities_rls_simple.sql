-- ============================================
-- FIX RLS POLICIES FOR employee_monthly_activities (SIMPLE VERSION)
-- This version uses permissive policies that allow all authenticated users
-- Use this if the auth_user_id approach doesn't work for your setup
-- ============================================

-- 1. Drop all existing policies
DO $$
BEGIN
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

-- 2. Create permissive policies for authenticated users
-- These allow any authenticated user to manage the data (application-level filtering is done in the code)

CREATE POLICY "Allow authenticated users to view all monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert monthly activities"
ON public.employee_monthly_activities
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete monthly activities"
ON public.employee_monthly_activities
FOR DELETE
TO authenticated
USING (true);

-- 3. Verify the new policies
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'employee_monthly_activities'
ORDER BY policyname;

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)
