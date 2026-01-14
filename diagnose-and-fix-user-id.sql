-- =====================================================
-- DIAGNOSA: Cek User ID dan Notification
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Cek notification yang ada
-- -----------------------------------------------------

SELECT
    '🔍 STEP 1: Cek Notification' as info,
    id,
    user_id,
    title,
    is_read,
    created_at
FROM notifications
WHERE id = '1768343067049-0.33882563793438203';

-- ✅ Harus return 1 row dengan user_id = '6000'

-- -----------------------------------------------------
-- STEP 2: Cek semua notifications untuk user 6000
-- -----------------------------------------------------

SELECT
    '🔍 STEP 2: Semua Notifications User 6000' as info,
    id,
    title,
    is_read,
    created_at
FROM notifications
WHERE user_id = '6000'
ORDER BY created_at DESC;

-- -----------------------------------------------------
-- STEP 3: Coba UPDATE TANPA RPC (direct SQL)
-- -----------------------------------------------------

-- Ini akan bekerja karena kita tidak menggunakan auth.uid()
UPDATE notifications
SET is_read = true
WHERE id = '1768343067049-0.33882563793438203'
    AND user_id = '6000'  -- Hardcode user_id untuk sementara
RETURNING
    '✅ STEP 3: Direct Update Berhasil' as info,
    id,
    user_id,
    title,
    is_read,
    created_at;

-- ✅ Jika return 1 row → Direct UPDATE bekerja!
-- ❌ Jika return 0 rows → Notification tidak ada atau user_id salah

-- -----------------------------------------------------
-- STEP 4: Reset ke unread untuk test selanjutnya
-- -----------------------------------------------------

UPDATE notifications
SET is_read = false
WHERE id = '1768343067049-0.33882563793438203';

-- -----------------------------------------------------
-- STEP 5: Update RPC Function - Versi Tanpa auth.uid()
-- =====================================================
-- Karena auth.uid() tidak bekerja, kita gunakan cara lain:
-- Kirim user_id sebagai parameter dari frontend
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS mark_notification_read_v2(text);

CREATE OR REPLACE FUNCTION mark_notification_read_v2(
    p_notification_id text,
    p_user_id text  -- 🔥 NEW: Kirim user_id sebagai parameter
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
    v_row_count int;
BEGIN
    -- Update notification dengan user_id yang diberikan
    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id
        AND user_id = p_user_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    -- Check apakah update berhasil
    IF v_row_count = 0 THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Notification not found or user_id mismatch',
            'notification_id', p_notification_id,
            'user_id', p_user_id,
            'rows_affected', v_row_count
        ) INTO v_result;
    ELSE
        SELECT json_build_object(
            'success', true,
            'message', 'Notification marked as read',
            'notification_id', id,
            'user_id', user_id,
            'is_read', is_read,
            'rows_affected', v_row_count
        ) INTO v_result
        FROM notifications
        WHERE id = p_notification_id;
    END IF;

    RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- STEP 6: Test RPC Function dengan user_id parameter
-- -----------------------------------------------------

SELECT mark_notification_read_v2(
    '1768343067049-0.33882563793438203',  -- notification_id
    '6000'  -- user_id
) as test_result;

-- ✅ Harus return {"success": true, ...}

-- -----------------------------------------------------
-- STEP 7: Grant Permission
-- -----------------------------------------------------

GRANT EXECUTE ON FUNCTION mark_notification_read_v2(text, text) TO authenticated;

-- =====================================================
-- KESIMPULAN
-- =====================================================
--
-- STEP 3 akan membuktikan apakah notification bisa di-update
-- dengan direct SQL (tanpa auth.uid())
--
-- Jika STEP 3 berhasil (return 1 row):
-- ✅ Notification ADA dan bisa di-update
-- ❌ Masalahnya adalah auth.uid() yang tidak bekerja
-- ✅ SOLUSI: Gunakan RPC function dengan user_id parameter
--
-- Sekarang frontend perlu diupdate untuk mengirim user_id:
-- supabase.rpc('mark_notification_read_v2', {
--   p_notification_id: notificationId,
--   p_user_id: userId  <-- Kirim user_id dari frontend
-- })
--
-- =====================================================
