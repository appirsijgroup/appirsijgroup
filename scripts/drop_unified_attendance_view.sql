-- ============================================
-- DROP VIEW: unified_attendance
-- Menghapus view yang menggabungkan activity_attendance dan team_attendance_records
-- ============================================

-- Drop view jika ada
DROP VIEW IF EXISTS public.unified_attendance;

-- Verifikasi bahwa view telah dihapus
-- Jika error muncul, berarti view berhasil dihapus
-- SELECT * FROM public.unified_attendance; -- Ini akan error jika view sudah dihapus

COMMENT ON VIEW public.unified_attendance IS 'View ini telah dihapus';
