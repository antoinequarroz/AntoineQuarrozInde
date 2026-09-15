alter table public.clients
  add column if not exists preferred_locale text not null default 'fr'
    check (preferred_locale in ('fr', 'en', 'de')),
  add column if not exists marketing_opt_out_at timestamptz;

create table if not exists public.email_delivery_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  automation_enabled boolean not null default true,
  quote_offsets integer[] not null default '{3,0}',
  invoice_offsets integer[] not null default '{2,0,-3,-10,-20}',
  updated_at timestamptz not null default now(),
  check (cardinality(quote_offsets) between 1 and 5),
  check (cardinality(invoice_offsets) between 1 and 8),
  check (quote_offsets <@ array[0,1,2,3,5,7,10,14]),
  check (invoice_offsets <@ array[-60,-45,-30,-20,-14,-10,-7,-5,-3,-1,0,1,2,3,5,7,10,14])
);

create table if not exists public.email_deliveries (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint,
  category text not null check (category in ('transactional', 'marketing')),
  template_key text not null check (template_key in ('quote_available', 'invoice_available', 'payment_received', 'quote_reminder', 'invoice_reminder')),
  locale text not null check (locale in ('fr', 'en', 'de')),
  recipient text not null check (length(recipient) between 3 and 320),
  entity_type text check (entity_type in ('quote', 'invoice', 'payment')),
  entity_id text,
  idempotency_key text not null check (length(idempotency_key) between 1 and 256),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'uncertain', 'suppressed')),
  provider_id text,
  attempt_count smallint not null default 1 check (attempt_count between 1 and 20),
  error_code text check (error_code in ('not_configured', 'provider_rejected', 'network_error', 'timeout_ambiguous', 'marketing_opt_out', 'unknown')),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_deliveries_org_key_unique unique (organization_id, idempotency_key),
  constraint email_deliveries_client_tenant_fk foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete set null (client_id),
  check ((status = 'sent') = (sent_at is not null)),
  check (status <> 'sent' or provider_id is not null)
);

create index if not exists email_deliveries_org_created_idx
  on public.email_deliveries(organization_id, created_at desc);
create index if not exists email_deliveries_org_status_idx
  on public.email_deliveries(organization_id, status, created_at desc);

alter table public.email_delivery_settings enable row level security;
alter table public.email_deliveries enable row level security;
revoke all on table public.email_delivery_settings, public.email_deliveries from anon, authenticated;
grant all on table public.email_delivery_settings, public.email_deliveries to service_role;
grant usage, select on sequence public.email_deliveries_id_seq to service_role;

comment on table public.email_deliveries is 'Tenant-scoped Lumail delivery metadata. Email bodies and provider errors are deliberately excluded.';
comment on column public.email_deliveries.error_code is 'Closed operational code; never a raw provider response or stack trace.';
