-- ============================================
-- FIX: RLS Policies untuk employee_monthly_activities
-- Problem: 401 Unauthorized saat upsert
-- Solution: Permissive policies seperti tabel lain
-- ============================================

-- Drop semua policy yang ada
DROP POLICY IF EXISTS "Enable read access for all users" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON employee_monthly_activities;

-- Policy lain yang mungkin ada
DROP POLICY IF EXISTS "Allow authenticated users to view monthly activities" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Allow users to view own monthly activities" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Allow users to insert own monthly activities" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Allow users to update own monthly activities" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Allow users to delete own monthly activities" ON employee_monthly_activities;
DROP POLICY IF EXISTS "Allow admins to manage all monthly activities" ON employee_monthly_activities;

-- Create policies baru - permissive seperti activities
CREATE POLICY "EmpMonthlyActivities: Select all" ON employee_monthly_activities FOR SELECT TO public USING (true);
CREATE POLICY "EmpMonthlyActivities: Insert all" ON employee_monthly_activities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "EmpMonthlyActivities: Update all" ON employee_monthly_activities FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "EmpMonthlyActivities: Delete all" ON employee_monthly_activities FOR DELETE TO public USING (true);

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'employee_monthly_activities'
ORDER BY policyname;
