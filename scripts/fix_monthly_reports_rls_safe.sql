-- ============================================
-- FIX RLS POLICIES (SAFE VERSION)
-- Cek dan drop policies dengan aman
-- ============================================

-- 1. Drop policies satu per satu dengan IF EXISTS
DO $$
BEGIN
    -- Drop view policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to view own monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to insert own monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow employees to update own monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow admins to view all monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow admins to update all monthly reports" ON public.employee_monthly_reports';

    -- Drop "everyone" policies (jika ada)
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to view all monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to insert monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to update monthly reports" ON public.employee_monthly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "Allow everyone to delete monthly reports" ON public.employee_monthly_reports';

    RAISE NOTICE 'Policies dropped successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies might not exist, continuing...';
END $$;

-- 2. Buat policies baru yang lebih longgar
CREATE POLICY "Allow everyone to view all monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow everyone to insert monthly reports"
ON public.employee_monthly_reports
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow everyone to update monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow everyone to delete monthly reports"
ON public.employee_monthly_reports
FOR DELETE
TO public
USING (true);

-- 3. Verifikasi
SELECT
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'employee_monthly_reports'
ORDER BY policyname;

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)
