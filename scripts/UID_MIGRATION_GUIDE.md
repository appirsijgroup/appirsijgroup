# UID Migration Guide

## 📋 Overview

This guide helps you populate the `uid` column in the `employees` table by linking it to Supabase Auth users (`auth.users`).

## 🎯 Goal

Ensure every employee has a `uid` (UUID from auth.users) populated in the employees table.

## 📁 Files Created

1. **`scripts/diagnose-uid-status.sql`** - Check current state
2. **`scripts/populate-uids-from-existing-users.sql`** - Link to existing auth users
3. **`scripts/create-missing-auth-users.js`** - Create auth users for missing ones
4. **`scripts/verify-uid-migration.sql`** - Verify completion
5. **`supabase-migrations/fix-employees-primary-key-schema.sql`** - Fix table structure

## 🚀 Step-by-Step Process

### STEP 0: Prerequisites

Ensure you have:
- ✅ Database access (Supabase dashboard or CLI)
- ✅ `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Node.js installed

### STEP 1: Backup Database

⚠️ **CRITICAL: Backup before proceeding!**

```sql
-- Via Supabase dashboard SQL Editor
-- Or via CLI:
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### STEP 2: Diagnose Current State

Run via **Supabase Dashboard → SQL Editor**:

```bash
# Open and run:
scripts/diagnose-uid-status.sql
```

**What to check:**
- How many employees have `NULL` uid?
- How many have `auth_user_id` that can be copied?
- How many emails exist in `auth.users`?

### STEP 3: Run Table Structure Migration

Run via **Supabase Dashboard → SQL Editor**:

```bash
# Run:
supabase-migrations/fix-employees-primary-key-schema.sql
```

**This does:**
- Rename `id` → `nip`
- Remove duplicate `nip` column
- Rename `auth_user_id` → `uid`
- Add foreign key constraints

### STEP 4: Populate UIDs from Existing Data

Run via **Supabase Dashboard → SQL Editor**:

```bash
# Run:
scripts/populate-uids-from-existing-users.sql
```

**This does:**
- Copy from `auth_user_id` if exists
- Link employees to auth.users by email

### STEP 5: Create Missing Auth Users

Install dependencies if needed:

```bash
npm install @supabase/supabase-js dotenv
```

Run the script:

```bash
# Option A: Link existing auth users only
node scripts/create-missing-auth-users.js --link-only

# Option B: Full process (link + create missing)
node scripts/create-missing-auth-users.js
```

**What it does:**
- Checks which employees still don't have `uid`
- Links to existing auth.users by email
- Creates new auth.users for missing ones
- Updates employees with the new UIDs

**Default password for new users:** `RSI123456` (change in script)

### STEP 6: Verify Migration

Run via **Supabase Dashboard → SQL Editor**:

```bash
# Run:
scripts/verify-uid-migration.sql
```

**Expected output:**
- ✅ 100% employees have uid
- ✅ All UIDs are valid (exist in auth.users)
- ✅ No duplicate UIDs
- ✅ No NULL emails

### STEP 7: Make UID the Primary Key

⚠️ **ONLY after 100% employees have uid!**

Run via **Supabase Dashboard → SQL Editor**:

```sql
-- Drop old primary key if still exists
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_pkey;

-- Make uid the primary key
ALTER TABLE employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);

-- Verify
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name = 'uid';
```

### STEP 8: Update Application Code

**Search and replace in codebase:**

```typescript
// OLD:
employee.id
employee.auth_user_id

// NEW:
employee.nip        // No Pegawai (was 'id')
employee.uid        // UUID from auth.users (was 'auth_user_id')
```

**Update queries:**

```typescript
// OLD
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('id', employeeId);

// NEW
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('uid', employeeUid);

// Or for NIP lookup
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('nip', nip);
```

**Update types:**

```typescript
// OLD
interface Employee {
  id: string;
  auth_user_id?: string;
  ...
}

// NEW
interface Employee {
  uid: string;
  nip: string;
  ...
}
```

### STEP 9: Test Everything

Test list:
- [ ] Login with email works
- [ ] Login with NIP works
- [ ] Profile CRUD works
- [ ] Admin functions work
- [ ] All pages load correctly
- [ ] No console errors

## 🔧 Troubleshooting

### Problem: "Employees still without uid after migration"

**Solution:** Check for employees with invalid emails:

```sql
SELECT nip, name, email
FROM employees
WHERE uid IS NULL
  AND (email IS NULL OR email = '' OR email NOT LIKE '%@%');
```

Fix them manually:

```sql
UPDATE employees
SET email = 'temp_' || nip || '@rsi.local'
WHERE email IS NULL OR email = '';
```

### Problem: "Duplicate emails found"

**Solution:** Find and fix duplicates:

```sql
SELECT email, COUNT(*) as count
FROM employees
WHERE email IS NOT NULL AND email != ''
GROUP BY email
HAVING COUNT(*) > 1;
```

### Problem: "Auth user creation fails"

**Solution:** Check if email already exists in auth.users:

```sql
SELECT e.nip, e.name, e.email
FROM employees e
WHERE e.uid IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.email = e.email
  );
```

If found, link them manually:

```sql
UPDATE employees e
SET uid = a.id
FROM auth.users a
WHERE e.uid IS NULL
  AND e.email = a.email;
```

## 📊 Quick Reference

### Check Progress Anytime:

```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) as with_uid,
  COUNT(CASE WHEN uid IS NULL THEN 1 END) as without_uid,
  ROUND(100.0 * COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) / COUNT(*), 2) || '%' as progress
FROM employees;
```

### Get Employees Without UID:

```sql
SELECT nip, name, email, password
FROM employees
WHERE uid IS NULL
LIMIT 20;
```

### Manual UID Assignment (for special cases):

```sql
-- Create auth user via dashboard, then get UUID and update:
UPDATE employees
SET uid = 'paste-uuid-here'
WHERE nip = '6000';
```

## ✅ Success Criteria

Migration is complete when:
- ✅ 100% employees have `uid` populated
- ✅ All `uid`s exist in `auth.users`
- ✅ `uid` is PRIMARY KEY of `employees` table
- ✅ No duplicate `uid`s
- ✅ All application features work

## 📞 Need Help?

If issues persist:
1. Check Supabase logs: Dashboard → Logs
2. Verify environment variables
3. Check foreign key constraints
4. Review RLS policies

## 🎉 Post-Migration

After successful migration:
1. Remove old migration files
2. Update documentation
3. Monitor for issues
4. Train users about new NIP login feature
