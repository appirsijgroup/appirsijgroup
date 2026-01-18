-- Fix: Drop and Recreate RLS Policies for team_attendance_sessions

-- Step 1: Drop all existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Public read access for team attendance sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can view all sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON team_attendance_sessions;

-- Step 2: Create fresh policies
CREATE POLICY "Public read access for team attendance sessions"
ON team_attendance_sessions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can create sessions"
ON team_attendance_sessions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
ON team_attendance_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sessions"
ON team_attendance_sessions
FOR DELETE
TO anon
USING (true);

-- Step 3: Verify policies are created
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
WHERE tablename = 'team_attendance_sessions';
