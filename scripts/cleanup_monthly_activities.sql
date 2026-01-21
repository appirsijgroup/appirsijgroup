-- 🔧 CLEANUP SCRIPT: Hapus field asing dari employee_monthly_activities
-- 📝 Masalah: Field kegiatan (kie, doaBersama, kajianSelasa, dll) tercampur dengan data pelaporan pribadi
-- ✅ Solusi: Hapus field asing, biarkan HANYA data tanggal (dd)

-- =====================================================
-- STEP 1: Backup data sebelum cleanup (PENTING!)
-- =====================================================

-- Buat backup table
CREATE TABLE IF NOT EXISTS employee_monthly_activities_backup_2026_01_21 AS
SELECT * FROM employee_monthly_activities;

-- Atau export ke JSON (jika perlu)
-- Copy hasil dari query ini dan simpan sebagai backup:
SELECT
    employee_id,
    activities,
    updated_at,
    created_at
FROM employee_monthly_activities
ORDER BY employee_id;

-- =====================================================
-- STEP 2: Lihat data yang akan dibersihkan
-- =====================================================

-- Cek structure data yang bermasalah
SELECT
    employee_id,
    key_name as key_name,
    CASE
        WHEN key_name ~ '^\d{2}$' THEN '✅ Tanggal (VALID)'
        ELSE '❌ Field Asing (HAPUS)'
    END as key_type
FROM employee_monthly_activities,
     jsonb_object_keys(activities) as key_name
WHERE activities IS NOT NULL
ORDER BY employee_id, key_name;

-- =====================================================
-- STEP 3: Cleanup - Hapus field asing dari setiap employee
-- =====================================================

-- Tampilkan jumlah employee yang akan di-update
SELECT COUNT(DISTINCT employee_id) as total_affected_employees
FROM employee_monthly_activities
WHERE activities IS NOT NULL
  AND (activities ? 'kie'
    OR activities ? 'doaBersama'
    OR activities ? 'kajianSelasa'
    OR activities ? 'pengajianPersyarikatan'
    OR activities ? 'kegiatanTerjadwal');

-- =====================================================
-- STEP 4: Jalankan Cleanup untuk setiap employee
-- =====================================================

-- ⚠️ UNTUK SETIAP EMPLOYEE: Jalankan query ini satu per satu
-- Ganti {employee_id} dengan ID employee yang sebenarnya

-- CONTOH untuk employee_id = 6000:
UPDATE employee_monthly_activities
SET activities = (
    SELECT jsonb_object_agg(
        key,
        value
    )
    FROM jsonb_each(activities)
    WHERE key ~ '^\d{2}$'  -- HANYA field yang 2 digit angka (tanggal)
)
WHERE employee_id = '6000'
  AND activities IS NOT NULL;

-- =====================================================
-- STEP 5: Verifikasi hasil cleanup
-- =====================================================

-- Cek apakah field asing sudah hilang
SELECT
    employee_id,
    CASE
        WHEN NOT (activities ? 'kie'
              OR activities ? 'doaBersama'
              OR activities ? 'kajianSelasa'
              OR activities ? 'pengajianPersyarikatan'
              OR activities ? 'kegiatanTerjadwal')
        THEN '✅ BERSIH'
        ELSE '❌ MASIH ADA FIELD ASING'
    END as cleanup_status
FROM employee_monthly_activities
WHERE activities IS NOT NULL
ORDER BY employee_id;

-- =====================================================
-- STEP 6: Lihat structure setelah cleanup
-- =====================================================

-- Cek struktur yang sudah bersih (SIMPLIFIED)
SELECT
    employee_id,
    activities
FROM employee_monthly_activities
WHERE employee_id = '6000'  -- Ganti dengan employee_id Anda
  AND activities IS NOT NULL;

-- =====================================================
-- ROLLBACK (Jika ada masalah)
-- =====================================================

-- Jika perlu rollback, restore dari backup:
-- TRUNCATE TABLE employee_monthly_activities;
-- INSERT INTO employee_monthly_activities SELECT * FROM employee_monthly_activities_backup_2026_01_21;

-- =====================================================
-- INSTRUKSI:
-- =====================================================

/*
1. BACKUP DULU! Jalankan STEP 1 dan simpan hasilnya
2. Jalankan STEP 2 untuk melihat data yang bermasalah
3. Jalankan STEP 4 untuk setiap employee yang tercemar
4. Jalankan STEP 5 untuk verifikasi
5. Jalankan STEP 6 untuk melihat hasil akhir

⚠️ PENTING: Jangan lupa backup sebelum menjalankan cleanup!
*/
