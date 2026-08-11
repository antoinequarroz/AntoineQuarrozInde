alter table public.clients
  add column if not exists portal_user_id uuid references auth.users(id) on delete set null,
  add column if not exists portal_invited_at timestamptz,
  add column if not exists portal_activated_at timestamptz,
  add column if not exists portal_access_disabled_at timestamptz;

create unique index if not exists clients_organization_portal_user_uidx
  on public.clients (organization_id, portal_user_id)
  where portal_user_id is not null;

create index if not exists clients_portal_access_status_idx
  on public.clients (organization_id, portal_access_disabled_at, portal_invited_at);

comment on column public.clients.portal_user_id is 'Server-managed link to the Supabase Auth identity allowed to use this client portal.';
comment on column public.clients.portal_invited_at is 'Timestamp of the latest portal invitation or recovery email requested by an administrator.';
comment on column public.clients.portal_activated_at is 'Timestamp when the client completed portal password setup or first authenticated access.';
comment on column public.clients.portal_access_disabled_at is 'When set, organization membership and portal access are disabled without deleting the Auth identity.';
