alter table public.quotes
  add column if not exists subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  add column if not exists tax_cents integer not null default 0 check (tax_cents >= 0),
  add column if not exists total_cents integer not null default 0 check (total_cents >= 0);

alter table public.invoices
  add column if not exists subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  add column if not exists tax_cents integer not null default 0 check (tax_cents >= 0),
  add column if not exists total_cents integer not null default 0 check (total_cents >= 0);

create table if not exists public.quote_items (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id bigint not null references public.quotes(id) on delete cascade,
  position integer not null default 0,
  label text not null,
  description text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  tax_rate numeric(6,3) not null default 0 check (tax_rate >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  position integer not null default 0,
  label text not null,
  description text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  tax_rate numeric(6,3) not null default 0 check (tax_rate >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_items_quote_id on public.quote_items(quote_id);
create index if not exists idx_quote_items_org_id on public.quote_items(organization_id);
create index if not exists idx_invoice_items_invoice_id on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_org_id on public.invoice_items(organization_id);

alter table public.quote_items enable row level security;
alter table public.invoice_items enable row level security;
