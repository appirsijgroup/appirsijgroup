-- Create attendance_records table for daily prayer attendance
-- This table tracks employee attendance for prayers and other activities

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL, -- ID of the prayer/activity (e.g., "subuh", "dzuhur", etc.)
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir')),
    reason TEXT, -- Optional reason for not attending
    timestamp TIMESTAMPTZ NOT NULL,
    is_late_entry BOOLEAN DEFAULT FALSE,
    location TEXT, -- JSON stringified geolocation: {"latitude": -6.2, "longitude": 106.8}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per employee per entity per day
    -- Note: For simplicity, we're using employee_id + entity_id as unique
    -- You could add date field for more granular control
    CONSTRAINT attendance_records_employee_entity UNIQUE (employee_id, entity_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_entity_id ON attendance_records(entity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_timestamp ON attendance_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- Add Row Level Security (RLS) policies
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Since this app uses NIP (TEXT) as employee_id and not auth.uid() (UUID),
-- we'll use a simpler approach for now: allow all authenticated users to access.

-- Policy: Allow all authenticated users to view attendance
CREATE POLICY "Allow authenticated users to view attendance"
    ON attendance_records
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to insert attendance
CREATE POLICY "Allow authenticated users to insert attendance"
    ON attendance_records
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update attendance
CREATE POLICY "Allow authenticated users to update attendance"
    ON attendance_records
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Note: Delete policy omitted for now - can be added later with proper user mapping

-- Add comment for documentation
COMMENT ON TABLE attendance_records IS 'Tracks employee attendance for daily prayers and activities';
COMMENT ON COLUMN attendance_records.employee_id IS 'Employee ID (NIP/NOPEG)';
COMMENT ON COLUMN attendance_records.entity_id IS 'Prayer or activity ID (e.g., subuh, dzuhur, ashar, maghrib, isya)';
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: hadir or tidak-hadir';
COMMENT ON COLUMN attendance_records.reason IS 'Optional reason for not attending';
COMMENT ON COLUMN attendance_records.is_late_entry IS 'Whether this is a late entry submission';
COMMENT ON COLUMN attendance_records.location IS 'Geolocation data as JSON string';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_records_updated_at();
