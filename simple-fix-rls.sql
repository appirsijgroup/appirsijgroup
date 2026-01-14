-- =====================================================
-- SIMPLE FIX: RLS Policy untuk Update Notification
-- =====================================================
-- Masalah: is_read tidak berubah saat notification diklik
-- Solusi: Create RLS Policy untuk UPDATE
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy paste script ini
-- 3. Run
-- =====================================================

-- Drop policy lama jika ada
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create policy UPDATE yang baru
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Verifikasi policy sudah dibuat
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'UPDATE';

-- Test update notification (GANTI ID di bawah dengan notification ID Anda)
UPDATE notifications
SET is_read = true
WHERE id = '1768343067049-0.33882563793438203'  -- GANTI INI!
RETURNING id, title, is_read;

-- Reset ke false (untuk test selanjutnya)
UPDATE notifications
SET is_read = false
WHERE id = '1768343067049-0.33882563793438203';  -- GANTI INI!

-- =====================================================
-- HASIL:
-- =====================================================
-- Jika query pertama (SELECT) return policy yang baru dibuat:
-- ✅ Policy berhasil dibuat!
--
-- Jika query UPDATE (yang pertama) return 1 row:
-- ✅ Update BEKERJA! Masalah SOLVED!
--
-- Jika query UPDATE return 0 rows:
-- ❌ Masalah dengan user_id - lihat panduan di bawah
-- =====================================================

-- =====================================================
-- TROUBLESHOOTING: Jika UPDATE return 0 rows
-- =====================================================
--
-- Masalah: user_id di notifications tidak cocok dengan auth.uid()
--
-- Solusi:
-- 1. Buka Console browser (F12)
-- 2. Ketik: localStorage.getItem('loggedInUserId')
-- 3. Copy user ID tersebut
--
-- 4. Buka Supabase Dashboard:
--    - Authentication > Users > copy ID user yang sedang login
--
-- 5. Buka Table Editor > notifications:
--    - Cari notification dengan ID yang bermasalah
--    - Cek kolom user_id
--
-- 6. Jika tidak cocok, update:
--    UPDATE notifications
--    SET user_id = 'USER_ID_YANG_BENAR'
--    WHERE id = '1768343067049-0.33882563793438203';
--
-- 7. Jalankan query UPDATE di atas lagi
-- =====================================================
