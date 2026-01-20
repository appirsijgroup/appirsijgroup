-- ============================================
-- EMERGENCY FIX: Disable RLS sementara untuk debugging
-- Jalankan ini jika masih error 401
-- ============================================

-- Cek apakah user sudah login
-- Buka browser console dan jalankan: console.log(supabase.auth.getUser())

-- 1. Matikan RLS sementara untuk employee_monthly_activities
ALTER TABLE public.employee_monthly_activities DISABLE ROW LEVEL SECURITY;

-- 2. Matikan RLS sementara untuk activity_attendance
ALTER TABLE public.activity_attendance DISABLE ROW LEVEL SECURITY;

-- 3. Verifikasi
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('employee_monthly_activities', 'activity_attendance');

-- Jika rowsecurity = false, berarti RLS sudah dimatikan
-- Setelah berhasil, kita bisa enable kembali dengan policy yang benar
