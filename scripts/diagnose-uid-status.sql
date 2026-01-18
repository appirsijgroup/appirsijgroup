-- ============================================================================
-- DIAGNOSTIC SCRIPT: Check UID status in employees table
-- ============================================================================
-- Run this first to understand the current state
-- ============================================================================

-- 1. Total employees
SELECT 'Total employees' as metric, COUNT(*) as count
FROM employees;

-- 2. Employees with NULL uid
SELECT 'Employees with NULL uid' as metric, COUNT(*) as count
FROM employees
WHERE uid IS NULL;

-- 3. Employees with uid populated
SELECT 'Employees with uid populated' as metric, COUNT(*) as count
FROM employees
WHERE uid IS NOT NULL;

-- 4. Employees that have auth_user_id (old column)
SELECT 'Employees with auth_user_id' as metric, COUNT(*) as count
FROM employees
WHERE auth_user_id IS NOT NULL;

-- 5. Employees with both uid and auth_user_id
SELECT 'Employees with both uid and auth_user_id' as metric, COUNT(*) as count
FROM employees
WHERE uid IS NOT NULL AND auth_user_id IS NOT NULL;

-- 6. Employees with NULL uid but have auth_user_id
SELECT 'Employees with NULL uid but have auth_user_id (can copy)' as metric, COUNT(*) as count
FROM employees
WHERE uid IS NULL AND auth_user_id IS NOT NULL;

-- 7. Sample of employees without uid
SELECT
  'Sample employees without uid' as info,
  nip,
  name,
  email,
  uid,
  auth_user_id
FROM employees
WHERE uid IS NULL
LIMIT 5;

-- 8. Check if auth.users table exists and count
SELECT 'Total auth.users' as metric, COUNT(*) as count
FROM auth.users;

-- 9. Employees whose email exists in auth.users
SELECT 'Employees with email in auth.users' as metric, COUNT(*) as count
FROM employees e
WHERE EXISTS (
  SELECT 1 FROM auth.users a
  WHERE a.email = e.email
);

-- 10. Employees without uid but email exists in auth.users
SELECT
  'Employees without uid but email in auth.users (can link)' as info,
  e.nip,
  e.name,
  e.email,
  a.id as auth_uid
FROM employees e
JOIN auth.users a ON a.email = e.email
WHERE e.uid IS NULL
LIMIT 10;

-- 11. Check for email duplicates in employees
SELECT 'Duplicate emails in employees' as metric, COUNT(*) as count
FROM (
  SELECT email, COUNT(*) as cnt
  FROM employees
  GROUP BY email
  HAVING COUNT(*) > 1
) duplicates;

-- 12. Check for NULL emails in employees
SELECT 'Employees with NULL email' as metric, COUNT(*) as count
FROM employees
WHERE email IS NULL OR email = '';
