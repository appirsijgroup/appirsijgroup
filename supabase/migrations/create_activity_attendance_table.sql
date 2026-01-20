-- ============================================
-- TABLE: activity_attendance
-- Purpose: Menyimpan presensi untuk setiap activity
--          Terpisah dari attendance_records (sholat) dan
--          team_attendance_records (KIE/Doa Bersama)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference ke activity
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

    -- Employee
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Attendance data
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
    reason TEXT,

    -- Timestamps
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late_entry BOOLEAN DEFAULT FALSE,

    -- Optional fields
    notes TEXT,
    ip_address TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: satu employee hanya bisa submit sekali per activity
    CONSTRAINT activity_attendance_unique UNIQUE (activity_id, employee_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Index untuk activity_id (get semua attendance suatu activity)
CREATE INDEX IF NOT EXISTS idx_activity_attendance_activity_id ON activity_attendance(activity_id);

-- Index untuk employee_id (get riwayat attendance seorang employee)
CREATE INDEX IF NOT EXISTS idx_activity_attendance_employee_id ON activity_attendance(employee_id);

-- Index untuk submitted_at (sorting)
CREATE INDEX IF NOT EXISTS idx_activity_attendance_submitted_at ON activity_attendance(submitted_at DESC);

-- Composite index untuk employee + date (perlu join dengan activities)
CREATE INDEX IF NOT EXISTS idx_activity_attendance_employee_date ON activity_attendance(employee_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE activity_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Semua authenticated users bisa view attendance
CREATE POLICY "Allow authenticated users to view activity attendance"
ON activity_attendance
FOR SELECT
TO public
USING (true);

-- Policy: Users bisa insert attendance untuk dirinya sendiri
CREATE POLICY "Allow users to insert own attendance"
ON activity_attendance
FOR INSERT
TO public
WITH CHECK (
    employee_id = auth.uid()::text
);

-- Policy: Users bisa update attendance dirinya sendiri
CREATE POLICY "Allow users to update own attendance"
ON activity_attendance
FOR UPDATE
TO public
USING (
    employee_id = auth.uid()::text
);

-- Policy: Creators activity bisa view/edit attendance untuk activity mereka
CREATE POLICY "Allow activity creators to manage attendance"
ON activity_attendance
FOR ALL
TO public
USING (
    EXISTS (
        SELECT 1 FROM activities
        WHERE activities.id = activity_id
        AND activities.created_by = auth.uid()::text
    )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_attendance_updated_at
    BEFORE UPDATE ON activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_attendance_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE activity_attendance IS 'Presensi untuk kegiatan terjadwal (Kajian Selasa, Pengajian Persyarikatan, dll)';
COMMENT ON COLUMN activity_attendance.activity_id IS 'Reference ke activities table';
COMMENT ON COLUMN activity_attendance.employee_id IS 'ID employee yang melakukan presensi';
COMMENT ON COLUMN activity_attendance.status IS 'Status kehadiran: hadir, tidak-hadir, izin, atau sakit';
COMMENT ON COLUMN activity_attendance.submitted_at IS 'Waktu ketika presensi disubmit';
COMMENT ON COLUMN activity_attendance.is_late_entry IS 'Apakah submit dilakukan setelah activity selesai';
COMMENT ON COLUMN activity_attendance.notes IS 'Catatan tambahan (opsional)';
