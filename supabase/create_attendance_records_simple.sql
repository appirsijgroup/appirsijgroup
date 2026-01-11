-- SIMPLE VERSION: Create attendance_records table without complex RLS policies
-- Run this in Supabase SQL Editor

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS attendance_records CASCADE;

-- Create the table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir')),
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_late_entry BOOLEAN DEFAULT FALSE,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_employee_entity UNIQUE (employee_id, entity_id);

-- Create indexes
CREATE INDEX ON attendance_records(employee_id);
CREATE INDEX ON attendance_records(entity_id);
CREATE INDEX ON attendance_records(timestamp DESC);

-- IMPORTANT: Disable RLS for now (allow all access)
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE attendance_records IS 'Tracks employee attendance for daily prayers and activities';
COMMENT ON COLUMN attendance_records.employee_id IS 'Employee ID (NIP/NOPEG)';
COMMENT ON COLUMN attendance_records.entity_id IS 'Prayer or activity ID (e.g., subuh, dzuhur, ashar, maghrib, isya)';
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: hadir or tidak-hadir';
COMMENT ON COLUMN attendance_records.is_late_entry IS 'Whether this is a late entry submission';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'attendance_records table created successfully!';
    RAISE NOTICE 'RLS is DISABLED - all authenticated users can access';
END $$;
