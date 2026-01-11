-- ============================================
-- APPI System - Missing Tables Migration
-- Created: 2025-01-08
-- Description: Add missing tables for attendance, bookmarks, and submissions
-- ============================================

-- 1. BOOKMARKS TABLE
-- Untuk menyimpan bookmark ayat Al-Qur'an
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    surah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    ayah_number INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_surah_ayah ON bookmarks(surah_number, ayah_number);

-- Enable Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own bookmarks
CREATE POLICY "Users can view own bookmarks"
    ON bookmarks FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own bookmarks"
    ON bookmarks FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own bookmarks"
    ON bookmarks FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own bookmarks"
    ON bookmarks FOR DELETE
    USING (auth.uid()::text = user_id::text);


-- 2. QURAN_READING_SUBMISSIONS TABLE
-- Untuk menyimpan tracking bacaan Al-Qur'an
CREATE TABLE IF NOT EXISTS quran_reading_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    surah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    start_ayah INTEGER NOT NULL,
    end_ayah INTEGER NOT NULL,
    submission_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quran_submissions_user_date ON quran_reading_submissions(user_id, submission_date);

-- Enable Row Level Security
ALTER TABLE quran_reading_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own Quran submissions"
    ON quran_reading_submissions FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own Quran submissions"
    ON quran_reading_submissions FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own Quran submissions"
    ON quran_reading_submissions FOR DELETE
    USING (auth.uid()::text = user_id::text);


-- 3. ACTIVITY_ATTENDANCE TABLE
-- Untuk menyimpan presensi kegiatan
CREATE TABLE IF NOT EXISTS activity_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL, -- Can be regular activity ID or team session ID
    activity_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak_hadir')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_attendance_user ON activity_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_activity ON activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_date ON activity_attendance(submission_date);

-- Enable Row Level Security
ALTER TABLE activity_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own attendance"
    ON activity_attendance FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own attendance"
    ON activity_attendance FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own attendance"
    ON activity_attendance FOR UPDATE
    USING (auth.uid()::text = user_id::text);


-- 4. WEEKLY_REPORT_SUBMISSIONS TABLE
-- Untuk menyimpan laporan mingguan Mutaba'ah
CREATE TABLE IF NOT EXISTS weekly_report_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- Format: YYYY-MM
    week_index INTEGER NOT NULL CHECK (week_index >= 1 AND week_index <= 4),
    report_data JSONB NOT NULL, -- Flexible field for report content
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_unique
    ON weekly_report_submissions(user_id, month_key, week_index);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_report_user ON weekly_report_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_month ON weekly_report_submissions(month_key);

-- Enable Row Level Security
ALTER TABLE weekly_report_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own weekly reports"
    ON weekly_report_submissions FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own weekly reports"
    ON weekly_report_submissions FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own weekly reports"
    ON weekly_report_submissions FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own weekly reports"
    ON weekly_report_submissions FOR DELETE
    USING (auth.uid()::text = user_id::text);


-- 5. TEAM_ATTENDANCE_SESSIONS TABLE
-- Untuk menyimpan sesi presensi tim
CREATE TABLE IF NOT EXISTS team_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- Nama kegiatan
    date TEXT NOT NULL, -- Format: YYYY-MM-DD
    start_time TEXT NOT NULL, -- Format: HH:MM
    end_time TEXT NOT NULL, -- Format: HH:MM
    audience_type TEXT NOT NULL CHECK (audience_type IN ('public', 'manual', 'rules')),
    manual_participant_ids UUID[] DEFAULT '{}',
    audience_rules JSONB DEFAULT '{}',
    attendance_mode TEXT NOT NULL CHECK (attendance_mode IN ('self', 'leader')) DEFAULT 'self',
    zoom_url TEXT,
    youtube_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_sessions_creator ON team_attendance_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_team_sessions_date ON team_attendance_sessions(date);

-- Enable Row Level Security
ALTER TABLE team_attendance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view team sessions"
    ON team_attendance_sessions FOR SELECT
    USING (true); -- Public read for now, adjust as needed

CREATE POLICY "Users can create team sessions"
    ON team_attendance_sessions FOR INSERT
    WITH CHECK (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can update own sessions"
    ON team_attendance_sessions FOR UPDATE
    USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can delete own sessions"
    ON team_attendance_sessions FOR DELETE
    USING (auth.uid()::text = creator_id::text);


-- ============================================
-- UPDATED_AT TRIGGER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables that need updated_at
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON weekly_report_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_sessions_updated_at BEFORE UPDATE ON team_attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  1. bookmarks';
    RAISE NOTICE '  2. quran_reading_submissions';
    RAISE NOTICE '  3. activity_attendance';
    RAISE NOTICE '  4. weekly_report_submissions';
    RAISE NOTICE '  5. team_attendance_sessions';
    RAISE NOTICE '===========================================';
END $$;
