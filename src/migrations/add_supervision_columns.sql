-- Migration to add supervisor and ka_unit support to employees table

-- 1. Add supervisor_id column (self-reference)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS supervisor_id text REFERENCES public.employees(id) ON DELETE SET NULL;

-- 2. Add ka_unit_id column (self-reference)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS ka_unit_id text REFERENCES public.employees(id) ON DELETE SET NULL;

-- 3. Add permission flags
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS can_be_supervisor boolean DEFAULT false;

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS can_be_ka_unit boolean DEFAULT false;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id ON public.employees(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_employees_ka_unit_id ON public.employees(ka_unit_id);

-- Instructions:
-- Run this SQL in the Supabase SQL Editor to apply changes if not already present.
