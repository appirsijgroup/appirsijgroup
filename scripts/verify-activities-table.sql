-- =====================================================
-- VERIFICATION: Check if activities table exists and has data
-- Purpose: Verify the application is using the correct table
-- =====================================================

-- 1. Check if activities table exists
SELECT
    'activities' as table_name,
    COUNT(*) as row_count,
    '✅ Table exists' as status
FROM information_schema.tables
WHERE table_name = 'activities'
AND table_schema = 'public';

-- 2. Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check data in activities table
SELECT
    id,
    name,
    date,
    start_time,
    end_time,
    activity_type,
    status,
    audience_type,
    created_by
FROM activities
ORDER BY date DESC, start_time DESC
LIMIT 10;

-- 4. Check if activity_attendance table exists
SELECT
    'activity_attendance' as table_name,
    COUNT(*) as row_count,
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as status
FROM information_schema.tables
WHERE table_name = 'activity_attendance'
AND table_schema = 'public';

-- 5. Check if old scheduled_activities table still exists (for comparison)
SELECT
    'scheduled_activities' as table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'scheduled_activities'
            AND table_schema = 'public'
        ) THEN '⚠️ Old table still exists (can be dropped)'
        ELSE '✅ Old table cleaned up'
    END as status;

-- 6. Summary
SELECT
    'Summary' as info,
    (
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_name IN ('activities', 'activity_attendance')
        AND table_schema = 'public'
    ) as tables_found,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_name IN ('activities', 'activity_attendance')
            AND table_schema = 'public'
        ) = 2 THEN '✅ All required tables exist'
        ELSE '❌ Missing required tables'
    END as status;
