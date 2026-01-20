-- ============================================
-- TABLE: team_attendance_records
-- Purpose: Menyimpan record presensi SETIAP USER di SETIAP SESI
-- Terpisah dari tabel jadwal (team_attendance_sessions)
-- ============================================

create table public.team_attendance_records (
  id uuid not null default gen_random_uuid (),
  session_id uuid not null references public.team_attendance_sessions(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  attended_at timestamp with time zone not null default now(),
  created_at timestamp with time zone null default now(),

  -- Metadata from session (denormalized for performance)
  session_type text not null,
  session_date text not null,
  session_start_time text not null,
  session_end_time text not null,

  constraint team_attendance_records_pkey primary key (id),
  -- Unique: satu user hanya bisa presensi SATU kali di satu sesi
  constraint team_attendance_records_session_user_unique unique (session_id, user_id)
) TABLESPACE pg_default;

-- Indexes for common queries
create index IF not exists idx_team_attendance_records_session_id on public.team_attendance_records using btree (session_id) TABLESPACE pg_default;
create index IF not exists idx_team_attendance_records_user_id on public.team_attendance_records using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_team_attendance_records_date on public.team_attendance_records using btree (session_date) TABLESPACE pg_default;
create index IF not exists idx_team_attendance_records_attended_at on public.team_attendance_records using btree (attended_at) TABLESPACE pg_default;

-- Comments
comment on table public.team_attendance_records is 'Menyimpan record presensi setiap user di setiap sesi kegiatan. Terpisah dari jadwal sesi untuk normalization dan tracking waktu presensi.';
comment on column public.team_attendance_records.session_id is 'Reference ke sesi kegiatan di team_attendance_sessions';
comment on column public.team_attendance_records.user_id is 'ID employee yang melakukan presensi';
comment on column public.team_attendance_records.user_name is 'Nama employee (denormalized untuk performance)';
comment on column public.team_attendance_records.attended_at is 'Waktu ketika user klik tombol HADIR (penting untuk audit)';
comment on column public.team_attendance_records.session_type is 'Jenis kegiatan (KIE/Doa Bersama) - copy dari session untuk query cepat';
comment on column public.team_attendance_records.session_date is 'Tanggal sesi - copy dari session untuk query cepat';
comment on column public.team_attendance_records.session_start_time is 'Waktu mulai sesi - copy dari session untuk info';
comment on column public.team_attendance_records.session_end_time is 'Waktu selesai sesi - copy dari session untuk info';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.team_attendance_records enable row level security;

-- Policy: Semua employee bisa baca record presensi (untuk melihat siapa yang hadir)
create policy "Employees can view attendance records"
on public.team_attendance_records
for select
to public
using (true);

-- Policy: Hanya creator session atau user yang bersangkutan yang bisa insert presensi
create policy "Users can insert own attendance, creators can insert for their sessions"
on public.team_attendance_records
for insert
to public
with check (
  -- User bisa presensi untuk dirinya sendiri
  (user_id = auth.uid()::text)
  OR
  -- Creator session bisa input presensi untuk user lain (mode leader)
  exists (
    select 1 from public.team_attendance_sessions
    where team_attendance_sessions.id = session_id
    and team_attendance_sessions.creator_id = auth.uid()::text
  )
);

-- Policy: Hanya creator session yang bisa update/delete presensi (jika salah input)
create policy "Only session creators can update attendance records"
on public.team_attendance_records
for update
to public
using (
  exists (
    select 1 from public.team_attendance_sessions
    where team_attendance_sessions.id = session_id
    and team_attendance_sessions.creator_id = auth.uid()::text
  )
);

create policy "Only session creators can delete attendance records"
on public.team_attendance_records
for delete
to public
using (
  exists (
    select 1 from public.team_attendance_sessions
    where team_attendance_sessions.id = session_id
    and team_attendance_sessions.creator_id = auth.uid()::text
  )
);

-- ============================================
-- TRIGGER: Update updated_at di team_attendance_sessions
-- ============================================
-- Setiap ada insert/delete di attendance_records, update updated_at di sessions
-- Ini menggantikan kebutuhan update manual updated_at

create or replace function public.update_session_updated_at()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.team_attendance_sessions
    set updated_at = now()
    where id = new.session_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.team_attendance_sessions
    set updated_at = now()
    where id = old.session_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trigger_update_session_updated_at_after_attendance
after insert or delete on public.team_attendance_records
for each row
execute function public.update_session_updated_at();

-- ============================================
-- MIGRATE EXISTING DATA (opsional, jika sudah ada data di present_user_ids)
-- ============================================

-- Uncomment ini jika ingin migrate data existing:
/*
insert into public.team_attendance_records (
  session_id,
  user_id,
  user_name,
  attended_at,
  session_type,
  session_date,
  session_start_time,
  session_end_time
)
select
  s.id as session_id,
  u.user_id,
  e.name as user_name,
  s.updated_at as attended_at, -- Asumsi user hadir saat updated_at
  s.type as session_type,
  s.date as session_date,
  s.start_time as session_start_time,
  s.end_time as session_end_time
from public.team_attendance_sessions s
cross join lateral unnest(s.present_user_ids) as u(user_id)
join public.employees e on e.id = u.user_id
where array_length(s.present_user_ids, 1) > 0;
*/
