-- =====================================================
-- Setup Storage Bucket for Hospital Logos
-- Purpose: Allow upload and public access to hospital logos
-- =====================================================

-- Note: This assumes you already created a storage bucket named "Logo"
-- in Supabase dashboard. If not, create it first:
-- 1. Go to Storage → New bucket
-- 2. Name: "Logo"
-- 3. Make Public: YES (important!)

-- =====================================================
-- Enable RLS on Storage Objects
-- =====================================================
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies for Storage
-- =====================================================

-- Policy: Allow public read access to logo bucket
CREATE POLICY "Allow public read access to Logo bucket"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'Logo');

-- Policy: Allow authenticated users to upload to logo bucket
CREATE POLICY "Allow authenticated upload to Logo bucket"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'Logo');

-- Policy: Allow authenticated users to update files in logo bucket
CREATE POLICY "Allow authenticated update in Logo bucket"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- Policy: Allow authenticated users to delete from logo bucket
CREATE POLICY "Allow authenticated delete from Logo bucket"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'Logo');

-- =====================================================
-- Verify Storage Bucket
-- =====================================================

-- Check if Logo bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'Logo';

-- =====================================================
-- Finished Successfully!
-- =====================================================
