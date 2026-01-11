-- =====================================================
-- Create Settings Table for Global App Configuration
-- Purpose: Store global app settings like mutabaah locking mode
-- =====================================================

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT REFERENCES employees(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for app_settings
-- =====================================================

-- Policy 1: Allow everyone (public/authenticated) to READ settings
CREATE POLICY "Allow public read access to app_settings"
ON app_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 2: Only super_admin can UPDATE settings
CREATE POLICY "Allow super_admin to update app_settings"
ON app_settings
FOR UPDATE
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()
        AND employees.role = 'super-admin'
    )
);

-- Policy 3: Only super_admin can INSERT settings
CREATE POLICY "Allow super_admin to insert app_settings"
ON app_settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()
        AND employees.role = 'super-admin'
    )
);

-- =====================================================
-- Insert Default Settings
-- =====================================================

INSERT INTO app_settings (key, value, description)
VALUES
    ('mutabaah_locking_mode', 'weekly', 'Mode penguncian lembar mutaba''ah: weekly (perpekan) atau monthly (perbulan)')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Verify Setup
-- =====================================================

-- View all settings
SELECT * FROM app_settings;

-- =====================================================
-- Helper Function to Get Setting Value
-- =====================================================

CREATE OR REPLACE FUNCTION get_app_setting(setting_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN value FROM app_settings WHERE key = setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION get_app_setting(TEXT) TO anon, authenticated;

-- =====================================================
-- Finished Successfully!
-- =====================================================
