-- ============================================
-- COMPREHENSIVE FIX: Semua Masalah Audience & Data Sync
-- Berdasarkan struktur tabel yang SEBENARNYA ada
-- ============================================

-- ============================================
-- BAGIAN 1: ACTIVITIES TABLE
-- ============================================

-- 1.1 Set semua activities ke PUBLIC
UPDATE activities
SET audience_type = 'public'
WHERE audience_type IN ('rules', 'manual');

-- 1.2 Verify activities
SELECT
    '=== ACTIVITIES SET TO PUBLIC ===' as info,
    name,
    activity_type,
    audience_type,
    status,
    date
FROM activities
WHERE status = 'scheduled'
ORDER BY date;

-- ============================================
-- BAGIAN 2: TEAM_ATTENDANCE_SESSIONS TABLE
-- ============================================

-- 2.1 Tambah kolom status jika belum ada (karena tabel ini TIDAK punya status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'team_attendance_sessions'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE team_attendance_sessions
        ADD COLUMN status TEXT CHECK (status IN ('scheduled', 'postponed', 'cancelled')) DEFAULT 'scheduled';
    END IF;
END
$$;

-- 2.2 Ubah constraint audience_type untuk izinkan 'public'
ALTER TABLE team_attendance_sessions DROP CONSTRAINT IF EXISTS team_attendance_sessions_audience_type_check;

ALTER TABLE team_attendance_sessions
ADD CONSTRAINT team_attendance_sessions_audience_type_check
CHECK (audience_type IN ('public', 'rules', 'manual'));

-- 2.3 Set semua sessions ke PUBLIC
UPDATE team_attendance_sessions
SET
    audience_type = 'public',
    status = 'scheduled'
WHERE audience_type IN ('rules', 'manual');

-- 2.4 Verify team sessions
SELECT
    '=== TEAM SESSIONS SET TO PUBLIC ===' as info,
    type,
    audience_type,
    status,
    date
FROM team_attendance_sessions
ORDER BY date;

-- ============================================
-- BAGIAN 3: FIX RLS POLICIES (SEMUA TABEL)
-- ============================================

-- 3.1 Fix activities policies
DROP POLICY IF EXISTS "Activities: Select all" ON activities;
DROP POLICY IF EXISTS "Activities: Insert all" ON activities;
DROP POLICY IF EXISTS "Activities: Update all" ON activities;
DROP POLICY IF EXISTS "Activities: Delete all" ON activities;

CREATE POLICY "Activities: Select all" ON activities FOR SELECT TO public USING (true);
CREATE POLICY "Activities: Insert all" ON activities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Activities: Update all" ON activities FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Activities: Delete all" ON activities FOR DELETE TO public USING (true);

-- 3.2 Fix team_attendance_sessions policies
DROP POLICY IF EXISTS "Enable read access for all users" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can view all sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON team_attendance_sessions;

CREATE POLICY "TeamSessions: Select all" ON team_attendance_sessions FOR SELECT TO public USING (true);
CREATE POLICY "TeamSessions: Insert all" ON team_attendance_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "TeamSessions: Update all" ON team_attendance_sessions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "TeamSessions: Delete all" ON team_attendance_sessions FOR DELETE TO public USING (true);

-- 3.3 Fix activity_attendance policies
DROP POLICY IF EXISTS "ActivityAttendance: Select all" ON activity_attendance;
DROP POLICY IF EXISTS "ActivityAttendance: Insert all" ON activity_attendance;
DROP POLICY IF EXISTS "ActivityAttendance: Update all" ON activity_attendance;
DROP POLICY IF EXISTS "ActivityAttendance: Delete all" ON activity_attendance;

CREATE POLICY "ActivityAttendance: Select all" ON activity_attendance FOR SELECT TO public USING (true);
CREATE POLICY "ActivityAttendance: Insert all" ON activity_attendance FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ActivityAttendance: Update all" ON activity_attendance FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "ActivityAttendance: Delete all" ON activity_attendance FOR DELETE TO public USING (true);

-- 3.4 Fix employee_monthly_activities policies
DROP POLICY IF EXISTS "EmpMonthlyActivities: Select all" ON employee_monthly_activities;
DROP POLICY IF EXISTS "EmpMonthlyActivities: Insert all" ON employee_monthly_activities;
DROP POLICY IF EXISTS "EmpMonthlyActivities: Update all" ON employee_monthly_activities;
DROP POLICY IF EXISTS "EmpMonthlyActivities: Delete all" ON employee_monthly_activities;

CREATE POLICY "EmpMonthlyActivities: Select all" ON employee_monthly_activities FOR SELECT TO public USING (true);
CREATE POLICY "EmpMonthlyActivities: Insert all" ON employee_monthly_activities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "EmpMonthlyActivities: Update all" ON employee_monthly_activities FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "EmpMonthlyActivities: Delete all" ON employee_monthly_activities FOR DELETE TO public USING (true);

-- ============================================
-- BAGIAN 4: VERIFY SEMUA POLICIES
-- ============================================

SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('activities', 'team_attendance_sessions', 'activity_attendance', 'employee_monthly_activities')
ORDER BY tablename, policyname;

-- Expected:
-- - activities: 4 policies (Select, Insert, Update, Delete)
-- - team_attendance_sessions: 4 policies
-- - activity_attendance: 4 policies
-- - employee_monthly_activities: 4 policies

-- ============================================
-- BAGIAN 5: VERIFY DATA
-- ============================================

-- Count records
SELECT
    'activities' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE audience_type = 'public') as public_count,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count
FROM activities
UNION ALL
SELECT
    'team_attendance_sessions' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE audience_type = 'public') as public_count,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count
FROM team_attendance_sessions;

-- Expected result:
-- Semua audience_type = 'public'
-- Semua status = 'scheduled' (untuk sessions yang baru ditambah kolom status)
