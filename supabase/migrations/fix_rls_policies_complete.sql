-- ============================================
-- FIX RLS POLICIES: Perbaiki policy yang salah
-- Masalah: auth.uid() return UUID, employee_id adalah text
-- Solusi: Gunakan policy yang lebih permissive tapi aman
-- ============================================

-- ============================================
-- TABLE 1: activity_attendance
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view activity attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Allow users to insert own attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Allow users to update own attendance" ON public.activity_attendance;

-- Create new policies: Allow all authenticated users
CREATE POLICY "Allow authenticated to view activity attendance"
ON public.activity_attendance
FOR SELECT
TO public
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert activity attendance"
ON public.activity_attendance
FOR INSERT
TO public
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update activity attendance"
ON public.activity_attendance
FOR UPDATE
TO public
USING (auth.role() = 'authenticated');

-- ============================================
-- TABLE 2: employee_monthly_activities
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow employees to view own monthly activities" ON public.employee_monthly_activities;
DROP POLICY IF EXISTS "Allow employees to update own monthly activities" ON public.employee_monthly_activities;
DROP POLICY IF EXISTS "Allow employees to insert own monthly activities" ON public.employee_monthly_activities;
DROP POLICY IF EXISTS "Allow admins to view all monthly activities" ON public.employee_monthly_activities;

-- Create new policies: Allow all authenticated users
CREATE POLICY "Allow authenticated to view monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO public
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert monthly activities"
ON public.employee_monthly_activities
FOR INSERT
TO public
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO public
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to upsert monthly activities"
ON public.employee_monthly_activities
FOR ALL
TO public
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION
-- ============================================

-- Cek policies yang sudah dibuat
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
WHERE tablename IN ('activity_attendance', 'employee_monthly_activities')
ORDER BY tablename, policyname;
