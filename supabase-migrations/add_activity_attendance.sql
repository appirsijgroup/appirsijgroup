-- =====================================================
-- TABLE: activity_attendance
-- Purpose: Menampung data presensi untuk setiap activity
-- Integration: Terhubung dengan tabel activities yang sudah ada
-- =====================================================

-- Drop table jika ada (untuk development)
DROP TABLE IF EXISTS public.activity_attendance CASCADE;

-- Create tabel activity_attendance
CREATE TABLE public.activity_attendance (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relasi ke activities (TABEL YANG SUDAH ADA)
    activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,

    -- Employee yang presensi
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Data Presensi
    status VARCHAR(20) NOT NULL, -- 'hadir', 'tidak-hadir', 'izin', 'sakit'
    reason TEXT, -- Alasan tidak hadir (jika ada)
    submitted_at TIMESTAMPTZ DEFAULT NOW(), -- Waktu submit presensi

    -- Late entry (untuk tracking jika presensi telat)
    is_late_entry BOOLEAN DEFAULT false,

    -- Metadata
    notes TEXT, -- Catatan tambahan
    ip_address VARCHAR(45), -- IP address saat submit (untuk audit)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_attendance_status CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),

    -- Unique: Satu employee hanya bisa presensi sekali per activity
    UNIQUE(activity_id, employee_id)
);

-- Indexes untuk performa query
CREATE INDEX idx_activity_attendance_activity ON public.activity_attendance(activity_id);
CREATE INDEX idx_activity_attendance_employee ON public.activity_attendance(employee_id);
CREATE INDEX idx_activity_attendance_status ON public.activity_attendance(status);
CREATE INDEX idx_activity_attendance_date ON public.activity_attendance(submitted_at DESC);

-- Trigger untuk auto-update updated_at
CREATE TRIGGER set_updated_at_activity_attendance
    BEFORE UPDATE ON public.activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- COMMENTS untuk dokumentasi
-- =====================================================

COMMENT ON TABLE public.activity_attendance IS 'Tabel presensi untuk activities (Kegiatan Terjadwal)';
COMMENT ON COLUMN public.activity_attendance.activity_id IS 'ID activity dari tabel activities (TEXT, bukan UUID)';
COMMENT ON COLUMN public.activity_attendance.employee_id IS 'ID employee yang melakukan presensi';
COMMENT ON COLUMN public.activity_attendance.status IS 'Status presensi: hadir, tidak-hadir, izin, sakit';
COMMENT ON COLUMN public.activity_attendance.is_late_entry IS 'Flag jika presensi dilakukan setelah waktu selesai';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

-- Policy untuk activity_attendance
-- 1. User bisa lihat presensi sendiri
CREATE POLICY "Users can view own attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (employee_id = auth.uid());

-- 2. User bisa insert presensi sendiri
CREATE POLICY "Users can insert own attendance"
    ON public.activity_attendance
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- 3. User bisa update presensi sendiri
CREATE POLICY "Users can update own attendance"
    ON public.activity_attendance
    FOR UPDATE
    USING (employee_id = auth.uid());

-- 4. Admin bisa lihat semua presensi
CREATE POLICY "Admins can view all attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role IN ('super-admin', 'admin'))
    );

-- 5. Admin bisa update semua presensi
CREATE POLICY "Admins can update all attendance"
    ON public.activity_attendance
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role IN ('super-admin', 'admin'))
    );

-- =====================================================
-- VIEW untuk kemudahan query
-- =====================================================

-- View: Attendance dengan activity dan employee info
CREATE OR REPLACE VIEW public.v_activity_attendance_full AS
SELECT
    aa.*,
    a.name AS activity_name,
    a.date AS activity_date,
    a.start_time AS activity_start_time,
    a.end_time AS activity_end_time,
    a.activity_type,
    a.status AS activity_status,
    e.name AS employee_name,
    e.email AS employee_email,
    e.unit AS employee_unit,
    e.hospital_id AS employee_hospital_id
FROM public.activity_attendance aa
JOIN public.activities a ON aa.activity_id = a.id
JOIN public.employees e ON aa.employee_id = e.id;

COMMENT ON VIEW public.v_activity_attendance_full IS 'View lengkap attendance dengan info activity dan employee';
