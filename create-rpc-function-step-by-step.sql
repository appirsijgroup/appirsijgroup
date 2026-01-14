-- =====================================================
-- CREATE RPC FUNCTION - STEP BY STEP
-- =====================================================
-- Jalankan setiap bagian SATU PER SATU
-- Jika ada error, perbaiki dulu sebelum lanjut ke step berikutnya
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Drop function lama jika ada
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS mark_notification_read_v2(text);

-- ✅ Jika berhasil: "Success. No rows returned" (berarti function di-drop atau memang tidak ada)
-- ❌ Jika error: Cek error message dan perbaiki

-- -----------------------------------------------------
-- STEP 2: Buat function baru
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION mark_notification_read_v2(
    p_notification_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id text;
    v_result json;
BEGIN
    -- Get current user ID from auth
    v_user_id := auth.uid()::text;

    -- Update notification
    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id
        AND user_id = v_user_id;

    -- Check apakah update berhasil
    IF NOT FOUND THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Notification not found or user_id mismatch',
            'notification_id', p_notification_id,
            'user_id', v_user_id
        ) INTO v_result;
    ELSE
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

-- ✅ Jika berhasil: "Success. Create function"
-- ❌ Jika error: Cek error message dan perbaiki

-- -----------------------------------------------------
-- STEP 3: Grant permission
-- -----------------------------------------------------

GRANT EXECUTE ON FUNCTION mark_notification_read_v2(text) TO authenticated;

-- ✅ Jika berhasil: "Success. Grant"
-- ❌ Jika error: Cek error message

-- -----------------------------------------------------
-- STEP 4: Verifikasi function sudah dibuat
-- -----------------------------------------------------

SELECT
    routine_name,
    routine_type,
    data_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'mark_notification_read_v2';

-- ✅ Harus return 1 row dengan:
--    routine_name: mark_notification_read_v2
--    security_type: DEFINER

-- -----------------------------------------------------
-- STEP 5: Test function
-- -----------------------------------------------------

-- Ganti dengan notification ID Anda
SELECT mark_notification_read_v2('1768343067049-0.33882563793438203') as test_result;

-- ✅ Harus return JSON dengan success: true atau success: false
-- {"success": true, "message": "Notification marked as read", ...}

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
--
-- Jika STEP 2 gagal dengan error "column does not exist":
-- Pastikan tabel notifications memiliki kolom yang benar:
-- - id (text)
-- - user_id (text)
-- - is_read (boolean)
--
-- Jika STEP 5 gagal dengan "function does not exist":
-- Berarti function tidak berhasil dibuat di STEP 2
-- Cek error message di STEP 2 dan perbaiki
--
-- Jika STEP 5 return success: false:
-- Berarti notification tidak ditemukan atau user_id tidak cocok
--
-- =====================================================
