-- Fix: Add DEFAULT NOW() to created_at and updated_at if missing

-- Check if default exists first
SELECT
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attendance_sessions'
    AND column_name IN ('created_at', 'updated_at');

-- If created_at or updated_at don't have defaults, add them:
-- Run this ONLY if the above query shows column_default is NULL for either column

-- Step 1: Create a backup of existing data (optional but recommended)
-- CREATE TABLE team_attendance_sessions_backup AS SELECT * FROM team_attendance_sessions;

-- Step 2: Add defaults if they don't exist
-- First, make the columns nullable temporarily
ALTER TABLE team_attendance_sessions
    ALTER COLUMN created_at DROP NOT NULL;

ALTER TABLE team_attendance_sessions
    ALTER COLUMN updated_at DROP NOT NULL;

-- Add default values
ALTER TABLE team_attendance_sessions
    ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE team_attendance_sessions
    ALTER COLUMN updated_at SET DEFAULT NOW();

-- Update any existing NULL values
UPDATE team_attendance_sessions
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE team_attendance_sessions
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Make columns NOT NULL again
ALTER TABLE team_attendance_sessions
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE team_attendance_sessions
    ALTER COLUMN updated_at SET NOT NULL;

-- Step 3: Verify the fix
SELECT
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attendance_sessions'
    AND column_name IN ('created_at', 'updated_at');

-- Expected result should show:
-- created_at    | now()    | NO
-- updated_at    | now()    | NO
