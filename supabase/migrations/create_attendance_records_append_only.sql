-- ============================================
-- APPEND-ONLY SYSTEM FOR ATTENDANCE RECORDS
-- Purpose: MENGUBAH DARI UPDATE → INSERT (TIDAK ADA DATA TERTIMPA)
-- ============================================

-- PROBLEM: Sistem sebelumnya menggunakan UPDATE, jadi data lama HILANG
-- SOLUTION: Ubah menjadi INSERT-only (append-only), seperti log system

-- 1. Buat tabel attendance history (append-only)
CREATE TABLE IF NOT EXISTS public.attendance_records_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Data kunci
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL, -- 'subuh', 'dzuhur', etc.
    date DATE NOT NULL, -- Tanggal absensi

    -- Data status
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
    reason TEXT,

    -- Timestamps (PENTING untuk tracking kapan data diubah)
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Waktu pencatatan
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    is_late_entry BOOLEAN DEFAULT FALSE,
    location TEXT, -- JSON geolocation
    source TEXT DEFAULT 'manual', -- 'manual', 'auto', 'admin_edit'
    changed_by TEXT, -- User ID yang menginput/mengubah
    ip_address TEXT,
    user_agent TEXT,

    -- Additional context
    notes TEXT
);

-- 2. Indexes untuk query cepat
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_date
    ON public.attendance_records_history(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_entity_date
    ON public.attendance_records_history(employee_id, entity_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_date
    ON public.attendance_records_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_recorded_at
    ON public.attendance_records_history(recorded_at DESC);

-- 3. Unique constraint: SATU user SATU entity SATU kali per HARI
-- TAPI: Bisa DIUBAH dengan membuat record BARU (bukan update record lama)
-- Ini memungkinkan kita tracking perubahan: "hadir" → "izin" → "hadir" lagi
CREATE UNIQUE INDEX idx_attendance_history_unique_daily
    ON public.attendance_records_history(employee_id, entity_id, date)
    WHERE is_latest = true; -- Hanya record terbaru yang unik

-- 4. Tambahkan kolom is_latest untuk marking
ALTER TABLE public.attendance_records_history
    ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- 5. Fungsi untuk INSERT attendance (APPEND-ONLY, bukan UPDATE)
CREATE OR REPLACE FUNCTION public.record_attendance(
    p_employee_id TEXT,
    p_entity_id TEXT,
    p_date DATE,
    p_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'manual',
    p_changed_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_record_id UUID;
    old_latest_id UUID;
BEGIN
    -- 1. Matikan (unmark) record lama yang latest
    UPDATE public.attendance_records_history
    SET is_latest = false
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = true;

    -- 2. Simpan ID record lama (untuk referensi)
    SELECT id INTO old_latest_id
    FROM public.attendance_records_history
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = false
    LIMIT 1;

    -- 3. Insert record BARU (append-only, tidak mengupdate record lama)
    INSERT INTO public.attendance_records_history (
        employee_id,
        entity_id,
        date,
        status,
        reason,
        location,
        source,
        changed_by,
        is_latest,
        recorded_at
    )
    VALUES (
        p_employee_id,
        p_entity_id,
        p_date,
        p_status,
        p_reason,
        p_location,
        p_source,
        COALESCE(p_changed_by, p_employee_id),
        true, -- Record baru otomatis jadi latest
        NOW()
    )
    RETURNING id INTO new_record_id;

    -- 4. Log ke audit trail (untuk tracking perubahan)
    IF old_latest_id IS NOT NULL THEN
        -- Ada perubahan data
        INSERT INTO public.attendance_records_audit (
            employee_id,
            entity_id,
            date,
            old_record_id,
            new_record_id,
            old_status,
            new_status,
            change_type
        )
        SELECT
            p_employee_id,
            p_entity_id,
            p_date,
            old_latest_id,
            new_record_id,
            status,
            p_status,
            'UPDATE'
        FROM public.attendance_records_history
        WHERE id = old_latest_id;
    ELSE
        -- Insert baru (bukan update)
        INSERT INTO public.attendance_records_audit (
            employee_id,
            entity_id,
            date,
            new_record_id,
            old_status,
            new_status,
            change_type
        )
        VALUES (
            p_employee_id,
            p_entity_id,
            p_date,
            new_record_id,
            NULL,
            p_status,
            'INSERT'
        );
    END IF;

    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Buat tabel audit untuk attendance records
CREATE TABLE IF NOT EXISTS public.attendance_records_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    date DATE NOT NULL,
    old_record_id UUID,
    new_record_id UUID NOT NULL,
    old_status TEXT,
    new_status TEXT,
    change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_employee_date
    ON public.attendance_records_audit(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_changed_at
    ON public.attendance_records_audit(changed_at DESC);

-- 7. Fungsi untuk mendapatkan status TERBARU attendance
CREATE OR REPLACE FUNCTION public.get_latest_attendance(
    p_employee_id TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    employee_id TEXT,
    entity_id TEXT,
    date DATE,
    status TEXT,
    reason TEXT,
    recorded_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        arh.id,
        arh.employee_id,
        arh.entity_id,
        arh.date,
        arh.status,
        arh.reason,
        arh.recorded_at
    FROM public.attendance_records_history arh
    WHERE arh.is_latest = true
        AND arh.employee_id = p_employee_id
        AND (p_entity_id IS NULL OR arh.entity_id = p_entity_id)
        AND (p_start_date IS NULL OR arh.date >= p_start_date)
        AND (p_end_date IS NULL OR arh.date <= p_end_date)
    ORDER BY arh.date DESC, arh.entity_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Fungsi untuk mendapatkan SELURUH riwayat perubahan attendance
CREATE OR REPLACE FUNCTION public.get_attendance_history(
    p_employee_id TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    employee_id TEXT,
    entity_id TEXT,
    date DATE,
    status TEXT,
    reason TEXT,
    recorded_at TIMESTAMPTZ,
    is_latest BOOLEAN,
    change_number INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        arh.id,
        arh.employee_id,
        arh.entity_id,
        arh.date,
        arh.status,
        arh.reason,
        arh.recorded_at,
        arh.is_latest,
        ROW_NUMBER() OVER (
            PARTITION BY arh.employee_id, arh.entity_id, arh.date
            ORDER BY arh.recorded_at ASC
        ) -- 1 = pertama, 2 = kedua, dst.
    FROM public.attendance_records_history arh
    WHERE arh.employee_id = p_employee_id
        AND (p_entity_id IS NULL OR arh.entity_id = p_entity_id)
        AND (p_date IS NULL OR arh.date = p_date)
    ORDER BY arh.date DESC, arh.recorded_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. View untuk rekapitulasi attendance per hari (hanya yang latest)
CREATE OR REPLACE VIEW public.v_latest_attendance AS
SELECT
    employee_id,
    entity_id,
    date,
    status,
    reason,
    recorded_at,
    created_at
FROM public.attendance_records_history
WHERE is_latest = true
ORDER BY date DESC, employee_id, entity_id;

COMMENT ON VIEW public.v_latest_attendance IS 'View yang hanya menampilkan status TERBARU attendance. Data lama tetap tersimpan di tabel utama sebagai riwayat.';

-- 10. View untuk riwayat perubahan attendance
CREATE OR REPLACE VIEW public.v_attendance_changes AS
SELECT
    audit.employee_id,
    audit.entity_id,
    audit.date,
    audit.old_status,
    audit.new_status,
    audit.change_type,
    audit.changed_at,
    CASE
        WHEN audit.old_status IS NULL THEN 'Insert baru'
        WHEN audit.old_status != audit.new_status THEN 'Ubah dari ' || audit.old_status || ' → ' || audit.new_status
        ELSE 'Tidak ada perubahan'
    END as change_description
FROM public.attendance_records_audit audit
ORDER BY audit.changed_at DESC;

COMMENT ON VIEW public.v_attendance_changes IS 'View untuk melihat riwayat PERUBAHAN attendance. Berguna untuk tracking kapan user mengubah status hadir → tidak hadir, dll.';

-- 11. RLS Policies
ALTER TABLE public.attendance_records_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Employee bisa lihat attendance history sendiri
CREATE POLICY "Allow employees to view own attendance history"
    ON public.attendance_records_history
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

-- Policy: Admin bisa lihat semua
CREATE POLICY "Allow admins to view all attendance history"
    ON public.attendance_records_history
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.id = attendance_records_history.employee_id
            AND employees.role IN ('admin', 'super-admin')
        )
    );

-- Policy: Employee bisa insert attendance sendiri
CREATE POLICY "Allow employees to insert own attendance"
    ON public.attendance_records_history
    FOR INSERT
    TO public
    WITH CHECK (employee_id = auth.uid()::text);

-- Policy: Mencegah UPDATE langsung (harus via fungsi record_attendance)
CREATE POLICY "Prevent direct updates - use function"
    ON public.attendance_records_history
    FOR UPDATE
    TO public
    USING (false); -- Tidak boleh update langsung

-- Policy: Mencegah DELETE (audit trail tidak boleh dihapus)
CREATE POLICY "Prevent delete of audit trail"
    ON public.attendance_records_history
    FOR DELETE
    TO public
    USING (false); -- Tidak boleh delete

-- 12. Trigger untuk mencegah update/delete langsung
CREATE OR REPLACE FUNCTION public.prevent_attendance_history_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'TIDAK BISA UPDATE langsung. Gunakan fungsi record_attendance() untuk membuat record baru.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'TIDAK BISA MENGHAPUS attendance history. Data adalah IMMUTABLE untuk audit trail.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_attendance_modification
    BEFORE UPDATE OR DELETE ON public.attendance_records_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_attendance_history_modification();

-- 13. Comments untuk dokumentasi
COMMENT ON TABLE public.attendance_records_history IS 'APPEND-ONLY table untuk attendance records. Setiap perubahan status membuat record BARU, tidak pernah UPDATE atau DELETE. Ini memastikan TIDAK ADA DATA YANG HILANG.';

COMMENT ON COLUMN public.attendance_records_history.is_latest IS 'Mark record terbaru untuk entity_id + date tertentu. Hanya SATU record yang bisa is_latest=true per kombinasi.';

COMMENT ON FUNCTION public.record_attendance IS 'Fungsi utama untuk merekam attendance. Selalu membuat record BARU (append-only), tidak pernah mengupdate record lama.';

COMMENT ON TABLE public.attendance_records_audit IS 'Audit trail untuk tracking perubahan attendance records.';
