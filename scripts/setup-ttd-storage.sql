-- =====================================================
-- Setup Storage Bucket for User Signatures (TTD)
-- Purpose: Allow upload and public access to user signature images
-- =====================================================

-- Note: This assumes you already created a storage bucket named "TTD"
-- in Supabase dashboard. If not, create it first:
-- 1. Go to Storage → New bucket
-- 2. Name: "TTD"
-- 3. Make Public: YES (important!)

-- =====================================================
-- Enable RLS on Storage Objects
-- =====================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP existing policies if any (to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to TTD bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to TTD bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update in TTD bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from TTD bucket" ON storage.objects;
DROP POLICY IF EXISTS "Grant all on TTD bucket" ON storage.objects;

-- =====================================================
-- Create RLS Policies for Storage
-- =====================================================

-- Policy: Allow ALL operations on TTD bucket (simple approach)
CREATE POLICY "Grant all on TTD bucket"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'TTD')
WITH CHECK (bucket_id = 'TTD');

-- =====================================================
-- Verify Storage Bucket
-- =====================================================

-- Check if TTD bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'TTD';

-- =====================================================
-- Verify Policies
-- =====================================================

-- List all policies for TTD bucket
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%TTD%';

-- =====================================================
-- Finished Successfully!
-- =====================================================
