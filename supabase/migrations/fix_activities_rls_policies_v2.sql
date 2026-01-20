-- ============================================
-- FIX RLS POLICIES - PART 2: Complete Reset
-- ============================================

-- Step 1: Hapus SEMUA policies yang ada (gunakan IF EXISTS agar aman)
DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON activities;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON activities;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON activities;

DROP POLICY IF EXISTS "Enable read access for all attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON activity_attendance;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON activity_attendance;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON activity_attendance;

-- Juga drop policy lama yang mungkin masih ada
DROP POLICY IF EXISTS "Allow authenticated users to view activities" ON activities;
DROP POLICY IF EXISTS "Allow authenticated users to create activities" ON activities;
DROP POLICY IF EXISTS "Allow creators to update their activities" ON activities;
DROP POLICY IF EXISTS "Allow creators to delete their activities" ON activities;

DROP POLICY IF EXISTS "Allow authenticated users to view activity attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow users to insert own attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow users to update own attendance" ON activity_attendance;
DROP POLICY IF EXISTS "Allow activity creators to manage attendance" ON activity_attendance;

-- Step 2: Create policies baru dengan NAMA yang BERBEDA (untuk avoid conflict)

-- === ACTIVITIES ===
CREATE POLICY "Activities: Select all" ON activities FOR SELECT TO public USING (true);
CREATE POLICY "Activities: Insert all" ON activities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Activities: Update all" ON activities FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Activities: Delete all" ON activities FOR DELETE TO public USING (true);

-- === ACTIVITY_ATTENDANCE ===
CREATE POLICY "ActivityAttendance: Select all" ON activity_attendance FOR SELECT TO public USING (true);
CREATE POLICY "ActivityAttendance: Insert all" ON activity_attendance FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ActivityAttendance: Update all" ON activity_attendance FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "ActivityAttendance: Delete all" ON activity_attendance FOR DELETE TO public USING (true);

-- Step 3: Verifikasi
SELECT '=== ACTIVITIES POLICIES ===' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'activities'
ORDER BY policyname;

SELECT '=== ACTIVITY_ATTENDANCE POLICIES ===' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'activity_attendance'
ORDER BY policyname;
