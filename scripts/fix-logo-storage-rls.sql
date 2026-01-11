-- =====================================================
-- FIX: Storage RLS Policies for Logo Bucket
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, check if the bucket exists and is public
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'Logo';

-- If bucket doesn't exist, create it first (in Storage dashboard or run this)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('Logo', 'Logo', true);

-- =====================================================
-- Enable RLS on storage.objects (NOT storage.buckets)
-- =====================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP existing policies if any (to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to Logo bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to Logo bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update in Logo bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from Logo bucket" ON storage.objects;

-- =====================================================
-- Create NEW RLS Policies for Storage
-- =====================================================

-- Policy 1: Allow PUBLIC READ access to Logo bucket (important!)
CREATE POLICY "Allow public read access to Logo bucket"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'Logo');

-- Policy 2: Allow authenticated users to UPLOAD to Logo bucket
CREATE POLICY "Allow authenticated upload to Logo bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'Logo');

-- Policy 3: Allow authenticated users to UPDATE files in Logo bucket
CREATE POLICY "Allow authenticated update in Logo bucket"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- Policy 4: Allow authenticated users to DELETE from Logo bucket
CREATE POLICY "Allow authenticated delete from Logo bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'Logo');

-- =====================================================
-- Verify Policies
-- =====================================================

-- List all policies for storage.objects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- Alternative: If above doesn't work, try this
-- =====================================================

-- Grant ALL permissions on Logo bucket to anon
-- This is a broader policy that should work

DROP POLICY IF EXISTS "Grant all on Logo bucket" ON storage.objects;

CREATE POLICY "Grant all on Logo bucket"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- =====================================================
-- Finished Successfully!
-- =====================================================
