-- =====================================================
-- COMPLETE ACTIVITIES SETUP SCRIPT
-- Purpose: Create all tables and insert sample data
-- Run this in Supabase SQL Editor or via CLI
-- =====================================================

\echo '====================================================='
\echo 'ACTIVITIES COMPLETE SETUP'
\echo '====================================================='

-- =====================================================
-- STEP 1: CREATE activities TABLE (if not exists)
-- =====================================================

\echo ''
\echo 'Step 1: Creating activities table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activities'
        AND table_schema = 'public'
    ) THEN
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

        CREATE INDEX idx_activities_date ON activities(date);
        CREATE INDEX idx_activities_type ON activities(activity_type);
        CREATE INDEX idx_activities_status ON activities(status);

        RAISE NOTICE '✅ activities table created';
    ELSE
        RAISE NOTICE '✅ activities table already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE activity_attendance TABLE (if not exists)
-- =====================================================

\echo ''
\echo 'Step 2: Creating activity_attendance table...'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activity_attendance'
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE activity_attendance (
            id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
            activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
            reason TEXT,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_late_entry BOOLEAN DEFAULT false,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(activity_id, employee_id)
        );

        CREATE INDEX idx_activity_attendance_activity ON activity_attendance(activity_id);
        CREATE INDEX idx_activity_attendance_employee ON activity_attendance(employee_id);
        CREATE INDEX idx_activity_attendance_status ON activity_attendance(status);

        RAISE NOTICE '✅ activity_attendance table created';
    ELSE
        RAISE NOTICE '✅ activity_attendance table already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 3: INSERT SAMPLE DATA
-- =====================================================

\echo ''
\echo 'Step 3: Inserting sample activities...'

DO $$
DECLARE
    activity_count INTEGER;
    admin_id TEXT;
    admin_name TEXT;
    today_date TEXT;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM activities;

    IF activity_count = 0 THEN
        -- Get admin user
        SELECT id, name INTO admin_id, admin_name
        FROM employees
        WHERE role IN ('admin', 'super-admin')
        LIMIT 1;

        IF admin_id IS NULL THEN
            admin_id := 'admin-placeholder';
            admin_name := 'System Admin';
        END IF;

        today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

        -- Insert sample activities
        INSERT INTO activities (name, description, date, start_time, end_time, created_by, created_by_name, activity_type, audience_type, status) VALUES
            ('Kajian Rutin Selasa', 'Kajian rutin mingguan yang membahas tafsir Al-Quran dan hadis.', today_date::DATE + INTERVAL '1 day', '10:00', '11:30', admin_id, admin_name, 'Kajian Selasa', 'public', 'scheduled'),
            ('Pengajian Persyarikatan', 'Pengajian rutin untuk persyarikatan setiap shift pagi.', today_date, '07:00', '07:30', admin_id, admin_name, 'Pengajian Persyarikatan', 'public', 'scheduled'),
            ('Pelatihan Leadership', 'Pelatihan kepemimpinan untuk karyawan terpilih.', today_date::DATE + INTERVAL '2 days', '13:00', '15:00', admin_id, admin_name, 'Umum', 'public', 'scheduled'),
            ('Seminar Kesehatan', 'Seminar kesehatan untuk semua staff.', today_date::DATE + INTERVAL '3 days', '09:00', '12:00', admin_id, admin_name, 'Umum', 'public', 'scheduled');

        RAISE NOTICE '✅ Inserted 4 sample activities';
    ELSE
        RAISE NOTICE 'ℹ️ Activities table already has data';
    END IF;
END $$;

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

\echo ''
\echo 'Step 4: Verification...'
\echo ''

-- Count tables
SELECT
    'activities' as table_name,
    COUNT(*) as row_count
FROM activities
UNION ALL
SELECT
    'activity_attendance' as table_name,
    COUNT(*) as row_count
FROM activity_attendance;

-- Show sample data
\echo ''
\echo 'Sample Activities:'
\echo '=================='

SELECT
    name,
    activity_type,
    date,
    start_time || ' - ' || end_time as time,
    audience_type,
    status
FROM activities
ORDER BY date, start_time
LIMIT 5;

\echo ''
\echo '====================================================='
\echo '✅ SETUP COMPLETE!'
\echo '====================================================='
\echo 'You can now use the activities feature in your app.'
\echo ''
