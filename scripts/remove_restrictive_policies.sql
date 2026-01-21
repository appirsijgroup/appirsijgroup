-- ============================================
-- REMOVE RESTRICTIVE POLICIES (keep only permissive ones)
-- Run this to fix the duplicate policy issue
-- ============================================

-- Drop only the restrictive policies that use auth_user_id
DROP POLICY IF EXISTS "Allow authenticated users to insert own monthly activities" ON public.employee_monthly_activities;
DROP POLICY IF EXISTS "Allow authenticated users to update own monthly activities" ON public.employee_monthly_activities;
DROP POLICY IF EXISTS "Allow authenticated users to view own monthly activities" ON public.employee_monthly_activities;

-- Note: We keep the permissive policies that use (true)
-- These allow authenticated users to perform operations (filtered by application code)

-- Verify the remaining policies
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employee_monthly_activities'
ORDER BY policyname;

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE with "true")
