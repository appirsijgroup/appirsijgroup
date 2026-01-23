-- ============================================
-- AUDIT TRAIL SYSTEM FOR EMPLOYEE MONTHLY ACTIVITIES
-- Purpose: MENYIMPAN SETIAP PERUBAHAN DATA - TIDAK ADA DATA YANG HILANG
-- ============================================

-- 1. Buat tabel audit yang menyimpan SEMUA perubahan
CREATE TABLE IF NOT EXISTS public.employee_monthly_activities_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,

    -- Snapshot lengkap activities pada saat perubahan
    -- Ini adalah BACKUP dari seluruh data bulanan
    activities_snapshot JSONB NOT NULL,

    -- Metadata perubahan
    month_key TEXT, -- Bulan mana yang diubah (jika spesifik)
    changed_day TEXT, -- Hari mana yang diubah (jika spesifik)
    activity_id_changed TEXT, -- Activity apa yang diubah
    old_value JSONB, -- Nilai lama (untuk tracking perubahan spesifik)
    new_value JSONB, -- Nilai baru

    -- Informasi perubahan
    change_type TEXT NOT NULL CHECK (change_type IN ('INITIAL', 'DAILY_UPDATE', 'FULL_SAVE', 'MERGE')),
    changed_by TEXT, -- Employee ID yang melakukan perubahan
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Source tracking
    source TEXT, -- 'dashboard', 'aktivitas_saya', 'api', etc.
    ip_address TEXT,
    user_agent TEXT,

    -- Additional context
    notes TEXT
);

-- 2. Indexes untuk query cepat
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_id
    ON public.employee_monthly_activities_audit(employee_id DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_changed_at
    ON public.employee_monthly_activities_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_month_key
    ON public.employee_monthly_activities_audit(month_key);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_month
    ON public.employee_monthly_activities_audit(employee_id, month_key);

-- 3. Fungsi untuk membuat audit entry otomatis
CREATE OR REPLACE FUNCTION public.create_monthly_activities_audit()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    changed_month TEXT;
    changed_day TEXT;
    changed_activity TEXT;
BEGIN
    -- Tentukan jenis perubahan
    IF TG_OP = 'INSERT' THEN
        -- Initial data
        payload = NEW.activities;
        changed_month = NULL;
        changed_day = NULL;
        changed_activity = NULL;

        INSERT INTO public.employee_monthly_activities_audit (
            employee_id,
            activities_snapshot,
            month_key,
            changed_day,
            activity_id_changed,
            old_value,
            new_value,
            change_type,
            changed_by,
            source
        )
        VALUES (
            NEW.employee_id,
            NEW.activities,
            changed_month,
            changed_day,
            changed_activity,
            NULL,
            payload,
            'INITIAL',
            NEW.employee_id,
            'auto_insert'
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect apa yang berubah
        payload = NEW.activities;

        -- Cek apakah ada perubahan (gunakan hstore untuk compare JSONB)
        IF OLD.activities IS DISTINCT FROM NEW.activities THEN
            -- Analisis perubahan untuk menemukan month/day/activity yang berubah
            -- Ini complex, jadi kita simpan full snapshot dulu
            INSERT INTO public.employee_monthly_activities_audit (
                employee_id,
                activities_snapshot,
                old_value,
                new_value,
                change_type,
                changed_by,
                source
            )
            VALUES (
                NEW.employee_id,
                NEW.activities,
                OLD.activities,
                NEW.activities,
                'FULL_SAVE',
                NEW.employee_id,
                'auto_update'
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Backup data sebelum delete
        INSERT INTO public.employee_monthly_activities_audit (
            employee_id,
            activities_snapshot,
            old_value,
            new_value,
            change_type,
            changed_by,
            notes
        )
        VALUES (
            OLD.employee_id,
            OLD.activities,
            OLD.activities,
            NULL,
            'DELETE',
            OLD.employee_id,
            'Record deleted - backup saved'
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger otomatis untuk setiap INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS trigger_employee_monthly_activities_audit
    ON public.employee_monthly_activities;

CREATE TRIGGER trigger_employee_monthly_activities_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.employee_monthly_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.create_monthly_activities_audit();

-- 5. Comment
COMMENT ON TABLE public.employee_monthly_activities_audit IS 'Audit trail untuk employee_monthly_activities - MENYIMPAN SETIAP PERUBAHAN DATA. TIDAK ADA DATA YANG HILANG. Data ini bisa digunakan untuk restore atau tracking riwayat perubahan.';

COMMENT ON COLUMN public.employee_monthly_activities_audit.activities_snapshot IS 'Snapshot lengkap seluruh activities saat perubahan terjadi. Ini adalah BACKUP data.';

COMMENT ON COLUMN public.employee_monthly_activities_audit.change_type IS 'INITIAL = pertama kali create, DAILY_UPDATE = update harian, FULL_SAVE = save full data, MERGE = merge data';

-- 6. Fungsi utility untuk melihat riwayat perubahan
CREATE OR REPLACE FUNCTION public.get_employee_activity_history(
    p_employee_id TEXT,
    p_month_key TEXT DEFAULT NULL,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    changed_at TIMESTAMPTZ,
    change_type TEXT,
    activities_snapshot JSONB,
    month_key TEXT,
    changed_day TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        audit.id,
        audit.changed_at,
        audit.change_type,
        audit.activities_snapshot,
        audit.month_key,
        audit.changed_day
    FROM public.employee_monthly_activities_audit audit
    WHERE audit.employee_id = p_employee_id
        AND (p_month_key IS NULL OR audit.month_key = p_month_key)
    ORDER BY audit.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Fungsi untuk RESTORE data dari audit
CREATE OR REPLACE FUNCTION public.restore_employee_activities_from_audit(
    p_audit_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_employee_id TEXT;
    v_activities JSONB;
BEGIN
    -- Ambil data dari audit
    SELECT employee_id, activities_snapshot
    INTO v_employee_id, v_activities
    FROM public.employee_monthly_activities_audit
    WHERE id = p_audit_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit record not found';
    END IF;

    -- Restore ke tabel utama
    INSERT INTO public.employee_monthly_activities (employee_id, activities)
    VALUES (v_employee_id, v_activities)
    ON CONFLICT (employee_id) DO UPDATE
    SET activities = EXCLUDED.activities,
        updated_at = NOW();

    -- Log restore action
    INSERT INTO public.employee_monthly_activities_audit (
        employee_id,
        activities_snapshot,
        old_value,
        new_value,
        change_type,
        changed_by,
        notes
    )
    VALUES (
        v_employee_id,
        v_activities,
        NULL,
        v_activities,
        'RESTORE',
        v_employee_id,
        'Restored from audit ID: ' || p_audit_id
    );

    RETURN v_activities;
END;
$$ LANGUAGE plpgsql;

-- 8. View untuk rekapitulasi perubahan harian
CREATE OR REPLACE VIEW public.v_daily_activity_changes AS
SELECT
    employee_id,
    DATE(changed_at) as change_date,
    COUNT(*) as total_changes,
    STRING_AGG(DISTINCT change_type, ', ') as change_types,
    MIN(changed_at) as first_change,
    MAX(changed_at) as last_change
FROM public.employee_monthly_activities_audit
GROUP BY employee_id, DATE(changed_at)
ORDER BY change_date DESC, employee_id;

COMMENT ON VIEW public.v_daily_activity_changes IS 'View untuk melihat rekapitulasi perubahan per hari - berguna untuk tracking aktivitas harian user';

-- 9. Policy untuk RLS
ALTER TABLE public.employee_monthly_activities_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Employee bisa lihat audit sendiri
CREATE POLICY "Allow employees to view own audit"
    ON public.employee_monthly_activities_audit
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

-- Policy: Admin bisa lihat semua audit
CREATE POLICY "Allow admins to view all audits"
    ON public.employee_monthly_activities_audit
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.id = employee_monthly_activities_audit.employee_id
            AND employees.role IN ('admin', 'super-admin')
        )
    );

-- 10. Trigger untuk mencegah delete pada audit (immutable)
CREATE OR REPLACE FUNCTION public.prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TIDAK BISA MENGHAPUS AUDIT TRAIL. Data audit adalah IMMUTABLE untuk keamanan dan compliance.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON public.employee_monthly_activities_audit
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_delete();
