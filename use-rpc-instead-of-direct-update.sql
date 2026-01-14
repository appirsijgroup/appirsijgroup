-- =====================================================
-- FIX: Gunakan RPC Function untuk Update Notification
-- =====================================================
-- Masalah: Direct UPDATE lewat Supabase client return 0 rows
-- Penyebab: RLS Policy dengan auth.uid() tidak bekerja reliable
-- Solusi: Gunakan RPC Function dengan SECURITY DEFINER
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy paste SELURUH script ini
-- 3. Run
-- 4. Test dengan menjalankan query di paling bawah
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Drop RPC function lama jika ada
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS mark_notification_read(notification_id text);
DROP FUNCTION IF EXISTS mark_notification_read_v2(notification_id text);

-- -----------------------------------------------------
-- STEP 2: Buat RPC function dengan SECURITY DEFINER
-- -----------------------------------------------------

-- Ini akan bypass RLS dan menjamin update berhasil
CREATE OR REPLACE FUNCTION mark_notification_read_v2(
    p_notification_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- 🔥 PENTING! Ini bypass RLS
AS $$
DECLARE
    v_user_id text;
    v_result json;
BEGIN
    -- Get current user ID from auth
    v_user_id := auth.uid()::text;

    -- Log untuk debug
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Notification ID: %', p_notification_id;

    -- Update notification
    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id
        AND user_id = v_user_id; -- Pastikan user hanya bisa update notification miliknya

    -- Check apakah update berhasil
    IF NOT FOUND THEN
        -- Jika tidak ditemukan, cari tahu kenapa
        SELECT json_build_object(
            'success', false,
            'message', 'Notification not found or user_id mismatch',
            'notification_id', p_notification_id,
            'user_id', v_user_id
        ) INTO v_result;
    ELSE
        -- Jika berhasil, ambil data yang di-update
        SELECT json_build_object(
            'success', true,
            'message', 'Notification marked as read',
            'notification_id', id,
            'user_id', user_id,
            'is_read', is_read
        ) INTO v_result
        FROM notifications
        WHERE id = p_notification_id;
    END IF;

    RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- STEP 3: Grant permission ke authenticated users
-- -----------------------------------------------------

GRANT EXECUTE ON FUNCTION mark_notification_read_v2(text) TO authenticated;

-- -----------------------------------------------------
-- STEP 4: Test RPC function
-- -----------------------------------------------------

-- Test dengan notification ID yang bermasalah
SELECT mark_notification_read_v2('1768343067049-0.33882563793438203') as result;

-- Result harusnya:
-- {"success": true, "message": "Notification marked as read", ...}
-- Jika {"success": false}, berarti notification tidak ditemukan atau user_id tidak cocok

-- -----------------------------------------------------
-- STEP 5: Cek apakah notification berhasil di-update
-- -----------------------------------------------------

SELECT
    id,
    user_id,
    title,
    is_read,
    created_at
FROM notifications
WHERE id = '1768343067049-0.33882563793438203';

-- is_read harusnya TRUE sekarang

-- -----------------------------------------------------
-- STEP 6: Reset ke unread untuk test selanjutnya
-- -----------------------------------------------------

UPDATE notifications
SET is_read = false
WHERE id = '1768343067049-0.33882563793438203';

-- =====================================================
-- VERIFIKASI
-- =====================================================
--
-- STEP 4 harusnya return:
-- {"success":true,"message":"Notification marked as read",...}
--
-- STEP 5 harusnya return notification dengan is_read = TRUE
--
-- Jika berhasil, sekarang kita perlu UPDATE frontend code
-- untuk menggunakan RPC function ini вместо direct UPDATE
--
-- =====================================================
