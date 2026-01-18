-- Add uid column to employees table
-- This migration adds a uid column that stores Supabase Auth UID (auth.users.id)

-- Add the uid column (UUID type, nullable initially for existing records)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS uid uuid NULL;

-- Create a unique index on uid
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid ON public.employees(uid);

-- Add foreign key constraint to link with auth.users
ALTER TABLE public.employees
ADD CONSTRAINT IF NOT EXISTS employees_uid_fkey
FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UID from auth.users table - created during user registration';

-- If you want to copy existing auth_user_id values to uid:
-- UPDATE public.employees SET uid = auth_user_id WHERE auth_user_id IS NOT NULL;

-- After data migration, you can make it NOT NULL:
-- ALTER TABLE public.employees ALTER COLUMN uid SET NOT NULL;
