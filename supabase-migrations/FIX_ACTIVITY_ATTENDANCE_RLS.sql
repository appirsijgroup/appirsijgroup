-- =====================================================
-- PERBAIKI RLS POLICY UNTUK TABEL activity_attendance
-- Pastikan user bisa submit presensi
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop existing policies yang mungkin bentrok
DROP POLICY IF EXISTS "Users can view own activity attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Users can insert own activity attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Users can update own activity attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Admins can view all activity attendance" ON public.activity_attendance;
DROP POLICY IF EXISTS "Admins can update all activity attendance" ON public.activity_attendance;

-- 2. Policy untuk semua authenticated users:
--    Bisa INSERT presensi (klik tombol HADIR/TIDAK)
CREATE POLICY "Authenticated users can insert attendance"
    ON public.activity_attendance
    FOR INSERT
    TO authenticated
    WITH CHECK (employee_id = auth.uid()::text);

-- 3. Policy untuk user melihat presensi mereka sendiri
CREATE POLICY "Authenticated users can view own attendance"
    ON public.activity_attendance
    FOR SELECT
    TO authenticated
    USING (employee_id = auth.uid()::text);

-- 4. Policy untuk user update presensi mereka sendiri
CREATE POLICY "Authenticated users can update own attendance"
    ON public.activity_attendance
    FOR UPDATE
    TO authenticated
    USING (employee_id = auth.uid()::text)
    WITH CHECK (employee_id = auth.uid()::text);

-- 5. Policy untuk Admin melihat semua presensi
CREATE POLICY "Admins can view all attendance"
    ON public.activity_attendance
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    );

-- 6. Policy untuk Admin update semua presensi
CREATE POLICY "Admins can update all attendance"
    ON public.activity_attendance
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

-- 7. Verifikasi
SELECT '✅ activity_attendance RLS Policies updated!' as status;

-- Tampilkan semua policies
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activity_attendance'
ORDER BY cmd, policyname;
