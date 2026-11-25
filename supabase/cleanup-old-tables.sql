-- =============================================================================
-- DormPay — ONE-TIME cleanup of the EXISTING Supabase database (2026-11-25)
--
-- Removes everything left over from the old invoice / ABA PayWay design that
-- no page in admin/ or user/ uses any more. After this runs, the database
-- matches migrations/20261125100000_schema.sql exactly.
--
-- How to run: Supabase dashboard → SQL Editor → paste this file → Run.
-- It runs as one transaction: if any line fails, nothing is changed.
--
-- WARNING: the rows in these tables are deleted for good. Download a backup
-- first if you might want the old data (Database → Backups, or export each
-- table as CSV from the Table Editor).
--
-- Kept, untouched: admins, app_settings, institutions, rooms, grades,
-- payment_submissions, dorm_residents, audit_logs, storage buckets.
-- =============================================================================

begin;

-- 1. Old tables (their triggers, indexes and policies go with them).
drop table if exists public.payment_transactions   cascade;
drop table if exists public.webhook_events         cascade;
drop table if exists public.invoices               cascade;
drop table if exists public.payment_periods        cascade;
drop table if exists public.resident_verifications cascade;
drop table if exists public.residents              cascade;  -- replaced by dorm_residents
drop sequence if exists public.resident_code_seq;
drop sequence if exists public.transaction_code_seq;

-- 2. Old functions (invoices, ABA KHQR payments, dashboard reports).
drop function if exists public.guard_payment_period();
drop function if exists public.protect_invoice_amount();
drop function if exists public._reopen_invoice_if_idle(uuid);
drop function if exists public.refresh_overdue_invoices();
drop function if exists public.generate_invoices(uuid);
drop function if exists public.close_payment_period(uuid);
drop function if exists public.record_manual_payment;
drop function if exists public.void_payment(uuid, text);
drop function if exists public.correct_transaction(uuid, text, text, text);
drop function if exists public.cancel_invoice(uuid, text);
drop function if exists public.begin_aba_payment(uuid, integer);
drop function if exists public.attach_khqr(uuid, text, jsonb);
drop function if exists public.fail_aba_payment(uuid, text);
drop function if exists public.apply_aba_result(text, text, text, numeric, text, text, timestamptz, jsonb, uuid);
drop function if exists public.dashboard_summary(uuid);
drop function if exists public.report_grouped;
drop function if exists public.set_audit_context(text, uuid);

-- 3. Old enum types (only the old tables and functions used them).
drop type if exists public.user_type;
drop type if exists public.resident_status;
drop type if exists public.period_status;
drop type if exists public.invoice_status;
drop type if exists public.payment_method;
drop type if exists public.transaction_status;
drop type if exists public.verification_status;
drop type if exists public.webhook_status;

-- 4. app_settings: drop the old fee / due-day / KHQR settings.
alter table public.app_settings
  drop column if exists default_monthly_fee,
  drop column if exists default_currency,
  drop column if exists default_due_day,
  drop column if exists khqr_lifetime_minutes;

-- 5. Audit trigger: same behaviour, without the hooks the old functions used.
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

commit;

-- Check: this should list exactly 8 tables:
-- admins, app_settings, audit_logs, dorm_residents, grades, institutions,
-- payment_submissions, rooms
select table_name from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE'
 order by table_name;
