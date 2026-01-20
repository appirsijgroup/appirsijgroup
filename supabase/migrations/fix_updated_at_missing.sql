-- ============================================
-- FIX: Add missing updated_at column to activities table
-- Run this in Supabase SQL Editor if you get error:
-- "record 'new' has no field 'updated_at'"
-- ============================================

-- Step 1: Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.activities
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

        RAISE NOTICE 'updated_at column added to activities table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in activities table';
    END IF;
END
$$;

-- Step 2: Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop and recreate the trigger
DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;

CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_activities_updated_at();

-- Step 4: Verify the column exists
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'activities'
AND column_name = 'updated_at';
