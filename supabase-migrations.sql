-- ============================================
-- Quran Reading Submissions Table Migration
-- Run this in Supabase SQL Editor to create the table
-- ============================================

-- Create quran_reading_submissions table
CREATE TABLE IF NOT EXISTS public.quran_reading_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    surah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    start_ayah INTEGER NOT NULL,
    end_ayah INTEGER NOT NULL,
    submission_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key to employees (optional, can be removed if needed)
    CONSTRAINT fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quran_submissions_user_id ON public.quran_reading_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quran_submissions_date ON public.quran_reading_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_quran_submissions_user_date ON public.quran_reading_submissions(user_id, submission_date);

-- Add comment
COMMENT ON TABLE public.quran_reading_submissions IS 'Stores Quran reading submissions for weekly reports';

-- Enable Row Level Security
ALTER TABLE public.quran_reading_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own submissions
CREATE POLICY "Users can view own submissions"
    ON public.quran_reading_submissions
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
    ON public.quran_reading_submissions
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own submissions
CREATE POLICY "Users can update own submissions"
    ON public.quran_reading_submissions
    FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Users can delete their own submissions
CREATE POLICY "Users can delete own submissions"
    ON public.quran_reading_submissions
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- Alternative: Add quran_reading_history column to employees table if it doesn't exist
-- ============================================

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'quran_reading_history'
    ) THEN
        ALTER TABLE public.employees
        ADD COLUMN quran_reading_history JSONB DEFAULT '[]'::JSONB;

        RAISE NOTICE 'Added quran_reading_history column to employees table';
    ELSE
        RAISE NOTICE 'quran_reading_history column already exists in employees table';
    END IF;
END $$;

-- ============================================
-- Verify setup
-- ============================================

-- Check if table was created
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('quran_reading_submissions', 'employees')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check RLS policies
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
WHERE tablename = 'quran_reading_submissions';
