-- ================================================
-- Create employee_monthly_reports table
-- Required for storing Checklists / Mutabaah
-- Run this in Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS employee_monthly_reports (
    employee_id TEXT PRIMARY KEY,
    reports JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE employee_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can manage their own reports
CREATE POLICY "Users manage own reports" ON employee_monthly_reports
    FOR ALL
    USING (auth.uid()::TEXT = employee_id)
    WITH CHECK (auth.uid()::TEXT = employee_id);

-- Policy 2: Mentors can view their mentees' reports
CREATE POLICY "Mentors view mentees reports" ON employee_monthly_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = employee_id 
            AND mentor_id = auth.uid()::TEXT
        )
    );

-- Policy 3: Admins can view/manage all
CREATE POLICY "Admins manage all" ON employee_monthly_reports
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid()::TEXT 
            AND role IN ('admin', 'super-admin')
        )
    );

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
