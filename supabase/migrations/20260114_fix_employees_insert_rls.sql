-- Fix employees table RLS policies to allow INSERT
-- This fixes the error: "new row violates row-level security policy for table 'employees'"

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;

-- Create INSERT policy to allow admins to add new employees
CREATE POLICY "Admins can insert employees"
    ON employees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin')
        )
    );

-- Verify all policies are in place
-- 1. Employees can view their own data
-- 2. Admins can view all employees
-- 3. Employees can update their own data
-- 4. Admins can update any employee
-- 5. Admins can insert employees (THIS WAS MISSING)
-- 6. Super admins can delete employees
