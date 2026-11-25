-- Bank transaction reference (e.g. ABA "Trx. ID") that the admin copies from the
-- payment screenshot when completing a payment. Searchable on the Payments page.
alter table public.payment_submissions add column if not exists bank_reference text;

alter table public.payment_submissions drop constraint if exists payment_submissions_bank_reference_len;
alter table public.payment_submissions add constraint payment_submissions_bank_reference_len
  check (bank_reference is null or char_length(bank_reference) between 1 and 64);

-- One bank transaction can only pay for one submission (catches a reused screenshot).
create unique index if not exists payment_submissions_bank_reference_key
  on public.payment_submissions (upper(bank_reference)) where bank_reference is not null;
