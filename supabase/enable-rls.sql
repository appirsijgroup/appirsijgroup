-- Re-enable RLS after employee migration
-- Run this in Supabase SQL Editor after migration is complete

-- Re-enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Employees can update their own data" ON employees;
DROP POLICY IF EXISTS "Admins can update any employee" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Super admins can delete employees" ON employees;

-- Recreate policies
CREATE POLICY "Employees can view their own data"
    ON employees
    FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all employees"
    ON employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin')
        )
    );

CREATE POLICY "Employees can update their own data"
    ON employees
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Admins can update any employee"
    ON employees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin')
        )
    );

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

CREATE POLICY "Super admins can delete employees"
    ON employees
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role = 'super-admin'
        )
    );
