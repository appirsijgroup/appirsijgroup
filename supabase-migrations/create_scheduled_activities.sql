-- =====================================================
-- TABLE: scheduled_activities
-- Purpose: Menampung semua kegiatan terjadwal (Kajian, Pengajian, dll)
-- Integration: Digunakan di Lembar Mutaba'ah dan Kinerja
-- =====================================================

-- Drop table jika ada (untuk development)
DROP TABLE IF EXISTS public.scheduled_activities CASCADE;

-- Create tabel scheduled_activities
CREATE TABLE public.scheduled_activities (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informasi Dasar Kegiatan
    name VARCHAR(255) NOT NULL, -- Nama kegiatan (misal: "Kajian Rutin Selasa")
    description TEXT, -- Deskripsi lengkap
    activity_type VARCHAR(50) NOT NULL, -- Jenis kegiatan: 'kajian', 'pengajian', 'pelatihan', 'rapat', dll
    category VARCHAR(50), -- Kategori: 'rutin', 'khusus', 'urgent'

    -- Waktu Pelaksanaan
    activity_date DATE NOT NULL, -- Tanggal kegiatan
    start_time TIME NOT NULL, -- Jam mulai (misal: '10:00:00')
    end_time TIME NOT NULL, -- Jam selesai (misal: '11:30:00')

    -- Lokasi
    location VARCHAR(255), -- Nama lokasi (misal: "Ruang Meeting Lt. 2")
    location_type VARCHAR(50), -- Tipe: 'offline', 'online', 'hybrid'

    -- Audience Targeting (SANGAT KOMPLEKS!)
    audience_type VARCHAR(20) NOT NULL DEFAULT 'public',
        -- 'public': Semua employee bisa lihat & ikut
        -- 'manual': Hanya employee yang dipilih secara manual
        -- 'rules': Hanya employee yang match dengan kriteria/rules

    -- Untuk audience_type = 'manual'
    manual_participant_ids UUID[] DEFAULT '{}', -- Array of employee IDs yang dipilih manual

    -- Untuk audience_type = 'rules' (VERY COMPLEX!)
    audience_rules JSONB DEFAULT '{}',
        -- Structure:
        -- {
        --   "hospitalIds": ["uuid1", "uuid2"],     -- Hanya employee di rumah sakit ini
        --   "units": ["Keperawatan", "Farmasi"],   -- Hanya unit ini
        --   "bagians": ["Rawat Inap", "IGD"],      -- Hanya bagian ini
        --   "professionCategories": ["Medis", ...], -- Hanya kategori profesi ini
        --   "professions": ["Perawat", "Dokter", ...], -- Hanya profesi ini
        --   "genders": ["L", "P"],                  -- Hanya gender ini
        --   "roles": ["user", "admin", ...],        -- Hanya role ini
        --   "minLevel": 1,                           -- Minimal level/jenjang
        --   "customField": { ... }                   -- Custom filter lainnya
        -- }

    -- Mode Presensi
    attendance_mode VARCHAR(20) NOT NULL DEFAULT 'self',
        -- 'self': Employee presensi sendiri
        -- 'leader': Atasan/leader yang presensikan anggota
        -- 'hybrid': Bisa presensi sendiri atau oleh leader

    -- Link Online (jika ada)
    zoom_url TEXT, -- Link Zoom meeting
    youtube_url TEXT, -- Link YouTube live/stream
    gmeet_url TEXT, -- Link Google Meet
    other_url TEXT, -- Link lain (custom)

    -- Status Kegiatan
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        -- 'scheduled': Terjadwal
        -- 'ongoing': Sedang berlangsung (auto-update)
        -- 'completed': Selesai
        -- 'postponed': Ditunda
        -- 'cancelled': Dibatalkan

    -- Creator/Owner (siapa yang buat kegiatan)
    created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,

    -- Metadata
    notes TEXT, -- Catatan tambahan
    attachment_url TEXT, -- Link ke file/bahan materi (PDF, PPT, dll)
    max_participants INTEGER, -- Batas max peserta (jika ada)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_end_time_after_start CHECK (end_time > start_time),
    CONSTRAINT check_valid_audience_type CHECK (audience_type IN ('public', 'manual', 'rules')),
    CONSTRAINT check_valid_attendance_mode CHECK (attendance_mode IN ('self', 'leader', 'hybrid')),
    CONSTRAINT check_valid_status CHECK (status IN ('scheduled', 'ongoing', 'completed', 'postponed', 'cancelled')),
    CONSTRAINT check_valid_activity_type CHECK (activity_type IN ('kajian', 'pengajian', 'pelatihan', 'rapat', 'arisan', 'olahraga', 'lainnya'))
);

-- Indexes untuk performa query
CREATE INDEX idx_scheduled_activities_date ON public.scheduled_activities(activity_date DESC);
CREATE INDEX idx_scheduled_activities_type ON public.scheduled_activities(activity_type);
CREATE INDEX idx_scheduled_activities_status ON public.scheduled_activities(status);
CREATE INDEX idx_scheduled_activities_audience ON public.scheduled_activities(audience_type);
CREATE INDEX idx_scheduled_activities_created_by ON public.scheduled_activities(created_by);

-- Trigger untuk auto-update updated_at
CREATE TRIGGER set_updated_at_scheduled_activities
    BEFORE UPDATE ON public.scheduled_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- TABLE: scheduled_activity_attendance
-- Purpose: Menampung data presensi untuk setiap scheduled activity
-- =====================================================

DROP TABLE IF EXISTS public.scheduled_activity_attendance CASCADE;

CREATE TABLE public.scheduled_activity_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relasi ke scheduled_activities
    activity_id UUID NOT NULL REFERENCES public.scheduled_activities(id) ON DELETE CASCADE,

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

-- Indexes
CREATE INDEX idx_attendance_activity ON public.scheduled_activity_attendance(activity_id);
CREATE INDEX idx_attendance_employee ON public.scheduled_activity_attendance(employee_id);
CREATE INDEX idx_attendance_status ON public.scheduled_activity_attendance(status);
CREATE INDEX idx_attendance_date ON public.scheduled_activity_attendance(submitted_at DESC);

-- Trigger untuk auto-update updated_at
CREATE TRIGGER set_updated_at_scheduled_activity_attendance
    BEFORE UPDATE ON public.scheduled_activity_attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- COMMENTS untuk dokumentasi
-- =====================================================

COMMENT ON TABLE public.scheduled_activities IS 'Tabel untuk menampung semua kegiatan terjadwal yang kompleks dengan audience targeting';
COMMENT ON TABLE public.scheduled_activity_attendance IS 'Tabel presensi untuk scheduled activities';

COMMENT ON COLUMN public.scheduled_activities.audience_type IS 'Type audience: public (semua), manual (pilih manual), rules (berdasarkan kriteria)';
COMMENT ON COLUMN public.scheduled_activities.audience_rules IS 'Rules untuk filtering audience dalam format JSONB';
COMMENT ON COLUMN public.scheduled_activities.manual_participant_ids IS 'Array employee ID untuk audience_type manual';
COMMENT ON COLUMN public.scheduled_activities.attendance_mode IS 'Mode presensi: self (sendiri), leader (oleh atasan), hybrid (campur)';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_activity_attendance ENABLE ROW LEVEL SECURITY;

-- Policy untuk scheduled_activities
-- 1. Semua user bisa lihat scheduled activities (sesuai audience)
CREATE POLICY "Public can view scheduled activities"
    ON public.scheduled_activities
    FOR SELECT
    USING (true);

-- 2. Hanya creator dan admin yang bisa edit
CREATE POLICY "Creators and admins can update scheduled activities"
    ON public.scheduled_activities
    FOR UPDATE
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role IN ('super-admin', 'admin'))
    );

-- 3. Hanya admin dan creator yang bisa delete
CREATE POLICY "Creators and admins can delete scheduled activities"
    ON public.scheduled_activities
    FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role IN ('super-admin', 'admin'))
    );

-- 4. Admin dan creator bisa insert
CREATE POLICY "Authenticated can insert scheduled activities"
    ON public.scheduled_activities
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy untuk scheduled_activity_attendance
-- 1. User bisa lihat presensi sendiri
CREATE POLICY "Users can view own attendance"
    ON public.scheduled_activity_attendance
    FOR SELECT
    USING (employee_id = auth.uid());

-- 2. User bisa insert presensi sendiri
CREATE POLICY "Users can insert own attendance"
    ON public.scheduled_activity_attendance
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- 3. User bisa update presensi sendiri
CREATE POLICY "Users can update own attendance"
    ON public.scheduled_activity_attendance
    FOR UPDATE
    USING (employee_id = auth.uid());

-- 4. Admin bisa lihat semua presensi
CREATE POLICY "Admins can view all attendance"
    ON public.scheduled_activity_attendance
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees WHERE id = auth.uid() AND role IN ('super-admin', 'admin'))
    );

-- =====================================================
-- SAMPLE DATA (Data Contoh untuk Testing)
-- =====================================================

-- Insert contoh kegiatan Kajian Rutin Selasa
INSERT INTO public.scheduled_activities (
    name,
    description,
    activity_type,
    category,
    activity_date,
    start_time,
    end_time,
    location,
    location_type,
    audience_type,
    audience_rules,
    attendance_mode,
    status,
    created_by
) VALUES (
    'Kajian Rutin Selasa',
    'Kajian rutin mingguan yang membahas tafsir Al-Quran dan hadis.',
    'kajian',
    'rutin',
    CURRENT_DATE + INTERVAL '1 day', -- Besok
    '10:00:00',
    '11:30:00',
    'Masjid Utama RS',
    'offline',
    'rules',
    '{
        "hospitalIds": [],
        "units": [],
        "bagians": [],
        "professionCategories": [],
        "professions": [],
        "genders": [],
        "roles": []
    }'::jsonb, -- Public (rules kosong = semua)
    'self',
    'scheduled',
    (SELECT id FROM public.employees WHERE role = 'admin' LIMIT 1)
);

-- Insert contoh kegiatan Pengajian Persyarikatan
INSERT INTO public.scheduled_activities (
    name,
    description,
    activity_type,
    category,
    activity_date,
    start_time,
    end_time,
    location,
    location_type,
    audience_type,
    manual_participant_ids,
    attendance_mode,
    zoom_url,
    status,
    created_by
) VALUES (
    'Pengajian Persyarikatan',
    'Pengajian rutin untuk persyarikatan setiap shift pagi.',
    'pengajian',
    'rutin',
    CURRENT_DATE,
    '07:00:00',
    '07:30:00',
    'Ruang Ibadah Lt. 1',
    'offline',
    'manual',
    ARRAY[]::UUID[], -- Akan diisi manual dengan employee ID tertentu
    'self',
    NULL,
    'scheduled',
    (SELECT id FROM public.employees WHERE role = 'admin' LIMIT 1)
);

-- =====================================================
-- VIEWS untuk kemudahan query
-- =====================================================

-- View: Scheduled activities dengan creator info
CREATE OR REPLACE VIEW public.v_scheduled_activities_with_creator AS
SELECT
    sa.*,
    e.name AS creator_name,
    e.email AS creator_email,
    e.role AS creator_role
FROM public.scheduled_activities sa
LEFT JOIN public.employees e ON sa.created_by = e.id;

COMMENT ON VIEW public.v_scheduled_activities_with_creator IS 'View scheduled activities dengan informasi creator';

-- View: Attendance dengan employee dan activity info
CREATE OR REPLACE VIEW public.v_scheduled_activity_attendance_full AS
SELECT
    saa.*,
    sa.name AS activity_name,
    sa.activity_date,
    sa.start_time,
    sa.end_time,
    sa.activity_type,
    e.name AS employee_name,
    e.email AS employee_email,
    e.unit AS employee_unit,
    e.hospital_id AS employee_hospital_id
FROM public.scheduled_activity_attendance saa
JOIN public.scheduled_activities sa ON saa.activity_id = sa.id
JOIN public.employees e ON saa.employee_id = e.id;

COMMENT ON VIEW public.v_scheduled_activity_attendance_full IS 'View lengkap attendance dengan info activity dan employee';
