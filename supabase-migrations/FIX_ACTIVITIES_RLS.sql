-- =====================================================
-- PERBAIKI RLS POLICY UNTUK TABEL activities
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop existing policies yang mungkin bentrok
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities" ON public.activities;

-- 2. Create policy untuk INSERT - izinkan semua authenticated users
CREATE POLICY "Authenticated users can insert activities"
    ON public.activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Create policy untuk SELECT - izinkan semua authenticated users melihat
CREATE POLICY "Authenticated users can view activities"
    ON public.activities
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. Create policy untuk UPDATE - izinkan semua authenticated users update
CREATE POLICY "Authenticated users can update activities"
    ON public.activities
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create policy untuk DELETE - izinkan semua authenticated users delete
CREATE POLICY "Authenticated users can delete activities"
    ON public.activities
    FOR DELETE
    TO authenticated
    USING (true);

-- 6. Verifikasi
SELECT '✅ RLS Policies updated successfully!' as status;

-- Tampilkan semua policies yang ada
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activities';
