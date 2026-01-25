-- ================================================
-- Fix Schema for Tadarus Requests
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Add missing 'category' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tadarus_requests' AND column_name = 'category') THEN
        ALTER TABLE tadarus_requests ADD COLUMN category TEXT;
    END IF;
END $$;

-- 2. Reload PostgREST schema cache to ensure API picks up the new column
NOTIFY pgrst, 'reload schema';
