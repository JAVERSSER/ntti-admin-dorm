-- Allow capital letters in admin usernames (e.g. "Admin").
-- Uniqueness and sign-in stay case-insensitive: "Admin" and "admin" are the same name.
alter table public.admins drop constraint if exists admins_username_format;
alter table public.admins add constraint admins_username_format
  check (username ~ '^[A-Za-z0-9._-]{3,32}$');
drop index if exists public.admins_username_key;
create unique index admins_username_key on public.admins (lower(username));
