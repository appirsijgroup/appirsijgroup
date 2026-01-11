-- Fix RLS policy to allow employees to update their own monthly_activities
-- This script should be run in Supabase SQL Editor

-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admin update access for employees" ON employees;

-- Create a new policy that allows employees to update their own data
CREATE POLICY "Employees can update their own data"
    ON employees
    FOR UPDATE
    USING (id = auth.uid()::text);

-- Keep the public read policy
-- CREATE POLICY "Public read access for employees" ON employees
--     FOR SELECT USING (true);

-- Note: This allows employees to update their own records, including monthly_activities
-- If you need more granular control, you could create a separate policy just for monthly_activities updates