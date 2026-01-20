-- ============================================
-- CONSTRAINT: Mencegah Pencampuran Data Attendance
-- Purpose: Menambahkan validasi untuk memastikan entity_id di attendance_records
--          tidak mengandung team session ID
-- ============================================

-- Step 1: Cek apakah ada data yang bermasalah sebelum add constraint
SELECT
    '⚠️ WARNING: Ditemukan data team attendance di attendance_records!' as warning,
    COUNT(*) as count
FROM attendance_records
WHERE entity_id LIKE 'team-%';

-- Tampilkan detail data yang bermasalah
SELECT
    id,
    employee_id,
    entity_id,
    status,
    timestamp,
    created_at
FROM attendance_records
WHERE entity_id LIKE 'team-%'
ORDER BY created_at DESC;

-- Step 2: Add CHECK constraint untuk mencegah pencampuran di masa depan
ALTER TABLE attendance_records
ADD CONSTRAINT attendance_records_entity_id_format_check
CHECK (
    -- Hanya izinkan entity_id yang TIDAK diawali dengan "team-"
    -- Team sessions harus disimpan di team_attendance_records
    entity_id NOT LIKE 'team-%'
);

-- Step 3: Add constraint untuk entity_id di team_attendance_records
-- (untuk memastikan session_id valid)
ALTER TABLE team_attendance_records
ADD CONSTRAINT team_attendance_records_session_exists
FOREIGN KEY (session_id)
REFERENCES team_attendance_sessions(id) ON DELETE CASCADE;

-- Step 4: Comments untuk dokumentasi
COMMENT ON CONSTRAINT attendance_records_entity_id_format_check ON attendance_records IS
'Mencegah entity_id dengan format "team-*" karena team attendance harus disimpan di team_attendance_records table';

COMMENT ON CONSTRAINT team_attendance_records_session_exists ON team_attendance_records IS
'Memastikan session_id di team_attendance_records merujuk ke valid session';

-- ============================================
-- CATATAN:
-- ============================================
-- 1. Jika Step 2 gagal karena masih ada data yang bermasalah,
--    jalankan dulu migrasi fix_mixed_attendance_data.sql
-- 2. Setelah constraint aktif, insert dengan entity_id "team-*"
--    akan otomatis ditolak dengan error
-- 3. Untuk menghapus constraint (jika perlu):
--    ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_entity_id_format_check;
-- ============================================
