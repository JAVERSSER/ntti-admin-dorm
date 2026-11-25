-- Run once in the Supabase SQL Editor.
-- Sets the "admin" account's password to "admin".
-- Supabase's API refuses passwords under 6 characters, but sign-in only
-- compares the bcrypt hash, so the hash is written directly here.
update auth.users
set encrypted_password = extensions.crypt('admin', extensions.gen_salt('bf')),
    updated_at = now()
where id = (select id from public.admins where username = 'admin');
