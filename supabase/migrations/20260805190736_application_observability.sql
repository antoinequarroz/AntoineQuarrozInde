create table if not exists public.application_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  source text not null check (source in ('client', 'server')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'fatal')),
  message text not null,
  stack text,
  path text,
  fingerprint text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_application_errors_created_at
  on public.application_errors(created_at desc);

create index if not exists idx_application_errors_org_unresolved
  on public.application_errors(organization_id, created_at desc)
  where resolved_at is null;

create index if not exists idx_application_errors_fingerprint
  on public.application_errors(fingerprint, created_at desc);

alter table public.application_errors enable row level security;

revoke all on table public.application_errors from anon, authenticated;
grant all on table public.application_errors to service_role;
