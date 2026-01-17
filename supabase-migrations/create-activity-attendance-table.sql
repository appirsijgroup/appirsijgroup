-- =====================================================
-- CREATE activity_attendance TABLE
-- Purpose: Track attendance for activities table
-- =====================================================

-- Drop table if exists (for recreation)
DROP TABLE IF EXISTS public.activity_attendance CASCADE;

-- Create activity_attendance table
CREATE TABLE public.activity_attendance (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relasi ke activities
    activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,

    -- Employee yang presensi
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Data Presensi
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
    reason TEXT, -- Alasan tidak hadir (jika ada)
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Waktu submit presensi

    -- Late entry (untuk tracking jika presensi telat)
    is_late_entry BOOLEAN DEFAULT false,

    -- Metadata
    notes TEXT, -- Catatan tambahan

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique: Satu employee hanya bisa presensi sekali per activity
    UNIQUE(activity_id, employee_id)
);

-- Indexes
CREATE INDEX idx_activity_attendance_activity ON public.activity_attendance(activity_id);
CREATE INDEX idx_activity_attendance_employee ON public.activity_attendance(employee_id);
CREATE INDEX idx_activity_attendance_status ON public.activity_attendance(status);
CREATE INDEX idx_activity_attendance_submitted ON public.activity_attendance(submitted_at DESC);

-- Trigger untuk auto-update updated_at
CREATE TRIGGER set_updated_at_activity_attendance
    BEFORE UPDATE ON public.activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa lihat presensi sendiri
CREATE POLICY "Users can view own activity attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (employee_id = auth.uid());

-- Policy: User bisa insert presensi sendiri
CREATE POLICY "Users can insert own activity attendance"
    ON public.activity_attendance
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- Policy: User bisa update presensi sendiri
CREATE POLICY "Users can update own activity attendance"
    ON public.activity_attendance
    FOR UPDATE
    USING (employee_id = auth.uid());

-- Policy: Admin bisa lihat semua presensi
CREATE POLICY "Admins can view all activity attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()
            AND role IN ('super-admin', 'admin')
        )
    );

-- Policy: Admin bisa update semua presensi
CREATE POLICY "Admins can update all activity attendance"
    ON public.activity_attendance
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()
            AND role IN ('super-admin', 'admin')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.activity_attendance IS 'Tabel presensi untuk scheduled activities dari tabel activities';
COMMENT ON COLUMN public.activity_attendance.activity_id IS 'ID activity dari tabel activities';
COMMENT ON COLUMN public.activity_attendance.employee_id IS 'ID employee yang melakukan presensi';
COMMENT ON COLUMN public.activity_attendance.status IS 'Status presensi: hadir, tidak-hadir, izin, sakit';
COMMENT ON COLUMN public.activity_attendance.is_late_entry IS 'Flag jika presensi dilakukan terlambat';

-- =====================================================
-- VERIFY
-- =====================================================

SELECT
    'activity_attendance' as table_name,
    '✅ Table created successfully' as status;
