-- =====================================================
-- CEK & PERBAIKI RLS POLICY UNTUK TABEL activities
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Cek apakah RLS enabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'activities';

-- 2. Cek existing policies
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
WHERE schemaname = 'public'
AND tablename = 'activities';

-- 3. Jika RLS menyebabkan masalah, sementara disable RLS
-- HATI-HATI: Ini untuk testing saja!
-- ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;

-- 4. Atau buat policy yang mengizinkan authenticated users untuk insert
-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;

-- Create policy untuk authenticated users
CREATE POLICY "Authenticated users can insert activities"
    ON public.activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy untuk authenticated users to select
CREATE POLICY "Authenticated users can view activities"
    ON public.activities
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy untuk authenticated users to update
CREATE POLICY "Authenticated users can update activities"
    ON public.activities
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Verifikasi policies
SELECT
    '✅ Policies updated successfully' as status;

SELECT
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activities';
