-- ============================================================================
-- UPDATE EXISTING EMPLOYEES FOR SUPABASE AUTH
-- ============================================================================
-- CLARIFICATION:
--   - id = UUID (database primary key)
--   - nip = VARCHAR/TEXT (Nomor Pegawai for login)
-- ============================================================================

-- STEP 1: Check employees without auth_user_id
SELECT
  id,  -- UUID (database identifier)
  nip,  -- Nomor Pegawai (for login)
  name,
  email,
  role,
  is_active,
  auth_user_id
FROM employees
WHERE auth_user_id IS NULL
  AND email IS NOT NULL
ORDER BY created_at DESC;

-- STEP 2: Count employees with and without auth
SELECT
  COUNT(*) as total_employees,
  COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as with_auth,
  COUNT(CASE WHEN auth_user_id IS NULL THEN 1 END) as without_auth,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as without_email
FROM employees;

-- STEP 3: Check specific NIP (replace '6000' with actual NIP)
SELECT
  id,  -- UUID
  nip,  -- Nomor Pegawai
  name,
  email,
  role,
  is_active,
  auth_user_id,
  email_verified,
  is_profile_complete
FROM employees
WHERE nip = '6000';  -- Replace with actual NIP

-- STEP 4: Check for duplicate NIPs (important for login)
SELECT
  nip,
  COUNT(*) as count
FROM employees
WHERE nip IS NOT NULL
GROUP BY nip
HAVING COUNT(*) > 1;
