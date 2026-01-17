-- ============================================================================
-- TRANSFER PRIMARY KEY FROM id TO uid
-- ============================================================================
-- ⚠️  ONLY RUN THIS AFTER 100% OF EMPLOYEES HAVE UID POPULATED!
-- This migration:
-- 1. Drops all foreign key constraints from other tables
-- 2. Renames id to nip
-- 3. Makes uid the primary key
-- 4. Recreates all foreign key constraints to use uid
-- ============================================================================

-- ============================================================================
-- PRE-CHECK: Verify all employees have uid
-- ============================================================================
DO $$
DECLARE
  without_uid INT;
BEGIN
  SELECT COUNT(*) INTO without_uid FROM employees WHERE uid IS NULL;

  IF without_uid > 0 THEN
    RAISE EXCEPTION '❌ CANNOT PROCEED! % employees still have NULL uid. Run 02-verify-uid-population.sql first.', without_uid;
  END IF;

  RAISE NOTICE '✅ Pre-check passed: All employees have uid';
END $$;

-- ============================================================================
-- STEP 1: Drop self-referencing foreign keys in employees table
-- ============================================================================
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_mentor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_supervisor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_dirut_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_ka_unit_id_fkey;

-- ============================================================================
-- STEP 2: Drop foreign key constraints from OTHER tables
-- ============================================================================

-- From the error message, we need to drop these:
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

RAISE NOTICE '✅ Dropped all foreign key constraints';

-- ============================================================================
-- STEP 3: Drop primary key constraint on employees
-- ============================================================================
ALTER TABLE public.employees DROP CONSTRAINT employees_pkey;
RAISE NOTICE '✅ Dropped primary key constraint';

-- ============================================================================
-- STEP 4: Drop old 'nip' column if it exists (duplicate)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees'
    AND column_name = 'nip'
    AND ordinal_position < 100 -- Check if it's the old nip column (before id rename)
  ) THEN
    -- First, migrate data from old nip to id if id is null
    UPDATE employees SET id = nip WHERE id IS NULL AND nip IS NOT NULL;
    -- Then drop old nip
    ALTER TABLE public.employees DROP COLUMN nip;
    RAISE NOTICE '✅ Dropped duplicate nip column';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Rename 'id' to 'nip'
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN id TO nip;
    RAISE NOTICE '✅ Renamed id to nip';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Make uid the PRIMARY KEY
-- ============================================================================
ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);
RAISE NOTICE '✅ Made uid the PRIMARY KEY';

-- ============================================================================
-- STEP 7: Drop old_auth_user_id column (was auth_user_id)
-- ============================================================================
ALTER TABLE public.employees DROP COLUMN IF EXISTS old_auth_user_id;
RAISE NOTICE '✅ Dropped old_auth_user_id column';

-- ============================================================================
-- STEP 8: Add unique constraint on nip (was id)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_nip_key'
  ) THEN
    ALTER TABLE public.employees ADD CONSTRAINT employees_nip_key UNIQUE (nip);
  END IF;
END $$;
RAISE NOTICE '✅ Added unique constraint on nip';

-- ============================================================================
-- STEP 9: Recreate self-referencing foreign keys using nip
-- ============================================================================
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

RAISE NOTICE '✅ Recreated self-referencing foreign keys';

-- ============================================================================
-- STEP 10: Recreate foreign key constraints from OTHER tables
-- ============================================================================
-- Note: These need to reference uid, not nip!

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

RAISE NOTICE '✅ Recreated all foreign key constraints';

-- ============================================================================
-- STEP 11: Update indexes
-- ============================================================================
DROP INDEX IF EXISTS public.idx_employees_id;
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees USING btree (nip);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees USING btree (email);
CREATE INDEX IF NOT EXISTS idx_employees_uid ON public.employees USING btree (uid);

RAISE NOTICE '✅ Updated indexes';

-- ============================================================================
-- STEP 12: Add comments
-- ============================================================================
COMMENT ON COLUMN public.employees.nip IS 'Nomor Induk Pegawai (No Pegawai) - was "id" column';
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UUID - Primary Key from auth.users';

RAISE NOTICE '✅ Added column comments';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║         PRIMARY KEY TRANSFER COMPLETE! 🎉                  ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';

SELECT
  '═══════════════════════════════════════════════════════════' as '';
SELECT 'NEW TABLE STRUCTURE' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('nip', 'uid', 'email')
ORDER BY ordinal_position;

SELECT
  '═══════════════════════════════════════════════════════════' as '';
SELECT 'MIGRATION SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

SELECT
  '✅ uid is now PRIMARY KEY' as status;
SELECT
  '✅ id renamed to nip' as status;
SELECT
  '✅ All foreign keys updated to use uid' as status;
SELECT
  '✅ old_auth_user_id column removed' as status;
SELECT
  '' as status;
SELECT
  'NEXT: Update application code' as status;
SELECT
  '  - employee.id → employee.nip' as status;
SELECT
  '  - employee.auth_user_id → employee.uid' as status;

SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║              MIGRATION SUCCESSFUL! ✅                      ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';
