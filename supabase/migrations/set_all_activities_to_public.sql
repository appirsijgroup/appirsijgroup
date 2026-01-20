-- ============================================
-- QUICK FIX: Set semua activities & sessions ke PUBLIC
-- Purpose: Memastikan semua data muncul dulu
-- ============================================

-- 1. Set semua activities ke PUBLIC
UPDATE activities
SET audience_type = 'public'
WHERE status = 'scheduled';

-- 2. Set semua team attendance sessions ke PUBLIC
UPDATE team_attendance_sessions
SET audience_type = 'public'
WHERE status = 'scheduled';

-- 3. Verify hasil
SELECT
    '=== ACTIVITIES ===' as table_name,
    name,
    activity_type,
    audience_type,
    status
FROM activities
WHERE status = 'scheduled';

SELECT
    '=== TEAM SESSIONS ===' as table_name,
    type,
    audience_type,
    status
FROM team_attendance_sessions
WHERE status = 'scheduled';
