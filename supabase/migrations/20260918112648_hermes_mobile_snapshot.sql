-- Only trusted server routes can access these tables. The browser never sees a device token hash.
create table public.hermes_mobile_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index hermes_mobile_devices_organization_idx
  on public.hermes_mobile_devices (organization_id, created_at desc);
create unique index hermes_mobile_devices_one_active_writer_idx
  on public.hermes_mobile_devices (organization_id) where revoked_at is null;

create table public.hermes_mobile_snapshots (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  device_id uuid not null references public.hermes_mobile_devices(id),
  revision bigint not null default 1 check (revision > 0),
  source_fetched_at timestamptz,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.hermes_mobile_devices enable row level security;
alter table public.hermes_mobile_snapshots enable row level security;
revoke all on public.hermes_mobile_devices, public.hermes_mobile_snapshots from anon, authenticated;
grant select, insert, update, delete on public.hermes_mobile_devices, public.hermes_mobile_snapshots to service_role;
