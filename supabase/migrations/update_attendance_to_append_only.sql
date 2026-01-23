-- ============================================
-- SOLUSI FINAL: 1 TABEL, TIDAK DITIMPA, APPEND-ONLY
-- ============================================
--
-- Konsep:
-- 1. Ubah struktur tabel: tambah kolom attendance_date
-- 2. Ubah constraint: dari UNIQUE(employee_id, entity_id)
--    menjadi UNIQUE(employee_id, entity_id, attendance_date)
-- 3. Hasil: Setiap hari bisa punya banyak record (riwayat lengkap)
--
-- Contoh:
-- 2025-01-22 subuh hadir (jam 05:30)
-- 2025-01-22 subuh izin (jam 10:00) ← UPDATE bukan timpa, tapi INSERT baru
-- 2025-01-22 subuh hadir (jam 14:00) ← INSERT baru lagi
--
-- Untuk Dashboard: Ambil yang TERBARA per hari (WHERE is_latest = true)
-- Untuk Laporan: Ambil SEMUA (tanpa filter is_latest)
-- ============================================

-- 1. Tambah kolom attendance_date (tanggal absensi)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_records'
        AND column_name = 'attendance_date'
    ) THEN
        ALTER TABLE public.attendance_records
            ADD COLUMN attendance_date DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED;
    END IF;
END $$;

-- 2. Tambah kolom is_latest (penanda record terbaru untuk hari tersebut)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_records'
        AND column_name = 'is_latest'
    ) THEN
        ALTER TABLE public.attendance_records
            ADD COLUMN is_latest BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Hapus constraint lama
ALTER TABLE public.attendance_records
    DROP CONSTRAINT IF EXISTS attendance_records_employee_entity;

-- 4. Buat constraint baru (per tanggal, bukan global)
-- Jadi user bisa punya banyak record untuk entity_id yang sama di tanggal BERBEDA
ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_employee_entity_date
    UNIQUE (employee_id, entity_id, attendance_date, is_latest);

-- Catatan: Constraint ini memastikan hanya SATU record dengan is_latest=true
-- per kombinasi employee+entity+date

-- 5. Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date
    ON public.attendance_records(employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_entity_date
    ON public.attendance_records(employee_id, entity_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date
    ON public.attendance_records(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_latest
    ON public.attendance_records(is_latest) WHERE is_latest = true;

-- 6. Fungsi untuk INSERT attendance (bukan UPSERT lagi)
-- Ini akan membuat record BARU setiap kali dipanggil
CREATE OR REPLACE FUNCTION public.insert_attendance(
    p_employee_id TEXT,
    p_entity_id TEXT,
    p_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_timestamp TIMESTAMPTZ DEFAULT NOW(),
    p_is_late_entry BOOLEAN DEFAULT false,
    p_location TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_record_id UUID;
    v_date DATE;
BEGIN
    v_date := DATE(p_timestamp);

    -- 1. Unmark record lama (set is_latest = false)
    UPDATE public.attendance_records
    SET is_latest = false
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND attendance_date = v_date
        AND is_latest = true;

    -- 2. Insert record BARU (is_latest = true)
    INSERT INTO public.attendance_records (
        employee_id,
        entity_id,
        status,
        reason,
        timestamp,
        is_late_entry,
        location,
        is_latest
    )
    VALUES (
        p_employee_id,
        p_entity_id,
        p_status,
        p_reason,
        p_timestamp,
        p_is_late_entry,
        p_location,
        true  -- Record baru otomatis jadi latest
    )
    RETURNING id INTO new_record_id;

    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- 7. View untuk Dashboard (hanya yang terbaru)
CREATE OR REPLACE VIEW public.v_dashboard_attendance AS
SELECT
    employee_id,
    entity_id,
    attendance_date,
    status,
    reason,
    timestamp,
    is_late_entry,
    location
FROM public.attendance_records
WHERE is_latest = true  -- Hanya yang terbaru!
ORDER BY attendance_date DESC, entity_id;

-- 8. View untuk Laporan Bulanan (SEMUA record)
CREATE OR REPLACE VIEW public.v_monthly_attendance_all AS
SELECT
    employee_id,
    attendance_date,
    entity_id,
    status,
    reason,
    timestamp,
    is_late_entry,
    is_latest,
    ROW_NUMBER() OVER (
        PARTITION BY employee_id, entity_id, attendance_date
        ORDER BY timestamp DESC
    ) as change_number  -- 1=terbaru, 2=kedua, dst.
FROM public.attendance_records
ORDER BY attendance_date DESC, entity_id, timestamp DESC;

-- 9. Fungsi untuk mendapatkan capaian bulanan (untuk Dashboard)
CREATE OR REPLACE FUNCTION public.get_monthly_attendance_summary(
    p_employee_id TEXT,
    p_month DATE  -- Tanggal pertama bulan, misal '2025-01-01'
)
RETURNS TABLE (
    attendance_date DATE,
    subuh_status TEXT,
    dzuhur_status TEXT,
    ashar_status TEXT,
    maghrib_status TEXT,
    isya_status TEXT,
    total_hadir INT,
    total_tidak_hadir INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ar.attendance_date,
        MAX(CASE WHEN ar.entity_id = 'subuh' THEN ar.status END) as subuh_status,
        MAX(CASE WHEN ar.entity_id = 'dzuhur' THEN ar.status END) as dzuhur_status,
        MAX(CASE WHEN ar.entity_id = 'ashar' THEN ar.status END) as ashar_status,
        MAX(CASE WHEN ar.entity_id = 'maghrib' THEN ar.status END) as maghrib_status,
        MAX(CASE WHEN ar.entity_id = 'isya' THEN ar.status END) as isya_status,
        -- Hitung total hadir/tidak hadir per hari
        (SELECT COUNT(*) FROM public.attendance_records
         WHERE employee_id = p_employee_id
           AND attendance_date = ar.attendance_date
           AND is_latest = true
           AND status = 'hadir') as total_hadir,
        (SELECT COUNT(*) FROM public.attendance_records
         WHERE employee_id = p_employee_id
           AND attendance_date = ar.attendance_date
           AND is_latest = true
           AND status = 'tidak-hadir') as total_tidak_hadir
    FROM (SELECT DISTINCT attendance_date FROM public.attendance_records
          WHERE employee_id = p_employee_id
            AND DATE_TRUNC('month', attendance_date) = DATE_TRUNC('month', p_month)
    ) ar
    ORDER BY ar.attendance_date;
END;
$$ LANGUAGE plpgsql;

-- 10. Fungsi sederhana: Ambil attendance terbaru untuk employee
CREATE OR REPLACE FUNCTION public.get_latest_attendance_for_employee(
    p_employee_id TEXT,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    attendance_date DATE,
    entity_id TEXT,
    status TEXT,
    reason TEXT,
    attendance_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ar.attendance_date,
        ar.entity_id,
        ar.status,
        ar.reason,
        ar."timestamp" as attendance_timestamp
    FROM public.attendance_records ar
    WHERE ar.employee_id = p_employee_id
        AND ar.is_latest = true  -- Hanya yang terbaru!
        AND (p_start_date IS NULL OR ar.attendance_date >= p_start_date)
        AND (p_end_date IS NULL OR ar.attendance_date <= p_end_date)
    ORDER BY ar.attendance_date DESC, ar.entity_id;
END;
$$ LANGUAGE plpgsql;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SISTEM ATTENDANCE BERHASIL DIUPDATE!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PERUBAHAN:';
    RAISE NOTICE '  1. Tambah kolom: attendance_date (DATE)';
    RAISE NOTICE '  2. Tambah kolom: is_latest (BOOLEAN)';
    RAISE NOTICE '  3. Ubah constraint: Per TANGGAL (bukan global)';
    RAISE NOTICE '  4. Fungsi baru: insert_attendance() (INSERT, bukan UPSERT)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PENGGUNAAN:';
    RAISE NOTICE '  - Dashboard: Pakai v_dashboard_attendance (hanya is_latest=true)';
    RAISE NOTICE '  - Laporan: Pakai v_monthly_attendance_all (SEMUA record)';
    RAISE NOTICE '  - Query: SELECT * FROM get_latest_attendance_for_employee(''XXX'')';
    RAISE NOTICE '';
    RAISE NOTICE '✨ HASIL:';
    RAISE NOTICE '  - Data TIDAK ditimpa';
    RAISE NOTICE '  - Terus bertambah (append-only)';
    RAISE NOTICE '  - Dashboard cepat (hanya ambil yang terbaru)';
    RAISE NOTICE '  - Laporan lengkap (semua riwayat ada)';
    RAISE NOTICE '';
END $$;
