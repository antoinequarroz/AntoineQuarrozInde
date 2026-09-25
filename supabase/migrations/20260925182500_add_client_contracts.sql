create table if not exists public.contracts (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete restrict,
  project_id bigint references public.projects(id) on delete set null,
  quote_id bigint references public.quotes(id) on delete set null,
  number text not null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed', 'declined', 'cancelled')),
  version integer not null default 1 check (version > 0),
  effective_date date,
  starts_at date,
  ends_at date,
  scope text not null,
  deliverables text[] not null default '{}',
  provider_obligations text not null default '',
  client_obligations text not null default '',
  payment_terms text not null default '',
  change_management text not null default '',
  intellectual_property text not null default '',
  confidentiality text not null default '',
  data_protection text not null default '',
  warranty_support text not null default '',
  liability text not null default '',
  termination text not null default '',
  governing_law text not null default 'Droit suisse',
  jurisdiction text not null default 'Valais, Suisse',
  special_terms text not null default '',
  snapshot jsonb,
  snapshot_hash text check (snapshot_hash is null or length(snapshot_hash) = 64),
  sent_at timestamptz,
  signed_at timestamptz,
  signed_by_user_id uuid references auth.users(id) on delete set null,
  signer_name text,
  signer_email text,
  acceptance_ip text,
  acceptance_user_agent text,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number, version),
  constraint contracts_dates_ordered check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint contracts_snapshot_when_shared check (status = 'draft' or snapshot is not null),
  constraint contracts_signature_complete check (
    status <> 'signed'
    or (signed_at is not null and signed_by_user_id is not null and signer_name is not null and signer_email is not null)
  ),
  constraint contracts_client_tenant_fk foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  constraint contracts_project_tenant_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete set null (project_id),
  constraint contracts_quote_tenant_fk foreign key (organization_id, quote_id)
    references public.quotes(organization_id, id) on delete set null (quote_id)
);

create index if not exists contracts_org_created_idx on public.contracts(organization_id, created_at desc);
create index if not exists contracts_client_status_idx on public.contracts(organization_id, client_id, status);
create index if not exists contracts_project_idx on public.contracts(organization_id, project_id) where project_id is not null;

alter table public.contracts enable row level security;
revoke all on table public.contracts from anon, authenticated;
grant all on table public.contracts to service_role;
grant usage, select on sequence public.contracts_id_seq to service_role;

alter table public.email_deliveries
  drop constraint if exists email_deliveries_template_key_check,
  add constraint email_deliveries_template_key_check
    check (template_key in ('quote_available', 'invoice_available', 'payment_received', 'quote_reminder', 'invoice_reminder', 'contact_notification', 'contract_available')),
  drop constraint if exists email_deliveries_entity_type_check,
  add constraint email_deliveries_entity_type_check
    check (entity_type in ('quote', 'invoice', 'payment', 'contact_message', 'contract'));

comment on table public.contracts is 'Versioned service contracts. The snapshot and its SHA-256 hash freeze the client-visible terms when sent.';
comment on column public.contracts.snapshot is 'Immutable client-visible contract payload captured on first send.';
comment on column public.contracts.acceptance_ip is 'Audit evidence for explicit portal acceptance; access is restricted to the service role.';
