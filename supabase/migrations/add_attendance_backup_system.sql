-- ============================================
-- BACKUP SYSTEM UNTUK TABEL ATTENDANCE_RECORDS LAMA
-- Presensi sholat tercatat SEMUA dalam 1 bulan
-- ============================================

-- 1. Tambah kolom date jika belum ada
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

-- 2. Buat tabel backup/histori
CREATE TABLE IF NOT EXISTS public.attendance_records_backup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_record_id UUID, -- ID dari tabel attendance_records

    -- Data yang di-backup
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_late_entry BOOLEAN DEFAULT FALSE,
    location TEXT,

    -- Metadata backup
    backup_created_at TIMESTAMPTZ DEFAULT NOW(),
    backup_action TEXT NOT NULL, -- 'UPDATE', 'DELETE'
    old_status TEXT, -- Status sebelum diubah
    new_status TEXT, -- Status setelah diubah
    changed_by TEXT
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_backup_employee_date
    ON public.attendance_records_backup(employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_backup_employee_entity_date
    ON public.attendance_records_backup(employee_id, entity_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_backup_date
    ON public.attendance_records_backup(attendance_date DESC);

-- 4. Fungsi untuk mem-backup record SEBELUM diupdate
CREATE OR REPLACE FUNCTION public.backup_attendance_before_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Backup data lama sebelum di-update
    INSERT INTO public.attendance_records_backup (
        original_record_id,
        employee_id,
        entity_id,
        attendance_date,
        status,
        reason,
        timestamp,
        is_late_entry,
        location,
        backup_action,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        OLD.id,
        OLD.employee_id,
        OLD.entity_id,
        DATE(OLD.timestamp),
        OLD.status,
        OLD.reason,
        OLD.timestamp,
        OLD.is_late_entry,
        OLD.location,
        'UPDATE',
        OLD.status,
        NEW.status,
        CURRENT_USER
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Fungsi untuk mem-backup record SEBELUM di-delete
CREATE OR REPLACE FUNCTION public.backup_attendance_before_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Backup data sebelum di-delete
    INSERT INTO public.attendance_records_backup (
        original_record_id,
        employee_id,
        entity_id,
        attendance_date,
        status,
        reason,
        timestamp,
        is_late_entry,
        location,
        backup_action,
        old_status,
        new_status,
        changed_by
    )
    VALUES (
        OLD.id,
        OLD.employee_id,
        OLD.entity_id,
        DATE(OLD.timestamp),
        OLD.status,
        OLD.reason,
        OLD.timestamp,
        OLD.is_late_entry,
        OLD.location,
        'DELETE',
        OLD.status,
        NULL,
        CURRENT_USER
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS trigger_backup_attendance_update ON public.attendance_records;
DROP TRIGGER IF EXISTS trigger_backup_attendance_delete ON public.attendance_records;

-- 7. Buat trigger
CREATE TRIGGER trigger_backup_attendance_update
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.backup_attendance_before_update();

CREATE TRIGGER trigger_backup_attendance_delete
    BEFORE DELETE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.backup_attendance_before_delete();

-- 8. View untuk melihat rekap bulanan (all records included)
CREATE OR REPLACE VIEW public.v_monthly_attendance_report AS
SELECT
    employee_id,
    attendance_date,
    entity_id,
    status,
    reason,
    "timestamp",  -- Quote because timestamp is reserved keyword
    is_late_entry,
    created_at,
    updated_at,
    -- Flag: apakah ini record terbaru untuk hari ini?
    ROW_NUMBER() OVER (
        PARTITION BY employee_id, entity_id, DATE("timestamp")
        ORDER BY updated_at DESC
    ) = 1 as is_latest_for_day
FROM public.attendance_records
ORDER BY attendance_date DESC, entity_id, updated_at DESC;

COMMENT ON VIEW public.v_monthly_attendance_report IS 'Laporan bulanan attendance. is_latest_for_day = true menunjukkan record terbaru untuk hari tersebut.';

-- 9. View untuk melihat riwayat perubahan (dari backup table)
CREATE OR REPLACE VIEW public.v_attendance_change_history AS
SELECT
    employee_id,
    attendance_date,
    entity_id,
    old_status,
    new_status,
    backup_action,
    backup_created_at,
    CASE
        WHEN backup_action = 'UPDATE' THEN 'Diubah dari ' || old_status || ' → ' || new_status
        WHEN backup_action = 'DELETE' THEN 'Dihapus (status: ' || old_status || ')'
        ELSE 'Baru'
    END as change_description
FROM public.attendance_records_backup
ORDER BY backup_created_at DESC;

COMMENT ON VIEW public.v_attendance_change_history IS 'Riwayat semua perubahan attendance. Berguna untuk audit dan tracking.';

-- 10. Fungsi untuk mengambil attendance untuk 1 bulan lengkap
CREATE OR REPLACE FUNCTION public.get_monthly_attendance(
    p_employee_id TEXT,
    p_month DATE -- Gunakan tanggal pertama bulan, misal '2025-01-01'
)
RETURNS TABLE (
    attendance_date DATE,
    entity_id TEXT,
    status TEXT,
    reason TEXT,
    attendance_timestamp TIMESTAMPTZ,
    is_latest_for_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(ar."timestamp") as attendance_date,
        ar.entity_id,
        ar.status,
        ar.reason,
        ar."timestamp" as attendance_timestamp,
        ROW_NUMBER() OVER (
            PARTITION BY ar.employee_id, ar.entity_id, DATE(ar."timestamp")
            ORDER BY ar.updated_at DESC
        ) = 1 as is_latest_for_day
    FROM public.attendance_records ar
    WHERE ar.employee_id = p_employee_id
        AND DATE_TRUNC('month', ar."timestamp") = DATE_TRUNC('month', p_month)
    ORDER BY ar."timestamp" DESC, ar.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Fungsi untuk mengambil rekap bulanan (hanya yang terbaru)
CREATE OR REPLACE FUNCTION public.get_monthly_attendance_summary(
    p_employee_id TEXT,
    p_month DATE
)
RETURNS TABLE (
    attendance_date DATE,
    subuh_status TEXT,
    dzuhur_status TEXT,
    ashar_status TEXT,
    maghrib_status TEXT,
    isya_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_attendance AS (
        SELECT
            DATE(ar."timestamp") as attendance_date,
            ar.entity_id,
            ar.status,
            ROW_NUMBER() OVER (
                PARTITION BY ar.employee_id, ar.entity_id, DATE(ar."timestamp")
                ORDER BY ar.updated_at DESC
            ) as rn
        FROM public.attendance_records ar
        WHERE ar.employee_id = p_employee_id
            AND DATE_TRUNC('month', ar."timestamp") = DATE_TRUNC('month', p_month)
    )
    SELECT
        attendance_date,
        MAX(CASE WHEN entity_id = 'subuh' THEN status END) as subuh_status,
        MAX(CASE WHEN entity_id = 'dzuhur' THEN status END) as dzuhur_status,
        MAX(CASE WHEN entity_id = 'ashar' THEN status END) as ashar_status,
        MAX(CASE WHEN entity_id = 'maghrib' THEN status END) as maghrib_status,
        MAX(CASE WHEN entity_id = 'isya' THEN status END) as isya_status
    FROM latest_attendance
    WHERE rn = 1 -- Hanya ambil yang terbaru
    GROUP BY attendance_date
    ORDER BY attendance_date;
END;
$$ LANGUAGE plpgsql;

-- 12. Enable RLS untuk backup table
ALTER TABLE public.attendance_records_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow employees to view own backup"
    ON public.attendance_records_backup
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Allow admins to view all backups"
    ON public.attendance_records_backup
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.id = attendance_records_backup.employee_id
            AND employees.role IN ('admin', 'super-admin')
        )
    );

-- Mencegah delete/insert langsung ke backup table (immutable)
CREATE POLICY IF NOT EXISTS "Prevent direct delete from backup"
    ON public.attendance_records_backup
    FOR DELETE
    TO public
    USING (false);

CREATE POLICY IF NOT EXISTS "Prevent direct insert to backup"
    ON public.attendance_records_backup
    FOR INSERT
    TO public
    WITH CHECK (false);

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ SISTEM BACKUP ATTENDANCE BERHASIL DIPASANG!';
    RAISE NOTICE '✅ Backup otomatis setiap UPDATE/DELETE';
    RAISE NOTICE '✅ Semua presensi sholat tercatat lengkap';
    RAISE NOTICE '✅ Views siap untuk laporan bulanan';
END $$;
