-- =====================================================
-- SCRIPT DEBUG & FIX NOTIFICATION SYNC ISSUE
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor
-- =====================================================

-- 1. CEK STRUKTUR TABLE NOTIFICATIONS
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. CEK NOTIFICATIONS UNTUK USER 6000
SELECT
    id,
    user_id,
    title,
    is_read,
    created_at
FROM notifications
WHERE user_id = '6000'
ORDER BY created_at DESC
LIMIT 5;

-- 3. CEK EMPLOYEE ID 6000
SELECT
    id,
    email,
    name
FROM employees
WHERE id = '6000';

-- 4. CEK AUTH USERS
SELECT
    id,
    email,
    created_at
FROM auth.users
WHERE id = '6000' OR email LIKE '%edi%';

-- 5. TEST CEK APAKAH user_id DI NOTIFICATIONS SAMA DENGAN auth.uid()
-- Ganti '6000' dengan ID user yang sedang login
SELECT
    '6000' as employee_id,
    auth.uid() as current_auth_uid,
    CASE
        WHEN auth.uid()::text = '6000' THEN 'MATCH ✅'
        ELSE 'TIDAK MATCH ❌'
    END as match_status;

-- =====================================================
-- JIKA TIDAK MATCH, GUNAKAN SCRIPT INI UNTUK FIX
-- =====================================================

-- Cek apakah ada relasi antara auth.users dan employees
SELECT
    e.id as employee_id,
    e.email as employee_email,
    a.id as auth_id,
    a.email as auth_email,
    CASE
        WHEN e.id = a.id THEN 'SAME ID'
        ELSE 'DIFFERENT ID'
    END as id_match
FROM employees e
LEFT JOIN auth.users a ON e.email = a.email
WHERE e.id = '6000';

-- =====================================================
-- SOLUTION: JIKA employee_id BERBEDA DENGAN auth.uid()
-- =====================================================

-- Opsi 1: Update semua user_id di notifications untuk menggunakan auth.uid()
-- HATI-HATI: Ini akan mengubah semua data!

-- UPDATE notifications
-- SET user_id = (
--     SELECT e.id
--     FROM employees e
--     JOIN auth.users a ON e.email = a.email
--     WHERE a.id = (
--         SELECT user_id FROM notifications n2 WHERE n2.id = notifications.id
--     )
-- );

-- Opsi 2: Ganti RLS policy untuk menggunakan email sebagai penghubung
-- (Lebih aman, tidak mengubah data)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create new policies using email match
CREATE POLICY "Users can mark their notifications as read via email"
ON notifications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = notifications.user_id
        AND e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = notifications.user_id
        AND e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

CREATE POLICY "Users can delete their own notifications via email"
ON notifications
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = notifications.user_id
        AND e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- =====================================================
-- VERIFICATION: Test policy lagi
-- =====================================================

-- Test jika policy sudah fix
-- Login sebagai user 6000 lalu jalankan:
UPDATE notifications
SET is_read = true
WHERE id = '1768317681574-0.6691329632870299'  -- Ganti dengan ID notifikasi yang ada
RETURNING id, user_id, title, is_read;

-- =====================================================
-- ALTERNATIF: Buat RPC function untuk bypass RLS
-- =====================================================

-- Drop function jika sudah ada
DROP FUNCTION IF EXISTS mark_notification_read(uuid);

-- Buat function baru
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS notifications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result notifications;
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE id = notification_id
    AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = notifications.user_id
        AND e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    RETURNING * INTO result;

    RETURN result;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;

-- Test function
SELECT mark_notification_read('1768317681574-0.6691329632870299'::uuid);
