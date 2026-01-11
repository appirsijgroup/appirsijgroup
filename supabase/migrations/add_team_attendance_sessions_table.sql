-- Migration: Create team_attendance_sessions table
-- Purpose: Store team attendance session data for KIE and Doa Bersama

-- Create table
CREATE TABLE IF NOT EXISTS team_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('KIE', 'Doa Bersama')),
    date TEXT NOT NULL, -- YYYY-MM-DD format
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL, -- HH:MM format
    audience_type TEXT NOT NULL CHECK (audience_type IN ('rules', 'manual')),
    audience_rules JSONB, -- Optional rules for 'rules' audience type
    manual_participant_ids TEXT[], -- Optional list of participant IDs for 'manual' type
    present_user_ids TEXT[] DEFAULT '{}', -- Array of user IDs who marked attendance
    attendance_mode TEXT CHECK (attendance_mode IN ('leader', 'self')), -- leader = by creator, self = by participants
    zoom_url TEXT,
    youtube_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_attendance_sessions_date
ON team_attendance_sessions(date);

CREATE INDEX IF NOT EXISTS idx_team_attendance_sessions_type
ON team_attendance_sessions(type);

CREATE INDEX IF NOT EXISTS idx_team_attendance_sessions_creator
ON team_attendance_sessions(creator_id);

-- Add comments for documentation
COMMENT ON TABLE team_attendance_sessions IS 'Team attendance sessions for KIE and Doa Bersama activities';
COMMENT ON COLUMN team_attendance_sessions.type IS 'Type of activity: KIE or Doa Bersama';
COMMENT ON COLUMN team_attendance_sessions.audience_type IS 'How participants are determined: rules (by criteria) or manual (selected by creator)';
COMMENT ON COLUMN team_attendance_sessions.audience_rules IS 'JSONB rules for audience selection when audience_type is "rules"';
COMMENT ON COLUMN team_attendance_sessions.manual_participant_ids IS 'Array of participant IDs when audience_type is "manual"';
COMMENT ON COLUMN team_attendance_sessions.present_user_ids IS 'Array of user IDs who have marked their attendance';
COMMENT ON COLUMN team_attendance_sessions.attendance_mode IS 'Who can mark attendance: leader (session creator) or self (participants mark themselves)';

-- Enable Row Level Security
ALTER TABLE team_attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first (in case they exist from previous runs)
DROP POLICY IF EXISTS "Public read access for team attendance sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can view all sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON team_attendance_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON team_attendance_sessions;

-- Create RLS policies
CREATE POLICY "Public read access for team attendance sessions"
ON team_attendance_sessions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can create sessions"
ON team_attendance_sessions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
ON team_attendance_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sessions"
ON team_attendance_sessions
FOR DELETE
TO anon
USING (true);

-- Verify table creation
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'team_attendance_sessions'
ORDER BY ordinal_position;

-- Expected result should show all columns with proper data types
