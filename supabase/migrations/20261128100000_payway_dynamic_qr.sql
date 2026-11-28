-- =============================================================================
-- Dynamic ABA PayWay KHQR (replaces the static QR image + screenshot upload).
--
-- * app_settings.monthly_fee_usd   the amount every dynamic QR asks for (set in admin Settings)
-- * payway_transactions            one row per generated QR, until it is paid or expires
-- * payment_submissions            paid PayWay transactions land here as 'approved'; no screenshot
--
-- Safe to run more than once (parts of it may already exist).
-- =============================================================================

alter table public.app_settings
  add column if not exists monthly_fee_usd numeric(10, 2)
    check (monthly_fee_usd is null or monthly_fee_usd between 0.01 and 100000);

-- New submissions are confirmed by PayWay, so they have no screenshot.
alter table public.payment_submissions alter column slip_path drop not null;
alter table public.payment_submissions
  add column if not exists amount         numeric(10, 2),
  add column if not exists currency       text check (currency is null or currency in ('USD', 'KHR')),
  add column if not exists payway_tran_id text,
  add column if not exists payway_apv     text,
  add column if not exists paid_at        timestamptz;
-- One submission per PayWay transaction, even if the page and the callback confirm it at the same time.
create unique index if not exists payment_submissions_payway_tran_id_key
  on public.payment_submissions (payway_tran_id) where payway_tran_id is not null;


create table if not exists public.payway_transactions (
  tran_id        text primary key check (char_length(tran_id) between 1 and 20),
  room           text not null,
  student_name   text not null,
  grade          text not null,
  institution    text not null,
  for_month      date not null,
  amount         numeric(10, 2) not null check (amount > 0),
  currency       text not null default 'USD',
  qr_string      text not null,
  qr_image       text not null,               -- data:image/png;base64,… from PayWay
  deeplink       text,
  status         text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  submission_id  uuid references public.payment_submissions (id) on delete set null,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists payway_transactions_created_idx on public.payway_transactions (created_at);
drop trigger if exists payway_transactions_updated_at on public.payway_transactions;
create trigger payway_transactions_updated_at before update on public.payway_transactions
  for each row execute function public.set_updated_at();

-- Only the user app's server (service role) writes; admins may read.
alter table public.payway_transactions enable row level security;
drop policy if exists payway_transactions_select on public.payway_transactions;
create policy payway_transactions_select on public.payway_transactions for select to authenticated
  using (public.is_admin());
revoke all on public.payway_transactions from anon;
revoke insert, update, delete on public.payway_transactions from authenticated;
