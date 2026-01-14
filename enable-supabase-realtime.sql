-- ============================================================
-- SUPABASE REALTIME SETUP FOR LEMBAR MUTABA'AH
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to enable realtime features
-- ============================================================

-- 1. ENABLE REALTIME FOR EMPLOYEES TABLE
-- -------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- 2. ENABLE REALTIME FOR WEEKLY_REPORT_SUBMISSIONS TABLE (if exists)
-- -------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE weekly_report_submissions;

-- 3. ENABLE REALTIME FOR NOTIFICATIONS TABLE (if exists)
-- -------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 4. ENABLE REALTIME FOR APP_SETTINGS TABLE
-- -------------------------------------------
-- This enables realtime updates for global settings like mutabaah locking mode
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

-- ============================================================
-- VERIFY REALTIME IS ENABLED
-- ============================================================
-- Run this query to check which tables have realtime enabled:

SELECT
    schemaname,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
        ) THEN '✅ Enabled'
        ELSE '❌ Not Enabled'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('employees', 'weekly_report_submissions', 'notifications', 'app_settings')
ORDER BY tablename;

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. After running this script, realtime will be enabled for employees and app_settings tables
-- 2. Any UPDATE, INSERT, or DELETE on these tables will trigger realtime updates
-- 3. The MutabaahContext in your app will automatically receive these updates
-- 4. For app_settings, all users will receive realtime updates when super-admin changes global settings
-- 5. Make sure your Supabase project has Realtime enabled in the dashboard:
--    - Go to Database > Replication
--    - Ensure "Realtime" is enabled for your project
-- 6. If you encounter issues, check Supabase logs:
--    - Database > Logs > Realtime
-- ============================================================
