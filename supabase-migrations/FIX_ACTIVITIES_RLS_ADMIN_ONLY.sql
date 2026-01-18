-- =====================================================
-- PERBAIKI RLS POLICY UNTUK TABEL activities (ADMIN ONLY)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop semua existing policies
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.activities;

-- =====================================================
-- 2. POLICY UNTUK USER BIASA (HANYA VIEW)
-- =====================================================

-- User biasa hanya bisa LIHAT (SELECT)
CREATE POLICY "Authenticated users can view activities"
    ON public.activities
    FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- 3. POLICY UNTUK ADMIN (FULL ACCESS)
-- =====================================================

-- Admin bisa INSERT (buat activity baru)
CREATE POLICY "Admins can insert activities"
    ON public.activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    );

-- Admin bisa UPDATE (edit activity)
CREATE POLICY "Admins can update activities"
    ON public.activities
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    );

-- Admin bisa DELETE (hapus activity)
CREATE POLICY "Admins can delete activities"
    ON public.activities
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    );

-- =====================================================
-- 4. VERIFIKASI
-- =====================================================

SELECT '✅ RLS Policies updated (Admin only for insert/delete/update)!' as status;

-- Tampilkan semua policies
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activities'
ORDER BY cmd, policyname;
