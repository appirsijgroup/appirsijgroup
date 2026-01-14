-- =====================================================
-- FIX NOTIFICATION RLS POLICY FOR UPDATE OPERATIONS
-- =====================================================
-- Masalah: Notification tidak bisa di-update (is_read tidak berubah)
-- Solusi: Perbaiki RLS Policy dan buat RPC function sebagai fallback
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard
-- 2. Pergi ke SQL Editor
-- 3. Copy dan paste seluruh script ini
-- 4. Run (Jalankan)
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Cek apakah notification ada di database
-- -----------------------------------------------------

-- Cari notification dengan ID yang bermasalah
SELECT
    id,
    user_id,
    type,
    title,
    is_read,
    created_at
FROM notifications
WHERE id = '1768342726437-0.25549812295126795'
ORDER BY timestamp DESC;

-- Cek semua notifications untuk user 6000
SELECT
    id,
    user_id,
    type,
    title,
    is_read,
    timestamp,
    created_at
FROM notifications
WHERE user_id = '6000'
ORDER BY timestamp DESC
LIMIT 10;

-- -----------------------------------------------------
-- STEP 2: Drop RLS Policies yang lama (jika ada)
-- -----------------------------------------------------

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable all for service_role" ON notifications;

-- -----------------------------------------------------
-- STEP 3: Buat RLS Policies yang BARU dan BENAR
-- -----------------------------------------------------

-- Policy untuk INSERT - User bisa create notification untuk dirinya sendiri
CREATE POLICY "Users can insert their own notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid()::text = user_id
);

-- Policy untuk SELECT - User bisa lihat notification miliknya sendiri
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
    auth.uid()::text = user_id
);

-- 🔥 FIX: Policy untuk UPDATE - User bisa update notification miliknya sendiri
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = user_id
)
WITH CHECK (
    auth.uid()::text = user_id
);

-- Policy untuk DELETE - User bisa hapus notification miliknya sendiri
CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
    auth.uid()::text = user_id
);

-- Policy untuk service role (admin) - full access
CREATE POLICY "Enable all for service_role"
ON notifications
TO service_role
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------
-- STEP 4: Buat RPC Function sebagai FALLBACK
-- -----------------------------------------------------

-- Drop function lama jika ada
DROP FUNCTION IF EXISTS mark_notification_read(notification_id text);

-- Buat function untuk mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id text)
RETURNS TABLE (id text, user_id text, is_read boolean)
LANGUAGE plpgsql
SECURITY DEFINER -- 🔥 Penting: Jalankan dengan definisi security (bypass RLS)
AS $$
DECLARE
    v_user_id text;
BEGIN
    -- Ambil user ID dari auth context
    v_user_id := auth.uid()::text;

    -- Update notification
    UPDATE notifications
    SET is_read = true,
        updated_at = now()
    WHERE id = notification_id
        AND user_id = v_user_id; -- Pastikan user hanya bisa update notification miliknya

    -- Return updated notification
    RETURN QUERY
    SELECT
        n.id,
        n.user_id,
        n.is_read
    FROM notifications n
    WHERE n.id = notification_id
        AND n.user_id = v_user_id;
END;
$$;

-- Grant permission untuk execute function
GRANT EXECUTE ON FUNCTION mark_notification_read(text) TO authenticated;

-- -----------------------------------------------------
-- STEP 5: Buat RPC Function untuk Mark All as Read
-- -----------------------------------------------------

-- Drop function lama jika ada
DROP FUNCTION IF EXISTS mark_all_notifications_read(user_id_param text);

CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count bigint;
BEGIN
    -- Update semua unread notifications untuk user
    UPDATE notifications
    SET is_read = true,
        updated_at = now()
    WHERE user_id = user_id_param
        AND is_read = false;

    -- Get count of updated rows
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_all_notifications_read(text) TO authenticated;

-- -----------------------------------------------------
-- STEP 6: Verifikasi RLS Policies
-- -----------------------------------------------------

-- Cek apakah policies sudah dibuat dengan benar
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
WHERE tablename = 'notifications'
ORDER BY policyname;

-- -----------------------------------------------------
-- STEP 7: Test Update Permission (Run ini dan lihat hasil)
-- -----------------------------------------------------

-- Test query untuk cek apakah user bisa update
-- Note: Ini akan gagal jika dijalankan dari SQL Editor sebagai admin
-- tapi harus berhasil jika dijalankan dari frontend dengan user token yang benar

-- Coba update notification (sebagai test)
UPDATE notifications
SET is_read = true
WHERE id = '1768342726437-0.25549812295126795'
RETURNING id, user_id, is_read;

-- =====================================================
-- VERIFICATION STEP
-- =====================================================
-- Setelah menjalankan script ini:

-- 1. Cek console di browser, seharusnya tidak ada error lagi
-- 2. Coba klik notifikasi, maka kolom is_read harus berubah ke true
-- 3. Refresh halaman, notifikasi harus tetap read (tidak muncul lagi sebagai unread)

-- Jika MASIH ada error, periksa:
-- - Apakah user ID di tabel notifications cocok dengan auth.uid() dari Supabase Auth?
-- - Pastikan user sudah login dengan benar
-- - Cek di Supabase Dashboard > Authentication > Users untuk melihat user ID yang benar
-- =====================================================
