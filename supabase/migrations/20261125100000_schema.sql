-- =============================================================================
-- DormPay — complete database schema
--
-- Replaces the 10 earlier migration files (backup: _backup/old-migrations-2026-11-25.tar.gz).
-- On a NEW, empty Supabase project: run this file, then ../seed.sql.
-- On the EXISTING project: do not run this file. Run ../cleanup-old-tables.sql once.
--
-- Tables
--   admins               who may sign in to the admin app
--   app_settings         one row: dormitory name + payment QR image
--   institutions         schools in the form's "Student at" list
--   rooms                rooms in the form's "Room" list
--   grades               grades in the form's "Grade" list
--   payment_submissions  each payment screenshot a resident uploads
--   dorm_residents       roster of who lives in which room (paid / not paid)
--   audit_logs           history of admin changes (written by triggers only)
-- Storage buckets
--   payment-slips        private: payment screenshots
--   payment-qr           public:  the QR image shown on the form
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create type public.admin_role as enum ('super_admin', 'admin');

-- Keeps updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- admins (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null check (char_length(trim(full_name)) between 2 and 120),
  role        public.admin_role not null default 'admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger admins_updated_at before update on public.admins
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Authorization helpers (used by every RLS policy below)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid() and is_active);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid() and is_active and role = 'super_admin');
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end;
$$;

-- Settings → Profile: an admin may change their own display name.
create or replace function public.update_my_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_full_name is null or char_length(trim(p_full_name)) not between 2 and 120 then
    raise exception 'Name must be 2–120 characters' using errcode = 'check_violation';
  end if;
  update public.admins set full_name = trim(p_full_name) where id = auth.uid();
end;
$$;

-- A super admin cannot deactivate or demote themselves (prevents lock-out).
create or replace function public.guard_admin_self_change()
returns trigger
language plpgsql
as $$
begin
  if old.id = auth.uid() and (new.is_active = false or new.role <> old.role) then
    raise exception 'You cannot deactivate or change the role of your own account' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger admins_guard_self before update on public.admins
  for each row execute function public.guard_admin_self_change();


-- ---------------------------------------------------------------------------
-- audit_logs (append-only history of admin changes)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  actor_email  text,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  reason       text,
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx   on public.audit_logs (actor_id);

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- Writes one audit_logs row per insert / update / delete on the table it is attached to.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_old   jsonb;
  v_new   jsonb;
  v_id    text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old) - 'updated_at'; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new) - 'updated_at'; end if;

  -- Skip no-op updates.
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;

  if v_actor is not null then
    select email into v_email from public.admins where id = v_actor;
  end if;

  v_id := coalesce(v_new ->> 'id', v_old ->> 'id');

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, old_data, new_data)
  values (
    v_actor,
    coalesce(v_email, case when v_actor is null then 'system' end),
    lower(tg_op),
    tg_table_name,
    -- app_settings has id = 1, not a uuid.
    case when v_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id::uuid end,
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_admins after insert or update or delete on public.admins
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- app_settings (single row, id = 1)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id               smallint primary key default 1 check (id = 1),
  dormitory_name   text not null default 'Dormitory' check (char_length(trim(dormitory_name)) between 2 and 120),
  payment_qr_path  text,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.admins (id) on delete set null
);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
create trigger audit_app_settings after update on public.app_settings
  for each row execute function public.audit_row_change();

insert into public.app_settings (id) values (1) on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- institutions ("Student at" list)
-- ---------------------------------------------------------------------------
create table public.institutions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name        text not null check (char_length(trim(name)) between 2 and 160),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index institutions_code_key on public.institutions (code);
create unique index institutions_name_key on public.institutions (lower(name));
create trigger institutions_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();
create trigger audit_institutions after insert or update or delete on public.institutions
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- rooms ("Room" list)
-- ---------------------------------------------------------------------------
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 40),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index rooms_name_key on public.rooms (lower(name));
create trigger rooms_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();
create trigger audit_rooms after insert or update or delete on public.rooms
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- grades ("Grade" list)
-- ---------------------------------------------------------------------------
create table public.grades (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 40),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index grades_name_key on public.grades (lower(name));
create trigger grades_updated_at before update on public.grades
  for each row execute function public.set_updated_at();
create trigger audit_grades after insert or update or delete on public.grades
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- payment_submissions
-- Room / grade / institution are text snapshots, so a later rename never
-- changes what the resident actually submitted.
-- ---------------------------------------------------------------------------
create table public.payment_submissions (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  room          text not null check (char_length(trim(room)) between 1 and 40),
  student_name  text not null check (char_length(trim(student_name)) between 2 and 120),
  grade         text not null check (char_length(trim(grade)) between 1 and 40),
  institution   text not null check (char_length(trim(institution)) between 1 and 160),
  slip_path     text not null,
  -- The month paid for, stored as its first day (dormitory local time).
  for_month     date not null default date_trunc('month', now() at time zone 'Asia/Phnom_Penh')::date
                constraint payment_submissions_for_month_first_day check (extract(day from for_month) = 1),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note    text check (admin_note is null or char_length(admin_note) <= 500),
  reviewed_by   uuid references public.admins (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index payment_submissions_reference_key on public.payment_submissions (reference);
create index payment_submissions_created_idx   on public.payment_submissions (created_at desc);
create index payment_submissions_status_idx    on public.payment_submissions (status);
create index payment_submissions_name_idx      on public.payment_submissions (lower(student_name));
create index payment_submissions_for_month_idx on public.payment_submissions (for_month, created_at desc);
create trigger payment_submissions_updated_at before update on public.payment_submissions
  for each row execute function public.set_updated_at();
create trigger audit_payment_submissions after update on public.payment_submissions
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- dorm_residents (roster: who lives in which room)
-- The Residents page matches each row to that month's payment_submissions.
-- ---------------------------------------------------------------------------
create table public.dorm_residents (
  id           uuid primary key default gen_random_uuid(),
  room         text not null check (char_length(trim(room)) between 1 and 40),
  full_name    text not null check (char_length(trim(full_name)) between 2 and 120),
  degree       text check (degree is null or char_length(degree) <= 80),
  major        text check (major is null or char_length(major) <= 160),
  grade        text check (grade is null or char_length(grade) <= 40),
  institution  text check (institution is null or char_length(institution) <= 160),
  note         text check (note is null or char_length(note) <= 500),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index dorm_residents_room_name_key on public.dorm_residents (lower(room), lower(full_name));
create index dorm_residents_room_idx on public.dorm_residents (room);
create trigger dorm_residents_updated_at before update on public.dorm_residents
  for each row execute function public.set_updated_at();
create trigger audit_dorm_residents after insert or update or delete on public.dorm_residents
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- Row Level Security: only active admins can read or change data.
-- The user app writes with the service-role key from its server, which
-- bypasses RLS; anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
alter table public.admins              enable row level security;
alter table public.app_settings        enable row level security;
alter table public.institutions        enable row level security;
alter table public.rooms               enable row level security;
alter table public.grades              enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.dorm_residents      enable row level security;
alter table public.audit_logs          enable row level security;

-- admins: every admin sees the team; only super admins change it.
create policy admins_select on public.admins for select to authenticated using (public.is_admin());
create policy admins_insert on public.admins for insert to authenticated with check (public.is_super_admin());
create policy admins_update on public.admins for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy app_settings_select on public.app_settings for select to authenticated using (public.is_admin());
create policy app_settings_update on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lists: no hard deletes (hide with is_active instead).
create policy institutions_select on public.institutions for select to authenticated using (public.is_admin());
create policy institutions_insert on public.institutions for insert to authenticated with check (public.is_admin());
create policy institutions_update on public.institutions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy rooms_select on public.rooms for select to authenticated using (public.is_admin());
create policy rooms_insert on public.rooms for insert to authenticated with check (public.is_admin());
create policy rooms_update on public.rooms for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy grades_select on public.grades for select to authenticated using (public.is_admin());
create policy grades_insert on public.grades for insert to authenticated with check (public.is_admin());
create policy grades_update on public.grades for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Submissions: admins read and review; only the user app's server inserts.
create policy payment_submissions_select on public.payment_submissions for select to authenticated
  using (public.is_admin());
create policy payment_submissions_update on public.payment_submissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy dorm_residents_select on public.dorm_residents for select to authenticated using (public.is_admin());
create policy dorm_residents_insert on public.dorm_residents for insert to authenticated with check (public.is_admin());
create policy dorm_residents_update on public.dorm_residents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy dorm_residents_delete on public.dorm_residents for delete to authenticated using (public.is_admin());

create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());


-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

revoke insert, delete on public.payment_submissions from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

grant execute on function public.is_admin(), public.is_super_admin(), public.update_my_profile(text)
  to authenticated;
-- Helper and trigger functions run inside other functions and triggers.
grant execute on function public.assert_admin(), public.set_updated_at(), public.audit_row_change(),
  public.audit_logs_immutable(), public.guard_admin_self_change()
  to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-slips', 'payment-slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-qr',    'payment-qr',    true,  5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins read payment slips" on storage.objects for select to authenticated
  using (bucket_id = 'payment-slips' and public.is_admin());

create policy "admins manage payment qr" on storage.objects for all to authenticated
  using (bucket_id = 'payment-qr' and public.is_admin())
  with check (bucket_id = 'payment-qr' and public.is_admin());
