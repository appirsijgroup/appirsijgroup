-- Create app_settings table for global application settings
-- This table stores key-value pairs for application-wide settings
-- that affect all users (e.g., mutabaah locking mode)

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read settings
CREATE POLICY "Public read access to app settings"
ON app_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only super-admins can update settings
CREATE POLICY "Super-admin can update app settings"
ON app_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()::text
        AND employees.role = 'super-admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()::text
        AND employees.role = 'super-admin'
    )
);

-- Policy: Only super-admins can insert settings
CREATE POLICY "Super-admin can insert app settings"
ON app_settings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()::text
        AND employees.role = 'super-admin'
    )
);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
    ('mutabaah_locking_mode', 'weekly', 'Mode penguncian lembar mutaba''ah: weekly (dikunci per pekan) atau monthly (bebas mengisi selama bulan berjalan)')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

-- Add comment
COMMENT ON TABLE app_settings IS 'Global application settings that affect all users. Only super-admins can modify these settings.';
COMMENT ON COLUMN app_settings.key IS 'Unique identifier for the setting (e.g., mutabaah_locking_mode)';
COMMENT ON COLUMN app_settings.value IS 'Current value of the setting';
COMMENT ON COLUMN app_settings.description IS 'Human-readable description of what this setting does';
COMMENT ON COLUMN app_settings.updated_by IS 'ID of the super-admin who last updated this setting';
