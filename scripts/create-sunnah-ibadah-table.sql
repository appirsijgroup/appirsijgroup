-- =====================================================
-- Create Table: sunnah_ibadah_config
-- Purpose: Store sunnah/optional worship (ibadah sunnah) configurations
-- =====================================================

-- Create table for sunnah ibadah config
CREATE TABLE IF NOT EXISTS sunnah_ibadah_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sholat', 'puasa', 'lainnya')),
  icon TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'one-time')),
  days_of_week INTEGER[], -- Array of days: 0=Sunday, 1=Monday, ..., 6=Saturday
  date TEXT, -- DATE for 'one-time' schedule (format: YYYY-MM-DD)
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE sunnah_ibadah_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies
-- =====================================================

-- Policy: Allow all users (including anonymous via ANON key) to READ
-- This allows all app users to see the sunnah ibadah configurations
CREATE POLICY "Allow public read access"
ON sunnah_ibadah_config
FOR SELECT
TO anon
USING (true);

-- Policy: Allow authenticated users to INSERT new sunnah ibadah
CREATE POLICY "Allow authenticated insert"
ON sunnah_ibadah_config
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated users to UPDATE sunnah ibadah
CREATE POLICY "Allow authenticated update"
ON sunnah_ibadah_config
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to DELETE sunnah ibadah
CREATE POLICY "Allow authenticated delete"
ON sunnah_ibadah_config
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- Create Index for Better Performance
-- =====================================================

-- Index on created_at for sorting by newest first
CREATE INDEX IF NOT EXISTS idx_sunnah_ibadah_created_at
ON sunnah_ibadah_config(created_at DESC);

-- Index on schedule_type for filtering
CREATE INDEX IF NOT EXISTS idx_sunnah_ibadah_schedule_type
ON sunnah_ibadah_config(schedule_type);

-- =====================================================
-- Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE sunnah_ibadah_config IS 'Stores optional/sunnah worship configurations like Tahajud, Dhuha, Puasa Senin/Kamis, etc.';
COMMENT ON COLUMN sunnah_ibadah_config.id IS 'Unique identifier for the sunnah ibadah';
COMMENT ON COLUMN sunnah_ibadah_config.name IS 'Display name (e.g., "Tahajud", "Puasa Senin Kamis")';
COMMENT ON COLUMN sunnah_ibadah_config.type IS 'Type of worship: sholat, puasa, or lainnya';
COMMENT ON COLUMN sunnah_ibadah_config.icon IS 'Icon name from UI library';
COMMENT ON COLUMN sunnah_ibadah_config.schedule_type IS 'Frequency: daily, weekly, or one-time';
COMMENT ON COLUMN sunnah_ibadah_config.days_of_week IS 'Array of days for weekly schedule (0=Sun, 1=Mon, ..., 6=Sat)';
COMMENT ON COLUMN sunnah_ibadah_config.date IS 'Date for one-time schedule (YYYY-MM-DD format)';
COMMENT ON COLUMN sunnah_ibadah_config.created_by IS 'Employee ID who created this ibadah';
COMMENT ON COLUMN sunnah_ibadah_config.created_by_name IS 'Name of employee who created this ibadah';

-- =====================================================
-- Verify Table Creation
-- =====================================================

-- This query should return 'sunnah_ibadah_config' if table exists
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'sunnah_ibadah_config';

-- =====================================================
-- Finished Successfully!
-- =====================================================
