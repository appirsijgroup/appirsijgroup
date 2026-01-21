-- ============================================
-- CEK DAN FIX POLICIES SELEKTIF
-- Hapus dan buat ulang hanya policy yang bermasalah
-- ============================================

-- 1. Cek policy yang ada saat ini
SELECT
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'employee_monthly_reports'
ORDER BY policyname;

-- Jalankan query di atas dulu untuk lihat apa yang ada
-- Lalu jalankan DROP sesuai dengan yang muncul

-- Jika ada policy yang menyebabkan error, drop satu per satu:

-- DROP POLICY IF EXISTS "Allow everyone to view all monthly reports" ON public.employee_monthly_reports;
-- DROP POLICY IF EXISTS "Allow everyone to insert monthly reports" ON public.employee_monthly_reports;
-- DROP POLICY IF EXISTS "Allow everyone to update monthly reports" ON public.employee_monthly_reports;
-- DROP POLICY IF EXISTS "Allow everyone to delete monthly reports" ON public.employee_monthly_reports;

-- Setelah drop, baru create ulang:
