alter table public.invoice_payments
  add column if not exists provider text,
  add column if not exists provider_payment_id text;

alter table public.invoice_payments
  drop constraint if exists invoice_payments_provider_check;
alter table public.invoice_payments
  add constraint invoice_payments_provider_check
  check (provider is null or provider in ('stripe'));

create unique index if not exists idx_invoice_payments_provider_payment_unique
  on public.invoice_payments(organization_id, provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;

comment on column public.invoice_payments.provider is
  'External payment processor. Null for manually recorded payments.';
comment on column public.invoice_payments.provider_payment_id is
  'Idempotency key supplied by the external payment processor.';
