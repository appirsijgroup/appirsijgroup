-- ============================================
-- MIGRATION: Hapus kolom present_user_ids dari team_attendance_sessions
-- Karena sekarang presensi disimpan di tabel team_attendance_records
-- ============================================

-- Step 1: Backup data dulu (opsional tapi disarankan)
-- Uncomment jika ingin backup:
/*
create table public.team_attendance_sessions_backup as
select * from public.team_attendance_sessions;
*/

-- Step 2: Hapus kolom present_user_ids
alter table public.team_attendance_sessions
drop column if exists present_user_ids;

-- Step 3: Update comment untuk tabel
comment on table public.team_attendance_sessions is 'Menyimpan jadwal dan detail sesi kegiatan tim (KIE, Doa Bersama). Record presensi user disimpan di tabel team_attendance_records.';
