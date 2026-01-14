-- =====================================================
-- DIAGNOSTIC LENGKAP: Cek Masalah Notification Update
-- =====================================================
-- Notification ID: 1768343067049-0.33882563793438203
-- User ID: 6000
--
-- Masalah: is_read tidak berubah saat notification diklik
-- Error: Supabase Response: {data: Array(0), error: null}
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy paste SELURUH script ini
-- 3. Run
-- 4. Lihat hasil di setiap step
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Cek apakah notification ADA di database
-- -----------------------------------------------------

SELECT '🔍 STEP 1: Cek Notification' as info,
    id,
    user_id,
    title,
    is_read,
    created_at
FROM notifications
WHERE id = '1768343067049-0.33882563793438203';

-- Jika return 0 row → Notification TIDAK ADA di database
-- Jika return 1 row → Notification ADA, lanjut ke STEP 2

-- -----------------------------------------------------
-- STEP 2: Cek semua notifications untuk user 6000
-- -----------------------------------------------------

SELECT '🔍 STEP 2: Cek Semua Notifications User 6000' as info,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read_count
FROM notifications
WHERE user_id = '6000';

-- -----------------------------------------------------
-- STEP 3: Cek RLS Policies
-- -----------------------------------------------------

SELECT '🔍 STEP 3: Cek RLS Policies' as info,
    policyname,
    cmd,
    roles,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- Pastikan ADA policy dengan cmd = 'UPDATE'

-- -----------------------------------------------------
-- STEP 4: Test Direct UPDATE (tanpa through Supabase client)
-- -----------------------------------------------------

-- Coba update notification
UPDATE notifications
SET is_read = true
WHERE id = '1768343067049-0.33882563793438203'
RETURNING
    '🧪 STEP 4: Test Direct UPDATE' as info,
    id,
    user_id,
    title,
    is_read,
    created_at;

-- Jika return 1 row → Direct UPDATE berhasil (masalah di RLS atau client)
-- Jika return 0 rows → Notification tidak ditemukan atau sudah di-update sebelumnya

-- -----------------------------------------------------
-- STEP 5: Reset ke unread untuk test selanjutnya
-- -----------------------------------------------------

UPDATE notifications
SET is_read = false
WHERE id = '1768343067049-0.33882563793438203'
RETURNING
    '🔄 STEP 5: Reset ke Unread' as info,
    id,
    title,
    is_read;

-- -----------------------------------------------------
-- STEP 6: Cek apakah ada trigger atau constraint
-- -----------------------------------------------------

SELECT
    '🔍 STEP 6: Cek Triggers' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications';

-- -----------------------------------------------------
-- STEP 7: Cek table structure
-- -----------------------------------------------------

SELECT
    '🔍 STEP 7: Cek Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- =====================================================
-- ANALISA HASIL
-- =====================================================
--
-- STEP 1:
--   - 0 rows → Notification TIDAK ADA di database
--   - 1 row → Notification ADA
--
-- STEP 4 (PENTING!):
--   - Return 1 row → Direct UPDATE berhasil
--     Artinya: Masalah ada di RLS Policy atau Supabase client
--     Solusi: RLS Policy perlu diperbaiki
--
--   - Return 0 rows → Direct UPDATE gagal
--     Artinya: Notification tidak ada atau ada masalah lain
--     Solusi: Cek user_id notification
--
-- Jika STEP 4 return 1 row:
--   → RLS Policy yang dibuat tadi bekerja untuk direct SQL
--   → Tapi mungkin tidak bekerja lewat Supabase client
--   → Masalahnya kemungkinan besar di user_id atau auth.uid()
--
-- =====================================================
