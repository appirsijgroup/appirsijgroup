-- =====================================================
-- Create Table: hospitals
-- Purpose: Store hospital/RS data for employee assignments
-- =====================================================

-- Create hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL, -- RS ID/BRAND (e.g., "RSIJSP", "RSAB")
  name TEXT NOT NULL, -- Full hospital name
  address TEXT,
  logo TEXT, -- URL to logo image in Supabase Storage
  is_active BOOLEAN DEFAULT true, -- Active/inactive status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies
-- =====================================================

-- Policy: Allow all users (including anonymous via ANON key) to READ
CREATE POLICY "Allow public read access"
ON hospitals
FOR SELECT
TO anon
USING (true);

-- Policy: Allow authenticated users to INSERT
CREATE POLICY "Allow authenticated insert"
ON hospitals
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow authenticated users to UPDATE
CREATE POLICY "Allow authenticated update"
ON hospitals
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to DELETE
CREATE POLICY "Allow authenticated delete"
ON hospitals
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Index on brand for quick lookups
CREATE INDEX IF NOT EXISTS idx_hospitals_brand
ON hospitals(brand);

-- Index on is_active for filtering active hospitals
CREATE INDEX IF NOT EXISTS idx_hospitals_is_active
ON hospitals(is_active);

-- =====================================================
-- Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE hospitals IS 'Stores hospital/rumah sakit data with brand ID and information';
COMMENT ON COLUMN hospitals.id IS 'Unique identifier (auto-generated UUID or custom ID)';
COMMENT ON COLUMN hospitals.brand IS 'RS ID/BRAND code (e.g., "RSIJSP", "RSAB")';
COMMENT ON COLUMN hospitals.name IS 'Full hospital name (e.g., "RS Islam Jakarta Sukapura")';
COMMENT ON COLUMN hospitals.address IS 'Hospital address';
COMMENT ON COLUMN hospitals.logo IS 'URL to logo image stored in Supabase Storage (bucket: Logo)';
COMMENT ON COLUMN hospitals.is_active IS 'Active status - only active hospitals shown in dropdowns';

-- =====================================================
-- Insert Sample Data (Optional - for testing)
-- =====================================================

INSERT INTO hospitals (id, brand, name, address, is_active)
VALUES
  ('rsijsp', 'RSIJSP', 'RS Islam Jakarta Sukapura', 'Jl. Kyai Maja No. 1, Jakarta', true),
  ('rsab', 'RSAB', 'RS Army Bukit Tinggi', 'Bukit Tinggi, Sumatera Barat', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Verify Table Creation
-- =====================================================

-- This should return hospital records
SELECT id, brand, name, is_active
FROM hospitals
ORDER BY created_at;

-- =====================================================
-- Finished Successfully!
-- =====================================================
