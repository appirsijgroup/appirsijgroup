-- ============================================
-- COMPLETE FIX: Create all missing tables
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLE 1: activity_attendance
-- Purpose: Presensi untuk activities (Kajian, Pengajian, dll)
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
    reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late_entry BOOLEAN DEFAULT FALSE,
    notes TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT activity_attendance_unique UNIQUE (activity_id, employee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_attendance_activity_id ON public.activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_employee_id ON public.activity_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_submitted_at ON public.activity_attendance(submitted_at DESC);

-- RLS
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view activity attendance"
ON public.activity_attendance
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow users to insert own attendance"
ON public.activity_attendance
FOR INSERT
TO public
WITH CHECK (employee_id = auth.uid()::text);

CREATE POLICY "Allow users to update own attendance"
ON public.activity_attendance
FOR UPDATE
TO public
USING (employee_id = auth.uid()::text);

-- Trigger
CREATE OR REPLACE FUNCTION public.update_activity_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activity_attendance_updated_at ON public.activity_attendance;
CREATE TRIGGER activity_attendance_updated_at
    BEFORE UPDATE ON public.activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_activity_attendance_updated_at();

COMMENT ON TABLE public.activity_attendance IS 'Presensi untuk kegiatan terjadwal (Kajian Selasa, Pengajian Persyarikatan, dll)';

-- ============================================
-- TABLE 2: employee_monthly_activities
-- Purpose: Aktivitas bulanan untuk Lembar Mutaba'ah
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,
    activities JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT employee_monthly_activities_employee_id_fkey FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_updated_at
ON public.employee_monthly_activities(updated_at DESC);

ALTER TABLE public.employee_monthly_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow employees to view own monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO public
USING (employee_id = auth.uid()::text);

CREATE POLICY "Allow employees to update own monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO public
USING (employee_id = auth.uid()::text);

CREATE POLICY "Allow employees to insert own monthly activities"
ON public.employee_monthly_activities
FOR INSERT
TO public
WITH CHECK (employee_id = auth.uid()::text);

CREATE POLICY "Allow admins to view all monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_activities.employee_id
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- Trigger
CREATE OR REPLACE FUNCTION public.update_employee_monthly_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_monthly_activities_updated_at ON public.employee_monthly_activities;
CREATE TRIGGER employee_monthly_activities_updated_at
    BEFORE UPDATE ON public.employee_monthly_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_employee_monthly_activities_updated_at();

COMMENT ON TABLE public.employee_monthly_activities IS 'Menyimpan aktivitas bulanan karyawan untuk Lembar Mutabaah';

-- ============================================
-- TABLE 3: Fix updated_at di activities
-- Purpose: Add missing updated_at column
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.activities
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'updated_at column added to activities table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in activities table';
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;
CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_activities_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
    'activity_attendance' as table_name,
    COUNT(*) as row_count
FROM public.activity_attendance
UNION ALL
SELECT
    'employee_monthly_activities' as table_name,
    COUNT(*) as row_count
FROM public.employee_monthly_activities
UNION ALL
SELECT
    'activities' as table_name,
    COUNT(*) as row_count
FROM public.activities;
