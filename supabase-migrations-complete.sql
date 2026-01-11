-- ============================================
-- DATABASE NORMALIZATION - COMPLETE MIGRATION
-- Run this in Supabase SQL Editor
--
**Purpose:** Separate growing data from employees table
- Create separate tables for each data type
- Migrate existing data from JSON fields
- Update indexes and RLS policies
-- ============================================

-- ============================================
-- 1. QURAN READING SUBMISSIONS
-- ============================================

-- Create table if not exists
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

    CONSTRAINT fk_quran_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quran_submissions_user_id ON public.quran_reading_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quran_submissions_date ON public.quran_reading_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_quran_submissions_user_date ON public.quran_reading_submissions(user_id, submission_date);

-- RLS
ALTER TABLE public.quran_reading_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Quran submissions" ON public.quran_reading_submissions;
CREATE POLICY "Users can view own Quran submissions"
    ON public.quran_reading_submissions
    FOR SELECT
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own Quran submissions" ON public.quran_reading_submissions;
CREATE POLICY "Users can insert own Quran submissions"
    ON public.quran_reading_submissions
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own Quran submissions" ON public.quran_reading_submissions;
CREATE POLICY "Users can update own Quran submissions"
    ON public.quran_reading_submissions
    FOR UPDATE
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own Quran submissions" ON public.quran_reading_submissions;
CREATE POLICY "Users can delete own Quran submissions"
    ON public.quran_reading_submissions
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- 2. READING HISTORY (Buku)
-- ============================================

CREATE TABLE IF NOT EXISTS public.reading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    pages_read INTEGER,
    date_completed DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_reading_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reading_user_id ON public.reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_date ON public.reading_history(date_completed);
CREATE INDEX IF NOT EXISTS idx_reading_user_date ON public.reading_history(user_id, date_completed);

-- RLS
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading history" ON public.reading_history;
CREATE POLICY "Users can view own reading history"
    ON public.reading_history
    FOR SELECT
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own reading history" ON public.reading_history;
CREATE POLICY "Users can insert own reading history"
    ON public.reading_history
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own reading history" ON public.reading_history;
CREATE POLICY "Users can update own reading history"
    ON public.reading_history
    FOR UPDATE
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own reading history" ON public.reading_history;
CREATE POLICY "Users can delete own reading history"
    ON public.reading_history
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- 3. ATTENDANCE RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    entity_id TEXT NOT NULL, -- prayer_id or activity_id
    entity_type TEXT NOT NULL, -- 'prayer' or 'activity'
    status TEXT NOT NULL, -- 'hadir', 'tidak-hadir', null
    reason TEXT,
    timestamp BIGINT NOT NULL,
    is_late_entry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_attendance_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_entity_id ON public.attendance_records(entity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON public.attendance_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_user_entity ON public.attendance_records(user_id, entity_id);

-- RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
CREATE POLICY "Users can view own attendance"
    ON public.attendance_records
    FOR SELECT
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
CREATE POLICY "Users can insert own attendance"
    ON public.attendance_records
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;
CREATE POLICY "Users can update own attendance"
    ON public.attendance_records
    FOR UPDATE
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own attendance" ON public.attendance_records;
CREATE POLICY "Users can delete own attendance"
    ON public.attendance_records
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- 4. BOOKMARKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_bookmark_user_id
        FOREIGN KEY (user_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookmark_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_surah_ayah ON public.bookmarks(surah_number, ayah_number);
CREATE INDEX IF NOT EXISTS idx_bookmark_user_surah ON public.bookmarks(user_id, surah_number);

-- Unique constraint: one bookmark per surah:ayah per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_user_surah_ayah_unique
    ON public.bookmarks(user_id, surah_number, ayah_number);

-- RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks
    FOR SELECT
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks
    FOR UPDATE
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- 5. DATA MIGRATION FROM EMPLOYEES
-- ============================================

-- Migrate Quran Reading History
DO $$
DECLARE
    employee_record RECORD;
    migration_count INTEGER := 0;
BEGIN
    FOR employee_record IN
        SELECT id, quran_reading_history
        FROM public.employees
        WHERE quran_reading_history IS NOT NULL
          AND jsonb_array_length(quran_reading_history) > 0
    LOOP
        -- Insert each Quran reading entry
        INSERT INTO public.quran_reading_submissions (user_id, surah_number, surah_name, start_ayah, end_ayah, submission_date)
        SELECT
            employee_record.id,
            (entry->>'surahNumber')::INTEGER,
            entry->>'surahName',
            (entry->>'startAyah')::INTEGER,
            (entry->>'endAyah')::INTEGER,
            entry->>'date'
        FROM jsonb_array_elements(employee_record.quran_reading_history) AS entry;

        GET DIAGNOSTICS migration_count = ROW_COUNT;
    END LOOP;

    RAISE NOTICE 'Quran reading history migrated: % records', migration_count;
END $$;

-- Migrate Reading History (Books)
DO $$
DECLARE
    employee_record RECORD;
    migration_count INTEGER := 0;
BEGIN
    FOR employee_record IN
        SELECT id, reading_history
        FROM public.employees
        WHERE reading_history IS NOT NULL
          AND jsonb_array_length(reading_history) > 0
    LOOP
        INSERT INTO public.reading_history (user_id, book_title, pages_read, date_completed, notes)
        SELECT
            employee_record.id,
            entry->>'bookTitle',
            (entry->>'pagesRead')::INTEGER,
            entry->>'dateCompleted',
            entry->>'notes'
        FROM jsonb_array_elements(employee_record.reading_history) AS entry;

        GET DIAGNOSTICS migration_count = ROW_COUNT;
    END LOOP;

    RAISE NOTICE 'Reading history migrated: % records', migration_count;
END $$;

-- ============================================
-- 6. CLEANUP: Remove JSON fields from employees
-- WARNING: Only run AFTER confirming migration success!
-- ============================================

-- Uncomment these AFTER verifying data migration success:
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS quran_reading_history;
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS reading_history;
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS bookmarks;

-- ============================================
-- 7. VERIFY MIGRATION
-- ============================================

-- Count records in each table
SELECT
    'quran_reading_submissions' as table_name,
    COUNT(*) as record_count
FROM public.quran_reading_submissions
UNION ALL
SELECT
    'reading_history' as table_name,
    COUNT(*) as record_count
FROM public.reading_history
UNION ALL
SELECT
    'bookmarks' as table_name,
    COUNT(*) as record_count
FROM public.bookmarks;

-- Check if employees still have JSON data
SELECT
    id,
    jsonb_array_length(quran_reading_history) as quran_history_count,
    jsonb_array_length(reading_history) as reading_history_count
FROM public.employees
WHERE quran_reading_history IS NOT NULL OR reading_history IS NOT NULL;

RAISE NOTICE '===========================================';
RAISE NOTICE 'MIGRATION COMPLETED!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Verify data in new tables';
RAISE NOTICE '2. Update application code';
RAISE NOTICE '3. Test all features';
RAISE NOTICE '4. Run cleanup SQL to drop JSON columns';
RAISE NOTICE '===========================================';
