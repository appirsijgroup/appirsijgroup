-- Script to fix is_active field for super-admin accounts
-- Run this in your Supabase SQL Editor
-- Database uses snake_case: is_active

-- First, let's check all employees and their is_active status
SELECT
    id,
    name,
    email,
    role,
    is_active
FROM employees
ORDER BY role, name;

-- Update all super-admin accounts to be active
UPDATE employees
SET is_active = true
WHERE role = 'super-admin'
AND (is_active IS NULL OR is_active = false);

-- Verify the update
SELECT
    id,
    name,
    email,
    role,
    is_active
FROM employees
WHERE role = 'super-admin';
