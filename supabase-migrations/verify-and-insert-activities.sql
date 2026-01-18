-- =====================================================
-- VERIFICATION & DATA INSERTION SCRIPT
-- Purpose: Check if activities table exists and insert sample data
-- =====================================================

-- Step 1: Check if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activities'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ Table activities exists';
    ELSE
        RAISE EXCEPTION '❌ Table activities does NOT exist. Please run schema.sql first';
    END IF;
END $$;

-- Step 2: Show current table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Show existing data
SELECT * FROM activities LIMIT 10;

-- Step 4: Count existing activities
SELECT COUNT(*) as activity_count FROM activities;

-- Step 5: Insert sample data if table is empty
DO $$
DECLARE
    activity_count INTEGER;
    admin_id TEXT;
    admin_name TEXT;
    today_date TEXT;
BEGIN
    -- Count existing activities
    SELECT COUNT(*) INTO activity_count FROM activities;

    IF activity_count = 0 THEN
        RAISE NOTICE '⚠️ No activities found. Will insert sample data...';

        -- Try to get an admin user
        SELECT id, name INTO admin_id, admin_name
        FROM employees
        WHERE role IN ('admin', 'super-admin')
        LIMIT 1;

        IF admin_id IS NULL THEN
            RAISE NOTICE '⚠️ No admin user found, creating sample activities with placeholder creator';
            admin_id := 'admin-placeholder';
            admin_name := 'System Admin';
        ELSE
            RAISE NOTICE '✅ Found admin user: % (%)', admin_name, admin_id;
        END IF;

        -- Get today's date
        today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

        -- Insert 1: Kajian Rutin Selasa (tomorrow)
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
            today_date::DATE + INTERVAL '1 day',
            '10:00',
            '11:30',
            admin_id,
            admin_name,
            'Kajian Selasa',
            'public',
            'scheduled'
        );

        RAISE NOTICE '✅ Inserted: Kajian Rutin Selasa';

        -- Insert 2: Pengajian Persyarikatan (today)
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
            today_date,
            '07:00',
            '07:30',
            admin_id,
            admin_name,
            'Pengajian Persyarikatan',
            'public',
            'scheduled'
        );

        RAISE NOTICE '✅ Inserted: Pengajian Persyarikatan';

        -- Insert 3: Kegiatan Umum with manual participants
        INSERT INTO activities (
            name,
            description,
            date,
            start_time,
            end_time,
            created_by,
            created_by_name,
            zoom_url,
            activity_type,
            audience_type,
            participant_ids,
            status
        ) VALUES (
            'Pelatihan Leadership',
            'Pelatihan kepemimpinan untuk karyawan terpilih.',
            today_date::DATE + INTERVAL '2 days',
            '13:00',
            '15:00',
            admin_id,
            admin_name,
            'https://zoom.us/j/123456789',
            'Umum',
            'manual',
            ARRAY[]::TEXT[],
            'scheduled'
        );

        RAISE NOTICE '✅ Inserted: Pelatihan Leadership';

        -- Insert 4: Activity with rules-based audience
        INSERT INTO activities (
            name,
            description,
            date,
            start_time,
            end_time,
            created_by,
            created_by_name,
            youtube_url,
            activity_type,
            audience_type,
            audience_rules,
            status
        ) VALUES (
            'Seminar Kesehatan',
            'Seminar kesehatan untuk staff medis.',
            today_date::DATE + INTERVAL '3 days',
            '09:00',
            '12:00',
            admin_id,
            admin_name,
            'https://youtube.com/watch?v=example',
            'Umum',
            'rules',
            '{
                "hospitalIds": [],
                "units": [],
                "bagians": [],
                "professionCategories": ["MEDIS"],
                "professions": []
            }'::JSONB,
            'scheduled'
        );

        RAISE NOTICE '✅ Inserted: Seminar Kesehatan';

        RAISE NOTICE '🎉 Successfully inserted 4 sample activities!';

    ELSE
        RAISE NOTICE 'ℹ️ Table already has % activities. Skipping insertion.', activity_count;
    END IF;
END $$;

-- Step 6: Verify the insertions
SELECT
    'Final Count' as step,
    COUNT(*) as count
FROM activities;

-- Step 7: Show all activities
SELECT
    id,
    name,
    activity_type,
    date,
    start_time,
    end_time,
    audience_type,
    status,
    created_by_name
FROM activities
ORDER BY date ASC, start_time ASC;
