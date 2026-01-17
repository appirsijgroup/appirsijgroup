-- =====================================================
-- CREATE activity_attendance TABLE (COMPLETE VERSION)
-- Purpose: Track attendance untuk scheduled activities
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. BUAT FUNGSI set_updated_at() JIKA BELUM ADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE activity_attendance TABLE
-- =====================================================

-- Drop table if exists (HATI-HATI: akan menghapus data yang ada!)
DROP TABLE IF EXISTS public.activity_attendance CASCADE;

-- Create activity_attendance table
CREATE TABLE public.activity_attendance (
    -- Primary Key
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relasi ke activities
    activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,

    -- Employee yang presensi (TEXT untuk match dengan employees.id)
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Data Presensi
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
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

    -- Unique: Satu employee hanya bisa presensi sekali per activity
    UNIQUE(activity_id, employee_id)
);

-- =====================================================
-- 3. INDEXES untuk performa query
-- =====================================================

CREATE INDEX idx_activity_attendance_activity ON public.activity_attendance(activity_id);
CREATE INDEX idx_activity_attendance_employee ON public.activity_attendance(employee_id);
CREATE INDEX idx_activity_attendance_status ON public.activity_attendance(status);
CREATE INDEX idx_activity_attendance_submitted ON public.activity_attendance(submitted_at DESC);

-- =====================================================
-- 4. TRIGGER untuk auto-update updated_at
-- =====================================================

CREATE TRIGGER set_updated_at_activity_attendance
    BEFORE UPDATE ON public.activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa lihat presensi sendiri
CREATE POLICY "Users can view own activity attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (employee_id = auth.uid()::text);

-- Policy: User bisa insert presensi sendiri
CREATE POLICY "Users can insert own activity attendance"
    ON public.activity_attendance
    FOR INSERT
    WITH CHECK (employee_id = auth.uid()::text);

-- Policy: User bisa update presensi sendiri
CREATE POLICY "Users can update own activity attendance"
    ON public.activity_attendance
    FOR UPDATE
    USING (employee_id = auth.uid()::text);

-- Policy: Admin bisa lihat semua presensi
CREATE POLICY "Admins can view all activity attendance"
    ON public.activity_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::text
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
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'admin')
        )
    );

-- =====================================================
-- 6. COMMENTS untuk dokumentasi
-- =====================================================

COMMENT ON TABLE public.activity_attendance IS 'Tabel presensi untuk scheduled activities dari tabel activities';
COMMENT ON COLUMN public.activity_attendance.activity_id IS 'ID activity dari tabel activities';
COMMENT ON COLUMN public.activity_attendance.employee_id IS 'ID employee yang melakukan presensi (TEXT type)';
COMMENT ON COLUMN public.activity_attendance.status IS 'Status presensi: hadir, tidak-hadir, izin, sakit';
COMMENT ON COLUMN public.activity_attendance.is_late_entry IS 'Flag jika presensi dilakukan terlambat';

-- =====================================================
-- 7. VERIFIKASI
-- =====================================================

SELECT
    '✅ activity_attendance table created successfully' as status;

-- Cek apakah table sudah dibuat dengan benar
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_attendance'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek apakah fungsi set_updated_at sudah dibuat
SELECT
    '✅ set_updated_at() function created' as status
WHERE EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_updated_at'
    AND pronamespace = 'public'::regnamespace
);
