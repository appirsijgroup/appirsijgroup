-- ============================================
-- PANDUAN MENJALANKAN MIGRATION
-- ============================================
--
-- CARA 1: Via Supabase Dashboard (RECOMMENDED)
-- 1. Buka https://app.supabase.com/project/lkziomkegmimyiujlbvt/editor
-- 2. Copy paste isi dari file ini
-- 3. Klik "Run"
--
-- CARA 2: Via psql command line
-- psql -h db.lkziomkegmimyiujlbvt.supabase.co -U postgres -d postgres
--
-- ============================================

-- PART 1: AUDIT TRAIL UNTUK EMPLOYEE MONTHLY ACTIVITIES
-- (Isi dari create_employee_monthly_activities_audit.sql)

\echo '🔧 Creating audit trail for employee_monthly_activities...'

-- 1. Buat tabel audit
CREATE TABLE IF NOT EXISTS public.employee_monthly_activities_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    activities_snapshot JSONB NOT NULL,
    month_key TEXT,
    changed_day TEXT,
    activity_id_changed TEXT,
    old_value JSONB,
    new_value JSONB,
    change_type TEXT NOT NULL CHECK (change_type IN ('INITIAL', 'DAILY_UPDATE', 'FULL_SAVE', 'MERGE')),
    changed_by TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_id
    ON public.employee_monthly_activities_audit(employee_id DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_changed_at
    ON public.employee_monthly_activities_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_month_key
    ON public.employee_monthly_activities_audit(month_key);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_month
    ON public.employee_monthly_activities_audit(employee_id, month_key);

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.create_monthly_activities_audit()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.employee_monthly_activities_audit (
            employee_id, activities_snapshot, month_key, changed_day,
            activity_id_changed, old_value, new_value, change_type,
            changed_by, source
        )
        VALUES (
            NEW.employee_id, NEW.activities, NULL, NULL, NULL,
            NULL, NEW.activities, 'INITIAL', NEW.employee_id, 'auto_insert'
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.activities IS DISTINCT FROM NEW.activities THEN
            INSERT INTO public.employee_monthly_activities_audit (
                employee_id, activities_snapshot, old_value, new_value,
                change_type, changed_by, source
            )
            VALUES (
                NEW.employee_id, NEW.activities, OLD.activities,
                NEW.activities, 'FULL_SAVE', NEW.employee_id, 'auto_update'
            );
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.employee_monthly_activities_audit (
            employee_id, activities_snapshot, old_value, new_value,
            change_type, changed_by, notes
        )
        VALUES (
            OLD.employee_id, OLD.activities, OLD.activities, NULL,
            'DELETE', OLD.employee_id, 'Record deleted - backup saved'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_employee_monthly_activities_audit
    ON public.employee_monthly_activities;

CREATE TRIGGER trigger_employee_monthly_activities_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.employee_monthly_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.create_monthly_activities_audit();

\echo '✅ Audit trail for employee_monthly_activities created!'

-- PART 2: APPEND-ONLY SYSTEM UNTUK ATTENDANCE RECORDS
-- (Isi dari create_attendance_records_append_only.sql)

\echo '🔧 Creating append-only system for attendance_records...'

-- 1. Buat tabel attendance history (append-only)
CREATE TABLE IF NOT EXISTS public.attendance_records_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
    reason TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late_entry BOOLEAN DEFAULT FALSE,
    location TEXT,
    source TEXT DEFAULT 'manual',
    changed_by TEXT,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT
);

-- 2. Tambah kolom is_latest jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance_records_history'
        AND column_name = 'is_latest'
    ) THEN
        ALTER TABLE public.attendance_records_history
            ADD COLUMN is_latest BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_date
    ON public.attendance_records_history(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_entity_date
    ON public.attendance_records_history(employee_id, entity_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_date
    ON public.attendance_records_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_recorded_at
    ON public.attendance_records_history(recorded_at DESC);

-- 4. Buat tabel audit
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

-- 5. Fungsi utama: record_attendance (APPEND-ONLY)
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
    -- Unmark record lama
    UPDATE public.attendance_records_history
    SET is_latest = false
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = true;

    -- Simpan ID record lama
    SELECT id INTO old_latest_id
    FROM public.attendance_records_history
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = false
    LIMIT 1;

    -- Insert record BARU
    INSERT INTO public.attendance_records_history (
        employee_id, entity_id, date, status, reason, location,
        source, changed_by, is_latest, recorded_at
    )
    VALUES (
        p_employee_id, p_entity_id, p_date, p_status, p_reason,
        p_location, p_source, COALESCE(p_changed_by, p_employee_id),
        true, NOW()
    )
    RETURNING id INTO new_record_id;

    -- Log ke audit
    IF old_latest_id IS NOT NULL THEN
        INSERT INTO public.attendance_records_audit (
            employee_id, entity_id, date, old_record_id, new_record_id,
            old_status, new_status, change_type
        )
        SELECT
            p_employee_id, p_entity_id, p_date, old_latest_id,
            new_record_id, status, p_status, 'UPDATE'
        FROM public.attendance_records_history
        WHERE id = old_latest_id;
    ELSE
        INSERT INTO public.attendance_records_audit (
            employee_id, entity_id, date, new_record_id,
            old_status, new_status, change_type
        )
        VALUES (
            p_employee_id, p_entity_id, p_date, new_record_id,
            NULL, p_status, 'INSERT'
        );
    END IF;

    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Fungsi untuk mendapatkan status terbaru
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
        arh.id, arh.employee_id, arh.entity_id, arh.date,
        arh.status, arh.reason, arh.recorded_at
    FROM public.attendance_records_history arh
    WHERE arh.is_latest = true
        AND arh.employee_id = p_employee_id
        AND (p_entity_id IS NULL OR arh.entity_id = p_entity_id)
        AND (p_start_date IS NULL OR arh.date >= p_start_date)
        AND (p_end_date IS NULL OR arh.date <= p_end_date)
    ORDER BY arh.date DESC, arh.entity_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Views
CREATE OR REPLACE VIEW public.v_latest_attendance AS
SELECT
    employee_id, entity_id, date, status, reason, recorded_at, created_at
FROM public.attendance_records_history
WHERE is_latest = true
ORDER BY date DESC, employee_id, entity_id;

CREATE OR REPLACE VIEW public.v_attendance_changes AS
SELECT
    audit.employee_id, audit.entity_id, audit.date,
    audit.old_status, audit.new_status, audit.change_type,
    audit.changed_at,
    CASE
        WHEN audit.old_status IS NULL THEN 'Insert baru'
        WHEN audit.old_status != audit.new_status THEN 'Ubah dari ' || audit.old_status || ' → ' || audit.new_status
        ELSE 'Tidak ada perubahan'
    END as change_description
FROM public.attendance_records_audit audit
ORDER BY audit.changed_at DESC;

\echo '✅ Append-only system for attendance_records created!'

-- PART 3: RLS POLICIES
\echo '🔧 Setting up RLS policies...'

ALTER TABLE public.employee_monthly_activities_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_audit ENABLE ROW LEVEL SECURITY;

-- Employee monthly activities audit policies
CREATE POLICY IF NOT EXISTS "Allow employees to view own audit"
    ON public.employee_monthly_activities_audit
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Allow admins to view all audits"
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

-- Attendance history policies
CREATE POLICY IF NOT EXISTS "Allow employees to view own attendance history"
    ON public.attendance_records_history
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Allow admins to view all attendance history"
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

CREATE POLICY IF NOT EXISTS "Allow employees to insert own attendance"
    ON public.attendance_records_history
    FOR INSERT
    TO public
    WITH CHECK (employee_id = auth.uid()::text);

-- Prevent direct updates/deletes
CREATE POLICY IF NOT EXISTS "Prevent direct updates - use function"
    ON public.attendance_records_history
    FOR UPDATE
    TO public
    USING (false);

CREATE POLICY IF NOT EXISTS "Prevent delete of audit trail"
    ON public.attendance_records_history
    FOR DELETE
    TO public
    USING (false);

\echo '✅ RLS policies created!'

-- PART 4: PREVENT DELETION TRIGGERS
\echo '🔧 Setting up protection triggers...'

CREATE OR REPLACE FUNCTION public.prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TIDAK BISA MENGHAPUS AUDIT TRAIL. Data audit adalah IMMUTABLE untuk keamanan dan compliance.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_prevent_audit_delete
    BEFORE DELETE ON public.employee_monthly_activities_audit
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_delete();

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

CREATE TRIGGER IF NOT EXISTS trigger_prevent_attendance_modification
    BEFORE UPDATE OR DELETE ON public.attendance_records_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_attendance_history_modification();

\echo '✅ Protection triggers created!'

\echo '🎉 ALL DONE! Audit trail and append-only systems are now active!'
\echo '📝 Check tables: employee_monthly_activities_audit, attendance_records_history, attendance_records_audit'
