-- ============================================
-- TABLE: activities (Kegiatan Terjadwal)
-- Purpose: Menyimpan kegiatan terjadwal seperti Kajian Selasa,
--          Pengajian Persyarikatan, dan kegiatan umum lainnya
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Schedule
    date TEXT NOT NULL, -- YYYY-MM-DD format
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL, -- HH:MM format

    -- Creator info
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,

    -- Participants
    participant_ids TEXT[] DEFAULT '{}',

    -- Links
    zoom_url TEXT,
    youtube_url TEXT,

    -- Activity type
    activity_type TEXT CHECK (activity_type IN ('Umum', 'Kajian Selasa', 'Pengajian Persyarikatan')) DEFAULT 'Umum',

    -- Status
    status TEXT CHECK (status IN ('scheduled', 'postponed', 'cancelled')) DEFAULT 'scheduled',

    -- Audience settings
    audience_type TEXT NOT NULL CHECK (audience_type IN ('public', 'rules', 'manual')) DEFAULT 'public',
    audience_rules JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

-- Index untuk date filtering
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);

-- Index untuk creator
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

-- Index untuk status
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- Index untuk activity_type
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);

-- Composite index untuk date + status (umum dipakai bersamaan)
CREATE INDEX IF NOT EXISTS idx_activities_date_status ON activities(date, status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Semua authenticated users bisa view activities
CREATE POLICY "Allow authenticated users to view activities"
ON activities
FOR SELECT
TO public
USING (true);

-- Policy: Hanya creator yang bisa update activity
CREATE POLICY "Allow creators to update their activities"
ON activities
FOR UPDATE
TO public
USING (
    created_by = auth.uid()::text
);

-- Policy: Hanya creator yang bisa delete activity
CREATE POLICY "Allow creators to delete their activities"
ON activities
FOR DELETE
TO public
USING (
    created_by = auth.uid()::text
);

-- Policy: Semua authenticated users bisa insert activities
CREATE POLICY "Allow authenticated users to create activities"
ON activities
FOR INSERT
TO public
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE activities IS 'Kegiatan terjadwal seperti Kajian Selasa, Pengajian Persyarikatan, dll';
COMMENT ON COLUMN activities.date IS 'Tanggal kegiatan dalam format YYYY-MM-DD';
COMMENT ON COLUMN activities.start_time IS 'Waktu mulai dalam format HH:MM';
COMMENT ON COLUMN activities.end_time IS 'Waktu selesai dalam format HH:MM';
COMMENT ON COLUMN activities.activity_type IS 'Tipe kegiatan: Umum, Kajian Selasa, atau Pengajian Persyarikatan';
COMMENT ON COLUMN activities.status IS 'Status kegiatan: scheduled, postponed, atau cancelled';
COMMENT ON COLUMN activities.audience_type IS 'Tipe audience: public (semua), rules (berdasarkan aturan), atau manual (pilih peserta)';
COMMENT ON COLUMN activities.audience_rules IS 'Rules untuk audience_type=rules. Format JSONB dengan key: hospitalIds, units, bagians, professions, dll';
COMMENT ON COLUMN activities.participant_ids IS 'Array participant ID untuk audience_type=manual';
