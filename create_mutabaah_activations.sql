-- Create table for mutabaah activations
create table if not exists public.mutabaah_activations (
  id uuid default gen_random_uuid() primary key,
  employee_id text references public.employees(id) on delete cascade not null,
  month_key text not null, -- Format: 'YYYY-MM'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(employee_id, month_key)
);

-- Enable RLS
alter table public.mutabaah_activations enable row level security;

-- Policies

-- Users can view their own activations
create policy "Users can view their own activations"
on public.mutabaah_activations for select
using (
  employee_id in (
    select id from public.employees where auth_user_id = auth.uid()::text
  )
);

-- Users can insert their own activations
create policy "Users can insert their own activations"
on public.mutabaah_activations for insert
with check (
  employee_id in (
    select id from public.employees where auth_user_id = auth.uid()::text
  )
);

-- Admins can view all activations
create policy "Admins can view all activations"
on public.mutabaah_activations for select
using (
  exists (
    select 1 from public.employees
    where auth_user_id = auth.uid()::text
    and role in ('admin', 'super-admin')
  )
);

-- Admins can manage activations
create policy "Admins can manage activations"
on public.mutabaah_activations for all
using (
  exists (
    select 1 from public.employees
    where auth_user_id = auth.uid()::text
    and role in ('admin', 'super-admin')
  )
);
