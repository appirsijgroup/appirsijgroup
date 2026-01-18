-- ============================================================================
-- SUPABASE NATIVE AUTH MIGRATION with NIP Support
-- ============================================================================
-- This script sets up Supabase Native Authentication with auto-sync to employees
-- Supports login with BOTH Email and NIP (Nomor Pegawai)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new columns to employees table
-- ============================================================================

-- Add auth user ID (links to Supabase auth.users)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add profile completion tracking
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- Add email verification tracking
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add last login tracking
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add personal information for profile completion
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS position VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS join_date DATE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- IMPORTANT: Add NIP (Nomor Pegawai) column for login with employee ID
-- This is SEPARATE from the UUID id column
DO $$
BEGIN
  -- Check if nip column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'nip'
  ) THEN
    ALTER TABLE employees ADD COLUMN nip VARCHAR(50);

    -- Create unique constraint
    ALTER TABLE employees ADD CONSTRAINT employees_nip_unique UNIQUE (nip);

    -- Create index for NIP lookups (critical for login performance)
    CREATE INDEX idx_employees_nip ON employees(nip);

    RAISE NOTICE 'NIP column added to employees table';
  ELSE
    -- Column exists, just ensure index exists
    CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees(nip);
    RAISE NOTICE 'NIP column already exists';
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_profile_complete ON employees(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- ============================================================================
-- STEP 2: Create trigger function to auto-sync auth.users to employees
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
BEGIN
  -- Extract name from metadata or email
  employee_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create employee record
  INSERT INTO public.employees (
    auth_user_id,
    id,
    email,
    name,
    is_active,
    is_profile_complete,
    email_verified,
    created_at
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    employee_name,
    false, -- Require admin approval
    false, -- Require profile completion
    NEW.email_confirmed_at IS NOT NULL,
    NOW()
  );

  -- Log the creation
  RAISE NOTICE 'Employee created for auth user: %', NEW.email;

  RETURN NEW;
EXCEPTION
  WHEN UNIQUE_VIOLATION THEN
    -- Employee already exists, just log
    RAISE NOTICE 'Employee already exists for auth user: %', NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create trigger on auth.users
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 4: Update trigger on user email confirmation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee when email is confirmed
  UPDATE public.employees
  SET
    email_verified = true,
    updated_at = NOW()
  WHERE auth_user_id::text = NEW.id::text;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_email_confirmation();

-- ============================================================================
-- STEP 5: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON employees;
DROP POLICY IF EXISTS "Users can update own profile" ON employees;
DROP POLICY IF EXISTS "Admins can view all profiles" ON employees;
DROP POLICY IF EXISTS "Admins can update all profiles" ON employees;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text OR auth.uid()::text = auth_user_id::text);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON employees FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.uid()::text = auth_user_id::text)
  WITH CHECK (auth.uid()::text = id::text OR auth.uid()::text = auth_user_id::text);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON employees FOR SELECT
  USING (
    role = 'admin' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE (e.id::text = auth.uid()::text OR e.auth_user_id::text = auth.uid()::text)
      AND e.role = 'admin'
    )
  );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE (e.id::text = auth.uid()::text OR e.auth_user_id::text = auth.uid()::text)
      AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE (e.id::text = auth.uid()::text OR e.auth_user_id::text = auth.uid()::text)
      AND e.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 6: Create helper functions
-- ============================================================================

-- Function to check if user has completed profile
CREATE OR REPLACE FUNCTION public.check_profile_complete(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE (id::text = user_id::text OR auth_user_id::text = user_id::text)
    AND is_profile_complete = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get employee by auth user ID
CREATE OR REPLACE FUNCTION public.get_employee_by_auth(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  nip VARCHAR(50),
  role TEXT,
  is_active BOOLEAN,
  is_profile_complete BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.email,
    e.nip,
    e.role,
    e.is_active,
    e.is_profile_complete
  FROM employees e
  WHERE e.id::text = user_id::text OR e.auth_user_id::text = user_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRITICAL: Function to get email by NIP (for NIP-based login)
CREATE OR REPLACE FUNCTION public.get_email_by_nip(nip_input VARCHAR(50))
RETURNS TABLE (
  email TEXT,
  employee_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.email,
    e.id
  FROM employees e
  WHERE e.nip = nip_input
  AND e.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE employees
  SET last_login = NOW()
  WHERE id::text = user_id::text OR auth_user_id::text = user_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Grant necessary permissions
-- ============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_profile_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_by_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_nip(VARCHAR(50)) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_last_login(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if trigger is created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees';

-- Check employees table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
