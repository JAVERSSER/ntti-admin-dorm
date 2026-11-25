-- Separate sign-in username for administrators (login accepts username or email).
alter table public.admins add column if not exists username text;

-- Backfill from the email's local part, de-duplicated with a suffix if needed.
update public.admins a
set username = sub.u
from (
  select id,
         case when row_number() over (partition by base order by created_at) = 1 then base
              else base || row_number() over (partition by base order by created_at) end as u
  from (select id, created_at,
               left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'), 32) as base
        from public.admins) b
) sub
where a.id = sub.id and a.username is null;

alter table public.admins alter column username set not null;
alter table public.admins drop constraint if exists admins_username_format;
alter table public.admins add constraint admins_username_format
  check (username ~ '^[a-z0-9._-]{3,32}$');
create unique index if not exists admins_username_key on public.admins (username);
