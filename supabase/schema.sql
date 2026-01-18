-- ================================================
-- APPI RSI Group - Supabase Database Schema
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. EMPLOYEES TABLE
-- ================================================
CREATE TABLE employees (
    id TEXT PRIMARY KEY, -- NIP/NOPEG
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    hospital_id TEXT,
    unit TEXT NOT NULL,
    bagian TEXT NOT NULL,
    profession_category TEXT NOT NULL CHECK (profession_category IN ('MEDIS', 'NON MEDIS')),
    profession TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
    last_visit_date TEXT,
    role TEXT NOT NULL CHECK (role IN ('super-admin', 'admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    profile_picture TEXT,
    monthly_activities JSONB DEFAULT '{}',
    activated_months TEXT[] DEFAULT '{}',
    ka_unit_id TEXT,
    supervisor_id TEXT,
    mentor_id TEXT,
    dirut_id TEXT,
    can_be_mentor BOOLEAN DEFAULT false,
    can_be_supervisor BOOLEAN DEFAULT false,
    can_be_ka_unit BOOLEAN DEFAULT false,
    can_be_dirut BOOLEAN DEFAULT false,
    functional_roles TEXT[] DEFAULT '{}',
    manager_scope JSONB,
    location_id TEXT,
    location_name TEXT,
    reading_history JSONB DEFAULT '[]',
    quran_reading_history JSONB DEFAULT '[]',
    todo_list JSONB DEFAULT '[]',
    signature TEXT,
    last_announcement_read_timestamp BIGINT,
    managed_hospital_ids TEXT[] DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (ka_unit_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (dirut_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Indexes for employees
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_hospital ON employees(hospital_id);
CREATE INDEX idx_employees_unit ON employees(unit);
CREATE INDEX idx_emails ON employees(email);

-- ================================================
-- 2. ATTENDANCE & HISTORY TABLES
-- ================================================
CREATE TABLE attendances (
    employee_id TEXT PRIMARY KEY,
    attendance_data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE attendance_history (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    attendance_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_history_employee ON attendance_history(employee_id);
CREATE INDEX idx_attendance_history_date ON attendance_history(date);

-- ================================================
-- 3. ANNOUNCEMENTS TABLE
-- ================================================
CREATE TABLE announcements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'mentor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (author_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_announcements_timestamp ON announcements(timestamp DESC);
CREATE INDEX idx_announcements_scope ON announcements(scope);

-- ================================================
-- 4. ACTIVITIES TABLE
-- ================================================
CREATE TABLE activities (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    participant_ids TEXT[] DEFAULT '{}',
    zoom_url TEXT,
    youtube_url TEXT,
    activity_type TEXT CHECK (activity_type IN ('Umum', 'Kajian Selasa', 'Pengajian Persyarikatan')),
    status TEXT CHECK (status IN ('scheduled', 'postponed', 'cancelled')) DEFAULT 'scheduled',
    audience_type TEXT NOT NULL CHECK (audience_type IN ('public', 'rules', 'manual')),
    audience_rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_type ON activities(activity_type);

-- ================================================
-- 5. GUIDANCE & REPORTS TABLES
-- ================================================
CREATE TABLE weekly_report_submissions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentee_id TEXT NOT NULL,
    mentee_name TEXT NOT NULL,
    month_key TEXT NOT NULL, -- YYYY-MM
    week_index INTEGER NOT NULL,
    submitted_at BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'pending_mentor', 'pending_supervisor', 'pending_kaunit', 'approved',
        'rejected_mentor', 'rejected_supervisor', 'rejected_kaunit'
    )),
    mentor_id TEXT NOT NULL,
    supervisor_id TEXT,
    ka_unit_id TEXT,
    mentor_reviewed_at BIGINT,
    mentor_notes TEXT,
    supervisor_reviewed_at BIGINT,
    supervisor_notes TEXT,
    ka_unit_reviewed_at BIGINT,
    ka_unit_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (mentee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (ka_unit_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_mentee ON weekly_report_submissions(mentee_id);
CREATE INDEX idx_reports_status ON weekly_report_submissions(status);
CREATE INDEX idx_reports_month ON weekly_report_submissions(month_key);

CREATE TABLE document_submissions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentee_id TEXT NOT NULL,
    mentee_name TEXT NOT NULL,
    mentor_id TEXT NOT NULL,
    submitted_at BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    notes TEXT,
    mentor_notes TEXT,
    reviewed_at BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (mentee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ================================================
-- 6. TADARUS & PRAYER REQUESTS TABLES
-- ================================================
CREATE TABLE tadarus_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    category TEXT CHECK (category IN ('UMUM', 'BBQ')),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    mentor_id TEXT NOT NULL,
    participant_ids TEXT[] DEFAULT '{}',
    present_mentee_ids TEXT[] DEFAULT '{}',
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    mentor_present BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,

    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_tadarus_date ON tadarus_sessions(date);
CREATE INDEX idx_tadarus_mentor ON tadarus_sessions(mentor_id);

CREATE TABLE tadarus_requests (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentee_id TEXT NOT NULL,
    mentee_name TEXT NOT NULL,
    mentor_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    notes TEXT,
    requested_at BIGINT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_at BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (mentee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE missed_prayer_requests (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentee_id TEXT NOT NULL,
    mentee_name TEXT NOT NULL,
    mentor_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    prayer_id TEXT NOT NULL,
    prayer_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    requested_at BIGINT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_at BIGINT,
    mentor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (mentee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ================================================
-- 7. MENTEE TARGETS TABLE
-- ================================================
CREATE TABLE mentee_targets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id TEXT NOT NULL,
    mentee_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    month_key TEXT NOT NULL, -- YYYY-MM
    status TEXT CHECK (status IN ('in-progress', 'completed')) DEFAULT 'in-progress',
    created_at BIGINT NOT NULL,
    completed_at BIGINT,

    FOREIGN KEY (mentor_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (mentee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_targets_mentee ON mentee_targets(mentee_id);
CREATE INDEX idx_targets_month ON mentee_targets(month_key);

-- ================================================
-- 8. TEAM ATTENDANCE SESSIONS TABLE
-- ================================================
CREATE TABLE team_attendance_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('KIE', 'Doa Bersama')),
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    audience_type TEXT NOT NULL CHECK (audience_type IN ('rules', 'manual')),
    audience_rules JSONB,
    manual_participant_ids TEXT[] DEFAULT '{}',
    present_user_ids TEXT[] DEFAULT '{}',
    attendance_mode TEXT CHECK (attendance_mode IN ('leader', 'self')) DEFAULT 'self',
    zoom_url TEXT,
    youtube_url TEXT,
    created_at BIGINT NOT NULL,

    FOREIGN KEY (creator_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_attendance_date ON team_attendance_sessions(date);

-- ================================================
-- 9. NOTIFICATIONS TABLE
-- ================================================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_entity_id TEXT,
    link_to JSONB,
    expires_at BIGINT,
    dismiss_on_click BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);

-- ================================================
-- 10. AUDIT LOGS TABLE
-- ================================================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp BIGINT NOT NULL,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (admin_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ================================================
-- 11. CONFIGURATION TABLES
-- ================================================
CREATE TABLE hospitals (
    id TEXT PRIMARY KEY, -- Brand name like RSIJSP
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    address TEXT NOT NULL,
    logo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_activities (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN (
        'SIDIQ (Integritas)', 'TABLIGH (Teamwork)',
        'AMANAH (Disiplin)', 'FATONAH (Belajar)'
    )),
    title TEXT NOT NULL,
    monthly_target INTEGER NOT NULL,
    automation_trigger JSONB
);

CREATE TABLE sunnah_ibadah (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('sholat', 'puasa')),
    icon TEXT NOT NULL,
    schedule_type TEXT CHECK (schedule_type IN ('daily', 'weekly', 'one-time')),
    days_of_week INTEGER[] DEFAULT '{}',
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL
);

CREATE TABLE bookmarks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    ayah_text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ================================================
-- QURAN READING SUBMISSIONS TABLE
-- ================================================
CREATE TABLE quran_reading_submissions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    surah_number INTEGER NOT NULL,
    surah_name TEXT NOT NULL,
    start_ayah INTEGER NOT NULL,
    end_ayah INTEGER NOT NULL,
    submission_date TEXT NOT NULL, -- YYYY-MM-DD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_quran_reading_user ON quran_reading_submissions(user_id);
CREATE INDEX idx_quran_reading_date ON quran_reading_submissions(submission_date);

-- ================================================
-- 13. JOB STRUCTURE TABLE
-- ================================================
CREATE TABLE job_structure (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    profession_category TEXT NOT NULL CHECK (profession_category IN ('MEDIS', 'NON MEDIS')),
    unit TEXT NOT NULL,
    -- For NON MEDIS: contains bagian data
    bagians JSONB DEFAULT '[]',
    -- Structure: [{ "bagian": "IT", "professions": ["Staff IT", "Programmer"] }]
    -- For MEDIS: contains professions directly
    professions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_structure_category ON job_structure(profession_category);
CREATE INDEX idx_job_structure_unit ON job_structure(unit);

-- Enable RLS
ALTER TABLE job_structure ENABLE ROW LEVEL SECURITY;

-- Job structure policies (public read, admin update)
CREATE POLICY "Public read access for job structure" ON job_structure
    FOR SELECT USING (true);

CREATE POLICY "Admin update access for job structure" ON job_structure
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::TEXT
            AND role IN ('super-admin', 'admin')
        )
    );

CREATE POLICY "Admin insert access for job structure" ON job_structure
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::TEXT
            AND role IN ('super-admin', 'admin')
        )
    );

-- ================================================
-- 12. ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tadarus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tadarus_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentee_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_reading_submissions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 13. RLS POLICIES
-- ================================================

-- Employees: Everyone can read, only admins can update
CREATE POLICY "Public read access for employees" ON employees
    FOR SELECT USING (true);

CREATE POLICY "Admin update access for employees" ON employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::TEXT
            AND role IN ('super-admin', 'admin')
        )
    );

-- Announcements: Everyone can read, only admins/mentors can create
CREATE POLICY "Public read access for announcements" ON announcements
    FOR SELECT USING (true);

CREATE POLICY "Admin/mentor create access for announcements" ON announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::TEXT
            AND (role IN ('super-admin', 'admin') OR can_be_mentor = true)
        )
    );

-- Notifications: Users can only read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid()::TEXT);

-- Bookmarks: Users can only manage their own bookmarks
CREATE POLICY "Users can read own bookmarks" ON bookmarks
    FOR SELECT USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can create own bookmarks" ON bookmarks
    FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
    FOR DELETE USING (user_id = auth.uid()::TEXT);

-- Quran Reading Submissions: Users can only manage their own submissions
CREATE POLICY "Users can manage their own Quran reading submissions" ON quran_reading_submissions
    FOR ALL
    USING (user_id = auth.uid()::TEXT)
    WITH CHECK (user_id = auth.uid()::TEXT);

-- ================================================
-- 14. FUNCTIONS & TRIGGERS FOR UPDATED_AT
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_structure_updated_at BEFORE UPDATE ON job_structure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 16. INSERT DEFAULT DATA
-- ================================================

-- Default daily activities (from src/data/monthlyActivities.ts)
INSERT INTO daily_activities (id, category, title, monthly_target, automation_trigger) VALUES
    -- SIDIQ (Integritas)
    ('infaq', 'SIDIQ (Integritas)', 'Gemar berinfaq', 1, '{"type": "MANUAL_USER_REPORT"}'::jsonb),
    ('jujur', 'SIDIQ (Integritas)', 'Jujur menyampaikan informasi', 4, '{"type": "MANUAL_USER_REPORT"}'::jsonb),
    ('tanggung_jawab', 'SIDIQ (Integritas)', 'Tanggung jawab terhadap pekerjaan', 1, '{"type": "MANUAL_USER_REPORT"}'::jsonb),

    -- TABLIGH (Teamwork)
    ('persyarikatan', 'TABLIGH (Teamwork)', 'Aktif dalam kegiatan persyarikatan', 1, '{"type": "ACTIVITY_TYPE", "value": "Pengajian Persyarikatan"}'::jsonb),
    ('doa_bersama', 'TABLIGH (Teamwork)', 'Doa bersama mengawali pekerjaan', 20, '{"type": "TEAM_ATTENDANCE", "value": "Doa Bersama"}'::jsonb),
    ('lima_s', 'TABLIGH (Teamwork)', '5S (Salam, Senyum, Sapa, Sopan, Santun)', 20, '{"type": "MANUAL_USER_REPORT"}'::jsonb),

    -- AMANAH (Disiplin)
    ('subuh-default', 'AMANAH (Disiplin)', 'Sholat Subuh', 30, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('dzuhur-default', 'AMANAH (Disiplin)', 'Sholat Dzuhur', 30, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('ashar-default', 'AMANAH (Disiplin)', 'Sholat Ashar', 30, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('maghrib-default', 'AMANAH (Disiplin)', 'Sholat Maghrib', 30, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('isya-default', 'AMANAH (Disiplin)', 'Sholat Isya', 30, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('penampilan_diri', 'AMANAH (Disiplin)', 'Menjaga penampilan diri', 20, '{"type": "MANUAL_USER_REPORT"}'::jsonb),
    ('tepat_waktu_kie', 'AMANAH (Disiplin)', 'Tepat waktu menghadiri KIE', 1, '{"type": "TEAM_ATTENDANCE", "value": "KIE"}'::jsonb),

    -- FATONAH (Belajar)
    ('tahajud-default', 'SIDIQ (Integritas)', 'Sholat Tahajud', 15, '{"type": "PRAYER_WAJIB"}'::jsonb),
    ('tadarus', 'FATONAH (Belajar)', 'RSIJ bertadarus (berkelompok)', 3, '{"type": "TADARUS_SESSION"}'::jsonb),
    ('kajian_selasa', 'FATONAH (Belajar)', 'Kajian Selasa', 2, '{"type": "ACTIVITY_TYPE", "value": "Kajian Selasa"}'::jsonb),
    ('baca_alquran_buku', 'FATONAH (Belajar)', 'Membaca Al-Quran dan buku', 20, '{"type": "BOOK_READING_REPORT"}'::jsonb);

-- Default hospital
INSERT INTO hospitals (id, name, brand, address, is_active) VALUES
    ('RSIJSP', 'Rumah Sakit Islam Jakarta Sukapura', 'RSIJSP', 'Jl. Sukapura No. 123, Jakarta', true);
