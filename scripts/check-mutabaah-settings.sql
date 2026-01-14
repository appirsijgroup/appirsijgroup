-- ============================================================
-- CHECK AND VERIFY MUTABAAH SETTINGS IN SUPABASE
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to verify settings
-- ============================================================

-- 1. CHECK CURRENT MUTABAAH LOCKING MODE SETTING
-- -------------------------------------------
SELECT
    key,
    value,
    description,
    updated_at,
    updated_by
FROM app_settings
WHERE key = 'mutabaah_locking_mode';

-- 2. VERIFY REALTIME IS ENABLED FOR APP_SETTINGS TABLE
-- -------------------------------------------
SELECT
    schemaname,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
        ) THEN '✅ Realtime Enabled'
        ELSE '❌ Realtime NOT Enabled'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'app_settings';

-- 3. MANUAL UPDATE SETTING (IF NEEDED FOR TESTING)
-- -------------------------------------------
-- Uncomment and run to manually update the setting:

-- UPDATE app_settings
-- SET value = 'monthly',  -- or 'weekly'
--     updated_at = NOW(),
--     updated_by = '<YOUR_USER_ID>'
-- WHERE key = 'mutabaah_locking_mode';

-- 4. CHECK RLS POLICIES FOR APP_SETTINGS
-- -------------------------------------------
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'app_settings';

-- 5. ENABLE REALTIME FOR APP_SETTINGS (IF NOT ALREADY ENABLED)
-- -------------------------------------------
-- Run this if realtime is not enabled:
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

-- ============================================================
-- TESTING CHECKLIST:
-- ============================================================
-- 1. Run query #1 to see current setting value
-- 2. Run query #2 to verify realtime is enabled
-- 3. In your app, login as Super Admin
-- 4. Change the mutabaah locking mode setting
-- 5. Check browser console for logs with 🔥, ✅, 🔄, 📢, 📊 emojis
-- 6. Run query #1 again to verify value changed in Supabase
-- 7. Login as regular user in different browser/incognito
-- 8. Check if they see the updated setting
-- ============================================================
