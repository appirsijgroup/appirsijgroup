-- Fix RLS Policy for attendance_records table
-- This allows authenticated users to manage their own attendance records

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can update their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can delete their own attendance" ON attendance_records;

-- Create INSERT policy - Users can insert their own attendance records
CREATE POLICY "Users can insert their own attendance"
ON attendance_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = employee_id);

-- Create UPDATE policy - Users can update their own attendance records
CREATE POLICY "Users can update their own attendance"
ON attendance_records
FOR UPDATE
TO authenticated
USING (auth.uid()::text = employee_id)
WITH CHECK (auth.uid()::text = employee_id);

-- Create SELECT policy - Users can view their own attendance records
CREATE POLICY "Users can view their own attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (auth.uid()::text = employee_id);

-- Create DELETE policy - Users can delete their own attendance records
CREATE POLICY "Users can delete their own attendance"
ON attendance_records
FOR DELETE
TO authenticated
USING (auth.uid()::text = employee_id);

-- Optional: Admin can view all attendance records
-- Uncomment this if you have an admin role
/*
CREATE POLICY "Admins can view all attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE id = auth.uid()::text
    AND role IN ('super-admin', 'admin')
  )
);
*/
