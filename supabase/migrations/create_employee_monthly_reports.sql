-- ============================================
-- TABLE: employee_monthly_reports
-- Purpose: Menyimpan Laporan Manual bulanan (counter-based activities)
-- Terpisah dari employee_monthly_activities yang untuk daily checklist
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_monthly_reports (
    employee_id TEXT NOT NULL,

    -- Data laporan bulanan (JSONB)
    -- Format: {
    --   "2026-01": {
    --     "infaq": { "count": 2, "completedAt": "2026-01-15T10:00:00Z" },
    --     "jujur": { "count": 5, "completedAt": "2026-01-20T14:30:00Z" },
    --     "tanggung_jawab": { "count": 1, "completedAt": "2026-01-10T09:00:00Z" }
    --   },
    --   "2026-02": { ... }
    -- }
    reports JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Primary Key
    PRIMARY KEY (employee_id),

    -- Foreign Key
    CONSTRAINT employee_monthly_reports_employee_id_fkey FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

-- Index untuk updated_at (sorting)
CREATE INDEX IF NOT EXISTS idx_employee_monthly_reports_updated_at
ON public.employee_monthly_reports(updated_at DESC);

-- Index untuk JSONB queries (optional, untuk query cepat)
CREATE INDEX IF NOT EXISTS idx_employee_monthly_reports_reports_gin
ON public.employee_monthly_reports USING GIN (reports);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.employee_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Employee bisa lihat monthly reports sendiri
CREATE POLICY "Allow employees to view own monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (employee_id = auth.uid()::text);

-- Policy: Employee bisa update monthly reports sendiri
CREATE POLICY "Allow employees to update own monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (employee_id = auth.uid()::text);

-- Policy: Employee bisa insert monthly reports sendiri
CREATE POLICY "Allow employees to insert own monthly reports"
ON public.employee_monthly_reports
FOR INSERT
TO public
WITH CHECK (employee_id = auth.uid()::text);

-- Policy: Admin bisa lihat semua monthly reports
CREATE POLICY "Allow admins to view all monthly reports"
ON public.employee_monthly_reports
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_reports.employee_id
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- Policy: Admin bisa update semua monthly reports
CREATE POLICY "Allow admins to update all monthly reports"
ON public.employee_monthly_reports
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_monthly_reports.employee_id
        AND employees.role IN ('admin', 'super-admin')
    )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_employee_monthly_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_monthly_reports_updated_at
    BEFORE UPDATE ON public.employee_monthly_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_employee_monthly_reports_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.employee_monthly_reports IS 'Menyimpan Laporan Manual bulanan karyawan (aktivitas dengan counter, bukan daily checklist)';
COMMENT ON COLUMN public.employee_monthly_reports.reports IS 'JSON object dengan key format YYYY-MM berisi counter untuk setiap aktivitas manual';

-- ============================================
-- VERIFICATION
-- ============================================

-- Cek apakah tabel berhasil dibuat
SELECT
    'employee_monthly_reports' as table_name,
    COUNT(*) as row_count
FROM public.employee_monthly_reports;
