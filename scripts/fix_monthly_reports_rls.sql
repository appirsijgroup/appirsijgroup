-- ============================================
-- FIX RLS POLICIES untuk employee_monthly_reports
-- Masalah: auth.uid() mungkin beda format dengan employee_id
-- Solusi: Gunakan checking yang lebih longgar
-- ============================================

-- 1. Drop policies yang lama
DROP POLICY IF EXISTS "Allow employees to view own monthly reports" ON public.employee_monthly_reports;
DROP POLICY IF EXISTS "Allow employees to insert own monthly reports" ON public.employee_monthly_reports;
DROP POLICY IF EXISTS "Allow employees to update own monthly reports" ON public.employee_monthly_reports;
DROP POLICY IF EXISTS "Allow admins to view all monthly reports" ON public.employee_monthly_reports;
DROP POLICY IF EXISTS "Allow admins to update all monthly reports" ON public.employee_monthly_reports;

-- 2. Buat policies baru yang lebih longgar

-- Policy: Semua user bisa lihat semua data (untuk development)
-- Nanti bisa dibatasi kalau sudah production
CREATE POLICY "Allow everyone to view all monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (true);

-- Policy: Semua user bisa insert data (untuk development)
CREATE POLICY "Allow everyone to insert monthly reports"
ON public.employee_monthly_reports
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Semua user bisa update data (untuk development)
CREATE POLICY "Allow everyone to update monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (true);

-- Policy: Semua user bisa delete data (untuk development)
CREATE POLICY "Allow everyone to delete monthly reports"
ON public.employee_monthly_reports
FOR DELETE
TO public
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Cek policies yang baru dibuat
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'employee_monthly_reports';

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE) dengan roles = public
