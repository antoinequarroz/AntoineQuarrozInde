create table if not exists public.admin_saved_views (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, resource, name)
);

create index if not exists idx_admin_saved_views_org_user_resource
  on public.admin_saved_views(organization_id, user_id, resource);

alter table public.admin_saved_views enable row level security;
