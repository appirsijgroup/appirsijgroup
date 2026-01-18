-- ============================================================================
-- TRANSFER PRIMARY KEY TO UID - FINAL STEP
-- ============================================================================
-- Run this ONLY after all employees have uid populated
-- ============================================================================

-- PRE-CHECK: Verify all employees have uid
DO $$
DECLARE
  total_count INT;
  without_uid INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM employees;
  SELECT COUNT(*) INTO without_uid FROM employees WHERE uid IS NULL;

  IF total_count = 0 THEN
    RAISE EXCEPTION 'No employees found!';
  ELSIF without_uid > 0 THEN
    RAISE EXCEPTION 'Cannot proceed! % employees still have NULL uid', without_uid;
  END IF;

  RAISE NOTICE '✅ Pre-check passed! All employees have uid (100%)', total_count;
END $$;

-- Show verification
SELECT
  'PRE-CHECK PASSED' as status,
  COUNT(*)::text as total_employees,
  COUNT(CASE WHEN uid IS NOT NULL THEN 1 END)::text as with_uid
FROM employees;

-- STEP 1: Drop self-referencing foreign keys in employees table
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_mentor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_supervisor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_dirut_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_ka_unit_id_fkey;

SELECT 'Step 1: Dropped self-referencing foreign keys' as status;

-- STEP 2: Drop foreign key constraints from OTHER tables
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_employee_id_fkey;
ALTER TABLE attendance_history DROP CONSTRAINT IF EXISTS attendance_history_employee_id_fkey;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_created_by_fkey;
ALTER TABLE weekly_report_submissions DROP CONSTRAINT IF EXISTS weekly_report_submissions_mentee_id_fkey;
ALTER TABLE weekly_report_submissions DROP CONSTRAINT IF EXISTS weekly_report_submissions_mentor_id_fkey;
ALTER TABLE weekly_report_submissions DROP CONSTRAINT IF EXISTS weekly_report_submissions_supervisor_id_fkey;
ALTER TABLE weekly_report_submissions DROP CONSTRAINT IF EXISTS weekly_report_submissions_ka_unit_id_fkey;
ALTER TABLE document_submissions DROP CONSTRAINT IF EXISTS document_submissions_mentee_id_fkey;
ALTER TABLE document_submissions DROP CONSTRAINT IF EXISTS document_submissions_mentor_id_fkey;
ALTER TABLE tadarus_sessions DROP CONSTRAINT IF EXISTS tadarus_sessions_mentor_id_fkey;
ALTER TABLE tadarus_requests DROP CONSTRAINT IF EXISTS tadarus_requests_mentee_id_fkey;
ALTER TABLE tadarus_requests DROP CONSTRAINT IF EXISTS tadarus_requests_mentor_id_fkey;
ALTER TABLE missed_prayer_requests DROP CONSTRAINT IF EXISTS missed_prayer_requests_mentee_id_fkey;
ALTER TABLE missed_prayer_requests DROP CONSTRAINT IF EXISTS missed_prayer_requests_mentor_id_fkey;
ALTER TABLE mentee_targets DROP CONSTRAINT IF EXISTS mentee_targets_mentor_id_fkey;
ALTER TABLE mentee_targets DROP CONSTRAINT IF EXISTS mentee_targets_mentee_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
ALTER TABLE quran_reading_submissions DROP CONSTRAINT IF EXISTS quran_reading_submissions_user_id_fkey;
ALTER TABLE reading_history DROP CONSTRAINT IF EXISTS fk_reading_user_id;
ALTER TABLE employee_monthly_activities DROP CONSTRAINT IF EXISTS employee_monthly_activities_employee_id_fkey;

SELECT 'Step 2: Dropped all foreign key constraints from other tables' as status;

-- STEP 3: Drop primary key constraint on employees
ALTER TABLE public.employees DROP CONSTRAINT employees_pkey;

SELECT 'Step 3: Dropped primary key constraint' as status;

-- STEP 4: Handle old nip column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees'
    AND column_name = 'nip'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees'
    AND column_name = 'id'
  ) THEN
    UPDATE employees SET id = nip WHERE id IS NULL AND nip IS NOT NULL;
    ALTER TABLE public.employees DROP COLUMN nip;
  END IF;
END $$;

SELECT 'Step 4: Handled duplicate nip column' as status;

-- STEP 5: Rename 'id' to 'nip'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN id TO nip;
  END IF;
END $$;

SELECT 'Step 5: Renamed id to nip' as status;

-- STEP 6: Make uid the PRIMARY KEY
ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);

SELECT 'Step 6: Made uid the PRIMARY KEY' as status;

-- STEP 7: Drop old_auth_user_id column if exists
ALTER TABLE public.employees DROP COLUMN IF EXISTS old_auth_user_id;

SELECT 'Step 7: Dropped old_auth_user_id column' as status;

-- STEP 8: Add unique constraint on nip
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_nip_key'
  ) THEN
    ALTER TABLE public.employees ADD CONSTRAINT employees_nip_key UNIQUE (nip);
  END IF;
END $$;

SELECT 'Step 8: Added unique constraint on nip' as status;

-- STEP 9: Recreate self-referencing foreign keys using nip
ALTER TABLE public.employees
ADD CONSTRAINT employees_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_supervisor_id_fkey
FOREIGN KEY (supervisor_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_dirut_id_fkey
FOREIGN KEY (dirut_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_ka_unit_id_fkey
FOREIGN KEY (ka_unit_id) REFERENCES employees(nip) ON DELETE SET NULL;

SELECT 'Step 9: Recreated self-referencing foreign keys' as status;

-- STEP 10: Recreate foreign key constraints from OTHER tables (using uid)
ALTER TABLE attendances
ADD CONSTRAINT attendances_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE attendance_history
ADD CONSTRAINT attendance_history_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE announcements
ADD CONSTRAINT announcements_author_id_fkey
FOREIGN KEY (author_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE activities
ADD CONSTRAINT activities_created_by_fkey
FOREIGN KEY (created_by) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE weekly_report_submissions
ADD CONSTRAINT weekly_report_submissions_mentee_id_fkey
FOREIGN KEY (mentee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE weekly_report_submissions
ADD CONSTRAINT weekly_report_submissions_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE weekly_report_submissions
ADD CONSTRAINT weekly_report_submissions_supervisor_id_fkey
FOREIGN KEY (supervisor_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE weekly_report_submissions
ADD CONSTRAINT weekly_report_submissions_ka_unit_id_fkey
FOREIGN KEY (ka_unit_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE document_submissions
ADD CONSTRAINT document_submissions_mentee_id_fkey
FOREIGN KEY (mentee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE document_submissions
ADD CONSTRAINT document_submissions_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE tadarus_sessions
ADD CONSTRAINT tadarus_sessions_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE tadarus_requests
ADD CONSTRAINT tadarus_requests_mentee_id_fkey
FOREIGN KEY (mentee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE tadarus_requests
ADD CONSTRAINT tadarus_requests_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE missed_prayer_requests
ADD CONSTRAINT missed_prayer_requests_mentee_id_fkey
FOREIGN KEY (mentee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE missed_prayer_requests
ADD CONSTRAINT missed_prayer_requests_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE mentee_targets
ADD CONSTRAINT mentee_targets_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE mentee_targets
ADD CONSTRAINT mentee_targets_mentee_id_fkey
FOREIGN KEY (mentee_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_admin_id_fkey
FOREIGN KEY (admin_id) REFERENCES employees(uid) ON DELETE SET NULL;

ALTER TABLE quran_reading_submissions
ADD CONSTRAINT quran_reading_submissions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE reading_history
ADD CONSTRAINT fk_reading_user_id
FOREIGN KEY (user_id) REFERENCES employees(uid) ON DELETE CASCADE;

ALTER TABLE employee_monthly_activities
ADD CONSTRAINT employee_monthly_activities_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES employees(uid) ON DELETE CASCADE;

SELECT 'Step 10: Recreated all foreign key constraints from other tables' as status;

-- STEP 11: Update indexes
DROP INDEX IF EXISTS public.idx_employees_id;
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees USING btree (nip);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees USING btree (email);
CREATE INDEX IF NOT EXISTS idx_employees_uid ON public.employees USING btree (uid);

SELECT 'Step 11: Updated indexes' as status;

-- STEP 12: Add comments
COMMENT ON COLUMN public.employees.nip IS 'Nomor Induk Pegawai (No Pegawai) - was "id" column';
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UUID - Primary Key from auth.users';

SELECT 'Step 12: Added column comments' as status;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT '====================' as info;
SELECT 'MIGRATION COMPLETE!' as status;
SELECT '====================' as info;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('nip', 'uid', 'email')
ORDER BY ordinal_position;

SELECT '====================' as info;
SELECT 'NEW TABLE STRUCTURE' as info;
SELECT '====================' as info;

SELECT 'uid = PRIMARY KEY (UUID from auth.users)' as info1;
SELECT 'nip = No Pegawai (was "id")' as info2;
SELECT 'All foreign keys updated to use uid' as info3;

SELECT '====================' as info;
SELECT 'NEXT STEPS' as info;
SELECT '====================' as info;

SELECT '1. Update application code:' as next1;
SELECT '   employee.id → employee.nip' as next2;
SELECT '   employee.auth_user_id → employee.uid' as next3;
SELECT '2. Test all features' as next4;
SELECT '3. Update RLS policies' as next5;
SELECT '4. Deploy changes' as next6;
