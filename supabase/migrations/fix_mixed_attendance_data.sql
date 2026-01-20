-- ============================================
-- MIGRATION: Fix Mixed Attendance Data
-- Purpose: Memindahkan team attendance yang salah simpan di attendance_records
--          ke tabel yang benar (team_attendance_records)
-- ============================================

-- Step 1: Backup data yang akan dipindahkan (opsional tapi disarankan)
CREATE TABLE IF NOT EXISTS attendance_records_backup_before_fix AS
SELECT * FROM attendance_records
WHERE entity_id LIKE 'team-%';

-- Step 2: Tampilkan data yang akan dipindahkan untuk verifikasi
SELECT
    'Data yang akan dipindahkan:' as info,
    id,
    employee_id,
    entity_id,
    status,
    timestamp,
    created_at
FROM attendance_records
WHERE entity_id LIKE 'team-%';

-- Step 3: Pindahkan data dari attendance_records ke team_attendance_records
-- Ini akan mengambil entity_id format "team-{session_id}" dan memindahkannya
INSERT INTO team_attendance_records (
    session_id,
    user_id,
    user_name,
    attended_at,
    created_at,
    session_type,
    session_date,
    session_start_time,
    session_end_time
)
SELECT
    -- Extract session_id dari entity_id format "team-{uuid}"
    REPLACE(entity_id, 'team-', '')::uuid as session_id,

    -- Employee data
    ar.employee_id as user_id,
    e.name as user_name,

    -- Timestamp data
    ar.timestamp as attended_at,
    ar.created_at,

    -- Session metadata dari team_attendance_sessions
    tas.type as session_type,
    tas.date as session_date,
    tas.start_time as session_start_time,
    tas.end_time as session_end_time
FROM attendance_records ar
-- Join dengan team_attendance_sessions untuk ambil metadata session
INNER JOIN team_attendance_sessions tas
    ON tas.id = REPLACE(ar.entity_id, 'team-', '')::uuid
-- Join dengan employees untuk ambil nama user
INNER JOIN employees e
    ON e.id = ar.employee_id
WHERE ar.entity_id LIKE 'team-%'
ON CONFLICT (session_id, user_id) DO NOTHING; -- Hindari duplicate

-- Step 4: Hapus data yang sudah dipindahkan dari attendance_records
-- ⚠️ PASTIKAN Step 3 berhasil sebelum menjalankan ini!
DELETE FROM attendance_records
WHERE entity_id LIKE 'team-%'
AND id IN (
    SELECT ar.id
    FROM attendance_records ar
    INNER JOIN team_attendance_records tar
        ON tar.session_id::text = REPLACE(ar.entity_id, 'team-', '')
        AND tar.user_id = ar.employee_id
);

-- Step 5: Verifikasi hasil migrasi
SELECT
    'Verifikasi - Data tersisa di attendance_records:' as info,
    COUNT(*) as count
FROM attendance_records
WHERE entity_id LIKE 'team-%';

SELECT
    'Verifikasi - Data yang berhasil dipindahkan:' as info,
    COUNT(*) as count
FROM team_attendance_records;

-- Step 6: Tampilkan data yang sudah dipindahkan untuk verifikasi manual
SELECT
    'Data yang sudah dipindahkan ke team_attendance_records:' as info,
    tar.id,
    tar.session_id,
    tar.user_id,
    tar.user_name,
    tar.session_type,
    tar.session_date,
    tar.attended_at
FROM team_attendance_records tar
ORDER BY tar.created_at DESC
LIMIT 10;

-- ============================================
-- CATATAN PENTING:
-- ============================================
-- 1. Jika ada data yang tidak bisa dipindahkan karena session tidak ditemukan,
--    data akan tetap tinggal di attendance_records
-- 2. Backup tersimpan di attendance_records_backup_before_fix
-- 3. Untuk rollback, Anda bisa restore dari backup table
-- ============================================

-- Rollback script (HANYA gunakan jika ada masalah):
-- DELETE FROM team_attendance_records WHERE ... (sesuaikan kondisi)
-- INSERT INTO attendance_records SELECT * FROM attendance_records_backup_before_fix;
-- DROP TABLE IF EXISTS attendance_records_backup_before_fix;
