-- ========================================================
-- PURPOSE: Update constraint to allow BBQ and UMUM session types
-- EXECUTION: Run this in Supabase SQL Editor
-- ========================================================

-- 1. Drop the existing check constraint from team_attendance_sessions
ALTER TABLE public.team_attendance_sessions 
DROP CONSTRAINT IF EXISTS team_attendance_sessions_type_check;

-- 2. Add the updated check constraint including 'BBQ' and 'UMUM'
ALTER TABLE public.team_attendance_sessions 
ADD CONSTRAINT team_attendance_sessions_type_check 
CHECK (type IN ('KIE', 'Doa Bersama', 'BBQ', 'UMUM'));

-- 3. Also update the tadarus_sessions category check if needed
-- (Though we are moving towards team_attendance_sessions)
ALTER TABLE public.tadarus_sessions 
DROP CONSTRAINT IF EXISTS tadarus_sessions_category_check;

ALTER TABLE public.tadarus_sessions 
ADD CONSTRAINT tadarus_sessions_category_check 
CHECK (category IN ('UMUM', 'BBQ'));

-- 4. Verify the changes
COMMENT ON TABLE public.team_attendance_sessions IS 'Updated to support BBQ and UMUM types';
