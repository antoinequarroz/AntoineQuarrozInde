alter table public.invoices
  add column if not exists document_type text not null default 'invoice'
    check (document_type in ('invoice', 'credit_note')),
  add column if not exists credited_invoice_id bigint references public.invoices(id) on delete restrict,
  add column if not exists locked_at timestamptz;

create index if not exists idx_invoices_credited_invoice_id
  on public.invoices(organization_id, credited_invoice_id)
  where credited_invoice_id is not null;
create unique index if not exists idx_invoices_org_id_id_unique
  on public.invoices(organization_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_credited_org_fk') then
    alter table public.invoices
      add constraint invoices_credited_org_fk
      foreign key (organization_id, credited_invoice_id)
      references public.invoices(organization_id, id) on delete restrict;
  end if;
end $$;

create table if not exists public.invoice_payments (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'CHF',
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer', 'swiss_qr', 'twint', 'cash', 'other')),
  paid_at date not null default current_date,
  reference text,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_payments_invoice_id
  on public.invoice_payments(organization_id, invoice_id, paid_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_payments_org_invoice_fk') then
    alter table public.invoice_payments
      add constraint invoice_payments_org_invoice_fk
      foreign key (organization_id, invoice_id)
      references public.invoices(organization_id, id) on delete cascade;
  end if;
end $$;

alter table public.invoice_payments enable row level security;
revoke all on table public.invoice_payments from anon, authenticated;
grant all on table public.invoice_payments to service_role;

comment on column public.invoices.locked_at is
  'Immutable accounting content lock set when an invoice or credit note leaves draft state.';
comment on table public.invoice_payments is
  'Append-only payment and refund history scoped to one organization and billing document.';
