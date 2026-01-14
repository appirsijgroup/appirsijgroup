-- =====================================================
-- FIX RLS POLICY UNTUK UPDATE NOTIFICATION
-- =====================================================
-- Masalah: Kolom is_read tidak berubah saat notification diklik
-- Penyebab: RLS Policy untuk UPDATE belum di-set dengan benar
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard
-- 2. Pergi ke SQL Editor
-- 3. Copy dan paste script ini
-- 4. Run (Jalankan)
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Cek notification yang ada di database
-- -----------------------------------------------------

-- Cek notification by ID (ganti dengan notification ID Anda)
SELECT
    '🔍 STEP 1: Cek Notification di Database' as step,
    id,
    user_id,
    title,
    is_read,
    timestamp,
    created_at
FROM notifications
WHERE id = '1768343067049-0.33882563793438203'  -- GANTI INI dengan notification ID Anda
ORDER BY timestamp DESC;

-- -----------------------------------------------------
-- STEP 2: Cek RLS Policies yang sudah ada
-- -----------------------------------------------------

SELECT
    '🔍 STEP 2: Cek RLS Policies yang Sudah Ada' as step,
    policyname,
    cmd,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- -----------------------------------------------------
-- STEP 3: Drop RLS Policy untuk UPDATE jika ada
-- -----------------------------------------------------

-- Drop old policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;

-- -----------------------------------------------------
-- STEP 4: Buat RLS Policy untuk UPDATE yang BARU
-- -----------------------------------------------------

-- Create UPDATE policy - User bisa update notification miliknya sendiri
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

-- -----------------------------------------------------
-- STEP 5: Verifikasi policy yang baru dibuat
-- -----------------------------------------------------

SELECT
    '✅ STEP 5: Verifikasi Policy UPDATE' as step,
    policyname,
    cmd,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'UPDATE';

-- -----------------------------------------------------
-- STEP 6: Test Manual Update
-- -----------------------------------------------------

-- Test update notification (ganti dengan notification ID Anda)
UPDATE notifications
SET is_read = true
WHERE id = '1768343067049-0.33882563793438203'  -- GANTI INI dengan notification ID Anda
RETURNING
    '✅ STEP 6: Test Manual Update' as step,
    id,
    user_id,
    title,
    is_read,
    created_at;

-- -----------------------------------------------------
-- STEP 7: Reset untuk test (Opsional)
-- -----------------------------------------------------

-- Reset notification kembali ke unread untuk test selanjutnya
UPDATE notifications
SET is_read = false
WHERE id = '1768343067049-0.33882563793438203'  -- GANTI INI dengan notification ID Anda
RETURNING
    '🔄 STEP 7: Reset ke Unread' as step,
    id,
    title,
    is_read,
    created_at;

-- =====================================================
-- HASIL YANG DIHARAPKAN:
-- =====================================================
--
-- STEP 1 harusnya return 1 row (notification yang Anda cari)
-- STEP 2 harusnya list semua policies yang ada
-- STEP 6 harusnya return 1 row dengan is_read = TRUE
-- STEP 7 harusnya return 1 row dengan is_read = FALSE
--
-- Jika STEP 6 return 0 rows:
-- Masih ada masalah dengan user_id atau RLS policy
--
-- Solusi:
-- 1. Cek apakah user_id di notifications cocok dengan auth.uid()
-- 2. Pastikan user sudah login dengan benar
-- 3. Cek di Supabase Dashboard > Authentication > Users
-- =====================================================
