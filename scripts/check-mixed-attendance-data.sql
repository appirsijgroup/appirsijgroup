-- ============================================
-- VALIDATION SCRIPT: Cek Kondisi Data Saat Ini
-- Purpose: Mengecek apakah ada data tercampur di database
-- ============================================

-- 1. Cek attendance_records - apakah ada data team?
SELECT
    '=== ATTENDANCE RECORDS ===' as table_name,
    COUNT(*) FILTER (WHERE entity_id LIKE 'team-%') as team_records_count,
    COUNT(*) FILTER (WHERE entity_id NOT LIKE 'team-%') as prayer_records_count,
    COUNT(*) as total_records
FROM attendance_records;

-- 2. Tampilkan detail data team yang ada di attendance_records (jika ada)
SELECT
    '⚠️ DATA TEAM DI ATTENDANCE_RECORDS (SEHARUSNYA KOSONG):' as warning,
    id,
    employee_id,
    entity_id,
    status,
    reason,
    timestamp,
    created_at
FROM attendance_records
WHERE entity_id LIKE 'team-%'
ORDER BY created_at DESC;

-- 3. Tampilkan detail data prayer yang valid
SELECT
    '✅ DATA SHOLAT YANG VALID DI ATTENDANCE_RECORDS:' as info,
    entity_id,
    COUNT(*) as count
FROM attendance_records
WHERE entity_id NOT LIKE 'team-%'
GROUP BY entity_id
ORDER BY entity_id;

-- 4. Cek team_attendance_records - apakah ada data?
SELECT
    '=== TEAM ATTENDANCE RECORDS ===' as table_name,
    COUNT(*) as total_records
FROM team_attendance_records;

-- 5. Tampilkan sample data dari team_attendance_records
SELECT
    '✅ SAMPLE DATA DARI TEAM_ATTENDANCE_RECORDS:' as info,
    id,
    session_id,
    user_id,
    user_name,
    session_type,
    session_date,
    attended_at
FROM team_attendance_records
ORDER BY attended_at DESC
LIMIT 10;

-- 6. Cek apakah ada duplicate (employee + entity) yang menyebabkan konflik?
SELECT
    '=== CEK DUPLICATE DI ATTENDANCE_RECORDS ===' as check_name,
    employee_id,
    entity_id,
    COUNT(*) as duplicate_count
FROM attendance_records
GROUP BY employee_id, entity_id
HAVING COUNT(*) > 1;

-- 7. Summary report
SELECT
    '=== SUMMARY REPORT ===' as report_title,
    (SELECT COUNT(*) FROM attendance_records WHERE entity_id LIKE 'team-%') as team_records_in_wrong_table,
    (SELECT COUNT(*) FROM attendance_records WHERE entity_id NOT LIKE 'team-%') as prayer_records_in_correct_table,
    (SELECT COUNT(*) FROM team_attendance_records) as team_records_in_correct_table,
    (SELECT COUNT(*) FROM attendance_records) as total_attendance_records,
    (SELECT COUNT(DISTINCT employee_id) FROM attendance_records WHERE entity_id LIKE 'team-%') as affected_employees;

-- ============================================
-- HASIL YANG DIHARAPKAN:
-- ============================================
-- team_records_in_wrong_table: 0 (tidak ada data team di attendance_records)
-- prayer_records_in_correct_table: > 0 (ada data sholat)
-- team_records_in_correct_table: > 0 (ada data team di tabel yang benar)
-- affected_employees: 0 (tidak ada employee yang terdampak)
-- ============================================
