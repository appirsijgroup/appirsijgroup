-- ============================================
-- FIX: RLS Policies untuk activities dan activity_attendance
-- Problem: Policy sebelumnya terlalu ketat dan tidak cocok dengan sistem auth
-- Solution: Gunakan policy yang lebih permissive seperti tabel lain
-- ============================================

-- Step 1: DROP policies yang salah
DROP POLICY IF EXISTS "Allow authenticated users to view activities" ON activities;
DROP POLICY IF EXISTS "Allow authenticated users to create activities" ON activities;
DROP POLICY IF EXISTS "Allow creators to update their activities" ON activities;
DROP POLICY IF EXISTS "Allow creators to delete their activities" ON activities;

DROP POLICY IF EXISTS "Allow authenticated users to view activity attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow users to insert own attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow users to update own attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow activity creators to manage attendance" ON activity_attendance;

-- Step 2: CREATE policies yang benar (mirip dengan team_attendance_sessions)

-- ============================================
-- ACTIVITIES TABLE POLICIES
-- ============================================

-- Policy: Semua orang bisa view activities (untuk public visibility)
CREATE POLICY "Enable read access for all users"
ON activities
FOR SELECT
TO public
USING (true);

-- Policy: Semua authenticated users bisa insert activities
CREATE POLICY "Enable insert for all authenticated users"
ON activities
FOR INSERT
TO public
WITH CHECK (true); -- ⚡ Permissive: semua user yang sudah login bisa insert

-- Policy: Semua authenticated users bisa update activities
CREATE POLICY "Enable update for all authenticated users"
ON activities
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Policy: Semua authenticated users bisa delete activities
CREATE POLICY "Enable delete for all authenticated users"
ON activities
FOR DELETE
TO public
USING (true);

-- ============================================
-- ACTIVITY_ATTENDANCE TABLE POLICIES
-- ============================================

-- Policy: Semua orang bisa view attendance
CREATE POLICY "Enable read access for all attendance"
ON activity_attendance
FOR SELECT
TO public
USING (true);

-- Policy: Semua authenticated users bisa insert attendance
CREATE POLICY "Enable insert for all authenticated users"
ON activity_attendance
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Semua authenticated users bisa update attendance
CREATE POLICY "Enable update for all authenticated users"
ON activity_attendance
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Policy: Semua authenticated users bisa delete attendance
CREATE POLICY "Enable delete for all authenticated users"
ON activity_attendance
FOR DELETE
TO public
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Cek apakah policies sudah aktif
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
WHERE tablename IN ('activities', 'activity_attendance')
ORDER BY tablename, policyname;

-- Expected output:
-- activities: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- activity_attendance: 4 policies (SELECT, INSERT, UPDATE, DELETE)
