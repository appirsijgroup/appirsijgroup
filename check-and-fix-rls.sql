-- =====================================================
-- CEK & FIX RLS POLICY UNTUK UPDATE NOTIFICATION
-- =====================================================
-- Masalah: Kolom is_read tidak berubah saat notification diklik
-- Penyebab: RLS Policy untuk UPDATE belum di-set dengan benar
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard
-- 2. Pergi ke SQL Editor
-- 3. Copy dan paste script ini
-- 4. Run (Jalankan)
-- 5. Cek hasil di bagian bawah
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Cek apakah notification ADA di database
-- -----------------------------------------------------

-- Ganti dengan notification ID dari log browser Anda
\echo '🔍 STEP 1: Cek Notification di Database'
\echo '==========================================\n'

SELECT
    id,
    user_id,
    title,
    is_read,
    timestamp,
    created_at
FROM notifications
WHERE id = '1768343067049-0.33882563793438203'  -- Ganti dengan notification ID Anda
ORDER BY timestamp DESC;

-- Jika hasilnya kosong, notification tidak ada di database
-- Jika hasilnya ada, lanjut ke STEP 2

-- -----------------------------------------------------
-- STEP 2: Cek RLS Policies yang sudah ada
-- -----------------------------------------------------

\echo '\n🔍 STEP 2: Cek RLS Policies yang Sudah Ada'
\echo '============================================\n'

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
ORDER BY cmd, policyname;

-- -----------------------------------------------------
-- STEP 3: Drop RLS Policy untuk UPDATE jika ada
-- -----------------------------------------------------

\echo '\n🔧 STEP 3: Drop RLS Policy UPDATE yang Lama'
\echo '==============================================\n'

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;

\echo '✅ Old UPDATE policies dropped (if any)\n'

-- -----------------------------------------------------
-- STEP 4: Buat RLS Policy untuk UPDATE yang BARU
-- -----------------------------------------------------

\echo '\n🔧 STEP 4: Buat RLS Policy UPDATE yang BARU'
\echo '============================================\n'

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

\echo '✅ New UPDATE policy created\n'

-- -----------------------------------------------------
-- STEP 5: Cek apakah policy sudah benar
-- -----------------------------------------------------

\echo '\n🔍 STEP 5: Verifikasi Policy UPDATE'
\echo '======================================\n'

SELECT
    policyname,
    cmd,
    roles,
    CASE
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE Policy'
        ELSE cmd
    END as policy_type,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'UPDATE';

-- -----------------------------------------------------
-- STEP 6: Test Manual Update
-- -----------------------------------------------------

\echo '\n🧪 STEP 6: Test Manual Update (Coba Update Notification)'
\echo '===========================================================\n'

-- Ganti dengan notification ID yang Anda cek di STEP 1
UPDATE notifications
SET is_read = true,
    updated_at = now()
WHERE id = '1768343067049-0.33882563793438203'  -- Ganti dengan notification ID Anda
RETURNING
    id,
    user_id,
    title,
    is_read,
    updated_at;

-- Jika hasilnya return 1 row, berarti policy bekerja dengan benar!
-- Jika hasilnya 0 rows, berarti masih ada masalah dengan RLS policy

-- -----------------------------------------------------
-- STEP 7: Reset untuk test (Opsional - HANYA untuk test)
-- -----------------------------------------------------

\echo '\n🔄 STEP 7: Reset Notification ke Unread (Opsional - untuk test saja)'
\echo '=====================================================================\n'

-- Reset notification kembali ke unread untuk test
UPDATE notifications
SET is_read = false,
    updated_at = now()
WHERE id = '1768343067049-0.33882563793438203'  -- Ganti dengan notification ID Anda
RETURNING
    id,
    title,
    is_read;

\echo '\n✅ Setup selesai! Sekarang test di aplikasi:'
\echo '1. Buka aplikasi dan login'
\echo '2. Klik notification tersebut'
\echo '3. Lihat apakah is_read berubah ke true di database'
\echo '4. Refresh browser dan cek apakah notification tetap read\n'

-- =====================================================
-- KESIMPULAN
-- =====================================================
-- Jika STEP 6 return 1 row:
-- ✅ Policy bekerja! Masalah solved.
--
-- Jika STEP 6 return 0 rows:
-- ❌ Masih ada masalah. Kemungkinan:
--    - user_id di tabel notifications tidak cocok dengan auth.uid()
--    - User belum login dengan benar
--    - Ada masalah dengan Supabase connection
--
-- Solusi: Cek di Supabase Dashboard:
-- 1. Authentication → Users → pastikan user ID ada
-- 2. Table Editor → notifications → cek kolom user_id
-- 3. Pastikan user_id di notifications cocok dengan id di auth.users
-- =====================================================
