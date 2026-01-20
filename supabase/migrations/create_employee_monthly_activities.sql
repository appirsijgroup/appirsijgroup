-- ============================================
-- TABLE: employee_monthly_activities
-- Purpose: Menyimpan aktivitas bulanan karyawan untuk Lembar Mutaba'ah
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_monthly_activities (
    employee_id TEXT PRIMARY KEY,

    -- Data aktivitas bulanan (JSONB)
    -- Format: {
    --   "2025-01": {
    --     "kajianSelasa": 2,
    --     "pengajianPersyarikatan": 1,
    --     "kegiatanTerjadwal": 3,
    --     "sholatJumat": 4,
    --     "doaPagi": 10,
    --     "doaSore": 8
    --   },
    --   "2025-02": { ... }
    -- }
    activities JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT employee_monthly_activities_employee_id_fkey FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

-- Index untuk updated_at (sorting)
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_updated_at
ON public.employee_monthly_activities(updated_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.employee_monthly_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Employee bisa lihat monthly activities sendiri
CREATE POLICY "Allow employees to view own monthly activities"
ON public.employee_monthly_activities
FOR SELECT
TO public
USING (employee_id = auth.uid()::text);

-- Policy: Employee bisa update monthly activities sendiri
CREATE POLICY "Allow employees to update own monthly activities"
ON public.employee_monthly_activities
FOR UPDATE
TO public
USING (employee_id = auth.uid()::text);

-- Policy: Employee bisa insert monthly activities sendiri
CREATE POLICY "Allow employees to insert own monthly activities"
ON public.employee_monthly_activities
FOR INSERT
TO public
WITH CHECK (employee_id = auth.uid()::text);

-- Policy: Admin bisa lihat semua monthly activities
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

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_employee_monthly_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_monthly_activities_updated_at
    BEFORE UPDATE ON public.employee_monthly_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_employee_monthly_activities_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.employee_monthly_activities IS 'Menyimpan aktivitas bulanan karyawan untuk Lembar Mutaba\'ah';
COMMENT ON COLUMN public.employee_monthly_activities.activities IS 'JSON object dengan key format YYYY-MM berisi counter aktivitas';
