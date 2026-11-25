-- Let super admins remove other administrators (never themselves), so the
-- delete runs under the caller's session and the audit log records who did it.
drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins for delete to authenticated
  using (public.is_super_admin() and id <> auth.uid());
