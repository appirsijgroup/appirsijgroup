-- Fix Role Constraint and Add Auto-Lowercase Trigger
-- Run this in Supabase SQL Editor

-- 1. Drop existing constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- 2. Add function to normalize role to lowercase
CREATE OR REPLACE FUNCTION normalize_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert role to lowercase before insert/update
    NEW.role := LOWER(NEW.role);

    -- Ensure role is one of the valid values
    IF NEW.role NOT IN ('super-admin', 'admin', 'user') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: super-admin, admin, user', NEW.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if exists
DROP TRIGGER IF EXISTS employees_normalize_role_trigger ON employees;

-- 4. Create trigger to auto-normalize role
CREATE TRIGGER employees_normalize_role_trigger
    BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION normalize_role();

-- 5. Add back constraint for extra safety
ALTER TABLE employees ADD CONSTRAINT employees_role_check
    CHECK (role IN ('super-admin', 'admin', 'user'));

-- 6. Update any existing records with wrong case
UPDATE employees
SET role = LOWER(role)
WHERE role != LOWER(role);

-- Verify changes
SELECT id, name, role FROM employees WHERE role = 'super-admin';
