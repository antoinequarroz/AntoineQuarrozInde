create table if not exists public.recurring_invoice_profiles (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint,
  project_id bigint,
  name text not null check (char_length(name) between 1 and 160),
  cadence text not null check (cadence in ('monthly', 'quarterly', 'yearly')),
  next_issue_date date not null,
  payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 365),
  currency text not null default 'CHF' check (currency in ('CHF', 'EUR')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  notes text,
  active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete set null (project_id),
  unique (organization_id, id)
);

create table if not exists public.recurring_invoice_runs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id bigint not null,
  scheduled_date date not null,
  invoice_id bigint,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id, scheduled_date),
  foreign key (organization_id, profile_id) references public.recurring_invoice_profiles(organization_id, id) on delete cascade,
  foreign key (organization_id, invoice_id) references public.invoices(organization_id, id) on delete set null (invoice_id)
);

create index if not exists recurring_invoice_profiles_due_idx on public.recurring_invoice_profiles(organization_id, active, next_issue_date);
alter table public.recurring_invoice_profiles enable row level security;
alter table public.recurring_invoice_runs enable row level security;
revoke all on public.recurring_invoice_profiles, public.recurring_invoice_runs from anon, authenticated;
grant all on public.recurring_invoice_profiles, public.recurring_invoice_runs to service_role;

comment on table public.recurring_invoice_profiles is 'Private organization-scoped templates that create draft invoices only.';
comment on table public.recurring_invoice_runs is 'Idempotency ledger for recurring draft invoice generation.';

alter table public.invoices
  add column if not exists recurring_profile_id bigint,
  add column if not exists recurring_scheduled_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_recurring_profile_org_fk') then
    alter table public.invoices add constraint invoices_recurring_profile_org_fk
      foreign key (organization_id, recurring_profile_id)
      references public.recurring_invoice_profiles(organization_id, id) on delete set null (recurring_profile_id);
  end if;
end $$;

create unique index if not exists invoices_recurring_generation_unique
  on public.invoices(organization_id, recurring_profile_id, recurring_scheduled_date)
  where recurring_profile_id is not null;
