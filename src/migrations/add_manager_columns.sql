-- Migration to add manager support to employees table

-- 1. Add manager_id column (self-reference)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS manager_id text REFERENCES public.employees(id) ON DELETE SET NULL;

-- 2. Add can_be_manager column
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS can_be_manager boolean DEFAULT false;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);

-- Instructions:
-- Run this SQL in the Supabase SQL Editor to apply changes.
