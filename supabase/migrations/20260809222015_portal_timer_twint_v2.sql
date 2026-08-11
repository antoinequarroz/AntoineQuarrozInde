alter table public.quotes
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists acceptance_ip inet,
  add column if not exists acceptance_user_agent text;

comment on column public.quotes.accepted_at is 'Timestamp of the explicit client portal acceptance.';
comment on column public.quotes.accepted_by_user_id is 'Authenticated client user who accepted the quote.';

alter table public.project_time_entries
  add column if not exists entry_source text not null default 'manual',
  add column if not exists started_at timestamptz,
  add column if not exists stopped_at timestamptz,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;

alter table public.project_time_entries
  drop constraint if exists project_time_entries_minutes_check;
alter table public.project_time_entries
  drop constraint if exists project_time_entries_source_check;
alter table public.project_time_entries
  drop constraint if exists project_time_entries_timer_shape_check;

alter table public.project_time_entries
  add constraint project_time_entries_source_check
    check (entry_source in ('manual', 'timer')),
  add constraint project_time_entries_minutes_check
    check (minutes between 0 and 10080),
  add constraint project_time_entries_timer_shape_check
    check (
      (entry_source = 'manual' and minutes between 1 and 1440 and started_at is null and stopped_at is null)
      or
      (entry_source = 'timer' and started_at is not null and created_by_user_id is not null
        and ((stopped_at is null and minutes = 0) or (stopped_at > started_at and minutes between 1 and 10080)))
    );

create unique index if not exists project_time_entries_one_running_per_user
  on public.project_time_entries(organization_id, created_by_user_id)
  where entry_source = 'timer' and stopped_at is null;

create index if not exists project_time_entries_running_project_idx
  on public.project_time_entries(organization_id, project_id, started_at desc)
  where entry_source = 'timer' and stopped_at is null;

create table if not exists public.payment_checkout_sessions (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_session_id text not null,
  checkout_url text not null,
  amount_cents integer not null check (amount_cents between 1 and 500000),
  currency text not null default 'CHF' check (currency = 'CHF'),
  status text not null default 'created' check (status in ('created', 'completed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider, provider_session_id)
);

create unique index if not exists clients_org_id_id_unique on public.clients(organization_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_checkout_sessions_org_invoice_fk') then
    alter table public.payment_checkout_sessions add constraint payment_checkout_sessions_org_invoice_fk
      foreign key (organization_id, invoice_id) references public.invoices(organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_checkout_sessions_org_client_fk') then
    alter table public.payment_checkout_sessions add constraint payment_checkout_sessions_org_client_fk
      foreign key (organization_id, client_id) references public.clients(organization_id, id) on delete cascade;
  end if;
end $$;

create unique index if not exists payment_checkout_sessions_one_active_invoice
  on public.payment_checkout_sessions(organization_id, invoice_id)
  where status = 'created';
create index if not exists payment_checkout_sessions_client_idx
  on public.payment_checkout_sessions(organization_id, client_id, created_at desc);

alter table public.payment_checkout_sessions enable row level security;
revoke all on table public.payment_checkout_sessions from anon, authenticated;
grant all on table public.payment_checkout_sessions to service_role;

comment on table public.payment_checkout_sessions is 'Server-only lifecycle and idempotency log for hosted payment sessions.';
