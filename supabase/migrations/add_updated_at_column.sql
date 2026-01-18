-- Fix: Add updated_at column if it doesn't exist

-- Step 1: Check existing columns
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attendance_sessions'
ORDER BY ordinal_position;

-- Step 2: Add updated_at column if it doesn't exist
ALTER TABLE team_attendance_sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Fix created_at default if it's missing
ALTER TABLE team_attendance_sessions
    ALTER COLUMN created_at SET DEFAULT NOW();

-- Step 4: Verify both columns have defaults
SELECT
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attendance_sessions'
    AND column_name IN ('created_at', 'updated_at');

-- Expected result:
-- created_at  | now()  | NO
-- updated_at  | now()  | YES
