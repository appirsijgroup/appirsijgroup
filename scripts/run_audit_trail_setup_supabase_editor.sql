-- ============================================
-- AUDIT TRAIL SYSTEM - SUPABASE SQL EDITOR VERSION
-- Clean version without psql-specific commands
-- ============================================

-- PART 1: AUDIT TRAIL FOR EMPLOYEE MONTHLY ACTIVITIES
-- ===================================================

-- 1. Create audit table
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

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_id
    ON public.employee_monthly_activities_audit(employee_id DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_changed_at
    ON public.employee_monthly_activities_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_month_key
    ON public.employee_monthly_activities_audit(month_key);
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_audit_employee_month
    ON public.employee_monthly_activities_audit(employee_id, month_key);

-- 3. Create trigger function
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

-- 4. Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_employee_monthly_activities_audit
    ON public.employee_monthly_activities;

-- 5. Create trigger
CREATE TRIGGER trigger_employee_monthly_activities_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.employee_monthly_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.create_monthly_activities_audit();

-- PART 2: APPEND-ONLY SYSTEM FOR ATTENDANCE RECORDS
-- ===================================================

-- 6. Create attendance history table (append-only)
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

-- 7. Add is_latest column if not exists
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

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_date
    ON public.attendance_records_history(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_employee_entity_date
    ON public.attendance_records_history(employee_id, entity_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_date
    ON public.attendance_records_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_history_recorded_at
    ON public.attendance_records_history(recorded_at DESC);

-- 9. Create audit table
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

-- 10. Create record_attendance function (APPEND-ONLY)
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
    -- Unmark old record
    UPDATE public.attendance_records_history
    SET is_latest = false
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = true;

    -- Get old record ID
    SELECT id INTO old_latest_id
    FROM public.attendance_records_history
    WHERE employee_id = p_employee_id
        AND entity_id = p_entity_id
        AND date = p_date
        AND is_latest = false
    LIMIT 1;

    -- Insert NEW record (APPEND-ONLY)
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

    -- Log to audit
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

-- 11. Create get_latest_attendance function
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

-- 12. Create views
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

-- PART 3: RLS POLICIES
-- ===================

ALTER TABLE public.employee_monthly_activities_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records_audit ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist (to avoid errors)
DROP POLICY IF EXISTS "Allow employees to view own audit" ON public.employee_monthly_activities_audit;
DROP POLICY IF EXISTS "Allow admins to view all audits" ON public.employee_monthly_activities_audit;
DROP POLICY IF EXISTS "Allow employees to view own attendance history" ON public.attendance_records_history;
DROP POLICY IF EXISTS "Allow admins to view all attendance history" ON public.attendance_records_history;
DROP POLICY IF EXISTS "Allow employees to insert own attendance" ON public.attendance_records_history;
DROP POLICY IF EXISTS "Prevent direct updates - use function" ON public.attendance_records_history;
DROP POLICY IF EXISTS "Prevent delete of audit trail" ON public.attendance_records_history;

-- Employee monthly activities audit policies
CREATE POLICY "Allow employees to view own audit"
    ON public.employee_monthly_activities_audit
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

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

-- Attendance history policies
CREATE POLICY "Allow employees to view own attendance history"
    ON public.attendance_records_history
    FOR SELECT
    TO public
    USING (employee_id = auth.uid()::text);

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

CREATE POLICY "Allow employees to insert own attendance"
    ON public.attendance_records_history
    FOR INSERT
    TO public
    WITH CHECK (employee_id = auth.uid()::text);

-- Prevent direct updates/deletes
CREATE POLICY "Prevent direct updates - use function"
    ON public.attendance_records_history
    FOR UPDATE
    TO public
    USING (false);

CREATE POLICY "Prevent delete of audit trail"
    ON public.attendance_records_history
    FOR DELETE
    TO public
    USING (false);

-- PART 4: PROTECTION TRIGGERS
-- ===========================

CREATE OR REPLACE FUNCTION public.prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TIDAK BISA MENGHAPIS AUDIT TRAIL. Data audit adalah IMMUTABLE untuk keamanan dan compliance.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_audit_delete
    ON public.employee_monthly_activities_audit;

CREATE TRIGGER trigger_prevent_audit_delete
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

DROP TRIGGER IF EXISTS trigger_prevent_attendance_modification
    ON public.attendance_records_history;

CREATE TRIGGER trigger_prevent_attendance_modification
    BEFORE UPDATE OR DELETE ON public.attendance_records_history
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_attendance_history_modification();

-- SUCCESS MESSAGE
SELECT '🎉 AUDIT TRAIL SYSTEM SUCCESSFULLY INSTALLED!' as status,
       'employee_monthly_activities_audit' as table_1,
       'attendance_records_history' as table_2,
       'attendance_records_audit' as table_3;
