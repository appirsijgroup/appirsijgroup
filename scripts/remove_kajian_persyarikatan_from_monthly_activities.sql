-- ============================================
-- CLEANUP SCRIPT: Hapus field kajian_selasa dan pengajianPersyarikatan
-- 📝 Tujuan: Menghapus pencatatan otomatis untuk Kajian Selasa dan Pengajian Persyarikatan
-- ✅ Hasil: Kedua aktivitas ini hanya bisa dicatat secara MANUAL oleh user
-- ============================================

-- =====================================================
-- STEP 1: Backup data sebelum cleanup (PENTING!)
-- =====================================================

-- Buat backup table
DROP TABLE IF EXISTS employee_monthly_activities_backup_before_manual_cleanup;
CREATE TABLE employee_monthly_activities_backup_before_manual_cleanup AS
SELECT * FROM employee_monthly_activities;

-- Verifikasi backup berhasil dibuat
SELECT
    '✅ Backup berhasil dibuat' as status,
    COUNT(DISTINCT employee_id) as total_employees_backed_up,
    pg_size_pretty(pg_total_relation_size('employee_monthly_activities_backup_before_manual_cleanup')) as backup_size
FROM employee_monthly_activities_backup_before_manual_cleanup;

-- =====================================================
-- STEP 2: Lihat data sebelum cleanup
-- =====================================================

-- Tampilkan sample data sebelum cleanup
SELECT
    employee_id,
    jsonb_pretty(activities) as activities_before_cleanup
FROM employee_monthly_activities
WHERE activities IS NOT NULL
LIMIT 3;

-- =====================================================
-- STEP 3: Hitung field yang akan dihapus
-- =====================================================

SELECT
    'kajianSelasa' as field_name,
    COUNT(DISTINCT employee_id) as employees_with_field
FROM employee_monthly_activities
WHERE activities ? 'kajianSelasa'

UNION ALL

SELECT
    'pengajianPersyarikatan' as field_name,
    COUNT(DISTINCT employee_id) as employees_with_field
FROM employee_monthly_activities
WHERE activities ? 'pengajianPersyarikatan'

UNION ALL

SELECT
    'kegiatanTerjadwal' as field_name,
    COUNT(DISTINCT employee_id) as employees_with_field
FROM employee_monthly_activities
WHERE activities ? 'kegiatanTerjadwal';

-- =====================================================
-- STEP 4: CLEANUP - Hapus field dari semua level
-- =====================================================

-- METODE SIMPLE: Hapus field dari seluruh JSONB structure
-- Menggunakan recursive jsonb path deletion

UPDATE employee_monthly_activities
SET activities = activities #- '{kajianSelasa}'
WHERE activities ? 'kajianSelasa';

SELECT
    '✅ Step 4a: kajianSelasa dihapus dari root level' as status,
    COUNT(*) as affected_rows
FROM employee_monthly_activities
WHERE activities ? 'kajianSelasa';

-- =====================================================

-- Hapus dari semua nested levels menggunakan function
CREATE OR REPLACE FUNCTION cleanup_nested_fields()
RETURNS void AS $$
DECLARE
    emp_record RECORD;
    month_key TEXT;
    day_key TEXT;
    cleaned_activities JSONB;
BEGIN
    FOR emp_record IN
        SELECT employee_id, activities
        FROM employee_monthly_activities
        WHERE activities IS NOT NULL
    LOOP
        cleaned_activities := emp_record.activities;

        -- Hapus field dari root level
        cleaned_activities := cleaned_activities - 'kajianSelasa' - 'pengajianPersyarikatan' - 'kegiatanTerjadwal';

        -- Hapus dari semua month keys
        FOR month_key IN
            SELECT jsonb_object_keys(cleaned_activities)
        LOOP
            -- Pastikan value adalah object sebelum coba akses keys
            IF jsonb_typeof(cleaned_activities->month_key) = 'object' THEN
                -- Hapus field dari month level
                cleaned_activities := jsonb_set(
                    cleaned_activities,
                    ARRAY[month_key],
                    (cleaned_activities->month_key) - 'kajianSelasa' - 'pengajianPersyarikatan' - 'kegiatanTerjadwal'
                );

                -- Hapus dari semua day keys dalam month tersebut
                FOR day_key IN
                    SELECT jsonb_object_keys(cleaned_activities->month_key)
                LOOP
                    -- Pastikan value adalah object
                    IF jsonb_typeof((cleaned_activities->month_key)->day_key) = 'object' THEN
                        -- Hapus field dari day level
                        cleaned_activities := jsonb_set(
                            cleaned_activities,
                            ARRAY[month_key, day_key],
                            ((cleaned_activities->month_key)->day_key) - 'kajianSelasa' - 'pengajianPersyarikatan' - 'kegiatanTerjadwal'
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

        -- Update record
        UPDATE employee_monthly_activities
        SET activities = cleaned_activities
        WHERE employee_id = emp_record.employee_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Jalankan fungsi cleanup
SELECT cleanup_nested_fields();

-- Hapus fungsi setelah dipakai
DROP FUNCTION IF EXISTS cleanup_nested_fields();

SELECT
    '✅ Step 4b: Deep cleanup selesai' as status,
    COUNT(*) as total_processed
FROM employee_monthly_activities
WHERE activities IS NOT NULL;

-- =====================================================
-- STEP 5: Verifikasi hasil cleanup
-- =====================================================

-- Cek apakah field sudah bersih
SELECT
    employee_id,
    CASE
        WHEN NOT (activities ? 'kajianSelasa'
              OR activities ? 'pengajianPersyarikatan'
              OR activities ? 'kegiatanTerjadwal')
        THEN '✅ BERSIH'
        ELSE '❌ MASIH ADA FIELD ASING'
    END as cleanup_status
FROM employee_monthly_activities
WHERE activities IS NOT NULL
ORDER BY employee_id
LIMIT 10;

-- Pastikan tidak ada yang tersisa (harus 0)
SELECT
    COUNT(*) as should_be_zero,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Cleanup BERHASIL!'
        ELSE '⚠️ Masih ada field tersisa'
    END as verification_result
FROM employee_monthly_activities
WHERE activities IS NOT NULL
  AND (
    activities ? 'kajianSelasa'
    OR activities ? 'pengajianPersyarikatan'
    OR activities ? 'kegiatanTerjadwal'
  );

-- =====================================================
-- STEP 6: Lihat struktur setelah cleanup
-- =====================================================

-- Sample structure setelah cleanup (hanya tanggal)
SELECT
    employee_id,
    jsonb_pretty(activities) as activities_after_cleanup
FROM employee_monthly_activities
WHERE employee_id = (
    SELECT employee_id
    FROM employee_monthly_activities
    WHERE activities IS NOT NULL
    LIMIT 1
);

-- =====================================================
-- STEP 7: Summary akhir
-- =====================================================

SELECT
    'Total Employees' as metric,
    COUNT(DISTINCT employee_id) as value
FROM employee_monthly_activities

UNION ALL

SELECT
    'Employees with activities data' as metric,
    COUNT(*) as value
FROM employee_monthly_activities
WHERE activities IS NOT NULL

UNION ALL

SELECT
    'Employees still with kajianSelasa' as metric,
    COUNT(*) as value
FROM employee_monthly_activities
WHERE activities ? 'kajianSelasa'

UNION ALL

SELECT
    'Employees still with pengajianPersyarikatan' as metric,
    COUNT(*) as value
FROM employee_monthly_activities
WHERE activities ? 'pengajianPersyarikatan'

UNION ALL

SELECT
    'Employees still with kegiatanTerjadwal' as metric,
    COUNT(*) as value
FROM employee_monthly_activities
WHERE activities ? 'kegiatanTerjadwal';

-- =====================================================
-- ROLLBACK (Jika ada masalah)
-- =====================================================

-- Jika perlu rollback, restore dari backup:
/*
TRUNCATE TABLE employee_monthly_activities;
INSERT INTO employee_monthly_activities SELECT * FROM employee_monthly_activities_backup_before_manual_cleanup;
SELECT '✅ Data restored from backup' as status;
*/

-- =====================================================
-- INSTRUKSI PENGGUNAAN:
-- =====================================================

/*
1. Script ini sudah otomatis:
   - ✅ Backup data di STEP 1
   - ✅ Hapus field dari semua level di STEP 4
   - ✅ Verifikasi hasil di STEP 5-7

2. Setelah menjalankan script ini:
   - Cek hasil di STEP 7 (semua count harus 0 kecuali "Total Employees")
   - Jika ada field yang masih tersisa, jalankan lagi STEP 4

3. Jika ingin rollback:
   - Uncomment query di bagian ROLLSTEP paling bawah
   - Atau gunakan: TRUNCATE TABLE employee_monthly_activities;
     INSERT INTO employee_monthly_activities SELECT * FROM employee_monthly_activities_backup_before_manual_cleanup;

4. Cleanup backup setelah verifikasi berhasil (opsional):
   DROP TABLE IF EXISTS employee_monthly_activities_backup_before_manual_cleanup;

⚠️ PENTING:
- Field kajianSelasa, pengajianPersyarikatan, dan kegiatanTerjadwal akan dihapus
- Data tanggal (format dd) akan tetap ada
- Setelah cleanup, user harus mencatat aktivitas ini secara MANUAL
*/
