alter table public.organizations
  add column if not exists billing_name text,
  add column if not exists billing_street text,
  add column if not exists billing_building text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_country text not null default 'CH' check (billing_country ~ '^[A-Z]{2}$'),
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_iban text,
  add column if not exists billing_uid text,
  add column if not exists billing_terms text;

alter table public.clients
  add column if not exists billing_street text,
  add column if not exists billing_building text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_country text not null default 'CH' check (billing_country ~ '^[A-Z]{2}$');

alter table public.invoices
  add column if not exists payment_reference_type text not null default 'NON'
    check (payment_reference_type in ('NON', 'SCOR', 'QRR')),
  add column if not exists payment_reference text;

alter table public.projects
  add column if not exists client_id bigint references public.clients(id) on delete set null;

create index if not exists idx_projects_client_id on public.projects(client_id);

comment on column public.organizations.billing_iban is 'IBAN or QR-IBAN used for Swiss QR invoices; normalized and validated server-side.';
comment on column public.invoices.payment_reference_type is 'Swiss QR reference type: NON, SCOR or QRR.';
