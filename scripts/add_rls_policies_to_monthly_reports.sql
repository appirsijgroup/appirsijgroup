-- ============================================
-- ADD RLS POLICIES to employee_monthly_reports
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable Row Level Security
ALTER TABLE public.employee_monthly_reports ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Employee bisa lihat monthly reports sendiri
CREATE POLICY "Allow employees to view own monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (employee_id = auth.uid()::text);

-- 3. Policy: Employee bisa insert monthly reports sendiri
CREATE POLICY "Allow employees to insert own monthly reports"
ON public.employee_monthly_reports
FOR INSERT
TO public
WITH CHECK (employee_id = auth.uid()::text);

-- 4. Policy: Employee bisa update monthly reports sendiri
CREATE POLICY "Allow employees to update own monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (employee_id = auth.uid()::text);

-- 5. Policy: Admin bisa lihat semua monthly reports
CREATE POLICY "Allow admins to view all monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_reports.employee_id
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- 6. Policy: Admin bisa update semua monthly reports
CREATE POLICY "Allow admins to update all monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_reports.employee_id
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Cek apakah RLS sudah enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'employee_monthly_reports';

-- Cek policies yang sudah dibuat
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'employee_monthly_reports';

-- Expected output:
-- 6 policies (2 untuk employee: SELECT & INSERT & UPDATE, 2 untuk admin: SELECT & UPDATE)
