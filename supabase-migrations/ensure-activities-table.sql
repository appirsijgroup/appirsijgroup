-- =====================================================
-- MIGRATION: Ensure activities table exists
-- Purpose: Make sure activities table is available with correct structure
-- =====================================================

-- This migration ensures the activities table exists.
-- The table definition is in schema.sql, but we're verifying it here.

-- Check if the table exists, if not create it (for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activities'
        AND table_schema = 'public'
    ) THEN
        -- Table doesn't exist, create it
        CREATE TABLE activities (
            id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL, -- YYYY-MM-DD
            start_time TEXT NOT NULL, -- HH:MM
            end_time TEXT NOT NULL, -- HH:MM
            created_by TEXT NOT NULL,
            created_by_name TEXT NOT NULL,
            participant_ids TEXT[] DEFAULT '{}',
            zoom_url TEXT,
            youtube_url TEXT,
            activity_type TEXT CHECK (activity_type IN ('Umum', 'Kajian Selasa', 'Pengajian Persyarikatan')),
            status TEXT CHECK (status IN ('scheduled', 'postponed', 'cancelled')) DEFAULT 'scheduled',
            audience_type TEXT NOT NULL CHECK (audience_type IN ('public', 'rules', 'manual')),
            audience_rules JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

            FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
        CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

        RAISE NOTICE '✅ Created activities table';
    ELSE
        RAISE NOTICE '✅ activities table already exists';
    END IF;
END $$;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample activities if the table is empty
DO $$
DECLARE
    activity_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM activities;

    IF activity_count = 0 THEN
        -- Get first admin employee
        DECLARE
            admin_id TEXT;
            admin_name TEXT;
        BEGIN
            SELECT id, name INTO admin_id, admin_name
            FROM employees
            WHERE role IN ('admin', 'super-admin')
            LIMIT 1;

            IF admin_id IS NOT NULL THEN
                -- Insert sample Kajian Selasa
                INSERT INTO activities (
                    name,
                    description,
                    date,
                    start_time,
                    end_time,
                    created_by,
                    created_by_name,
                    activity_type,
                    audience_type,
                    status
                ) VALUES (
                    'Kajian Rutin Selasa',
                    'Kajian rutin mingguan yang membahas tafsir Al-Quran dan hadis.',
                    CURRENT_DATE + INTERVAL '1 day',
                    '10:00',
                    '11:30',
                    admin_id,
                    admin_name,
                    'Kajian Selasa',
                    'public',
                    'scheduled'
                );

                -- Insert sample Pengajian Persyarikatan
                INSERT INTO activities (
                    name,
                    description,
                    date,
                    start_time,
                    end_time,
                    created_by,
                    created_by_name,
                    activity_type,
                    audience_type,
                    status
                ) VALUES (
                    'Pengajian Persyarikatan',
                    'Pengajian rutin untuk persyarikatan setiap shift pagi.',
                    CURRENT_DATE,
                    '07:00',
                    '07:30',
                    admin_id,
                    admin_name,
                    'Pengajian Persyarikatan',
                    'public',
                    'scheduled'
                );

                RAISE NOTICE '✅ Inserted sample activities';
            ELSE
                RAISE NOTICE '⚠️ No admin user found, skipping sample data insertion';
            END IF;
        END;
    ELSE
        RAISE NOTICE '✅ activities table already has data, skipping sample insertion';
    END IF;
END $$;

-- Verify the table structure
SELECT
    'activities' as table_name,
    COUNT(*) as row_count,
    '✅ Table is ready' as status
FROM activities;

COMMENT ON TABLE activities IS 'Tabel untuk menampung semua kegiatan terjadwal (Kegiatan Terjadwal)';
