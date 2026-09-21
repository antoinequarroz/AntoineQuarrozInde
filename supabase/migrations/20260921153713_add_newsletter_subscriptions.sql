create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'de')),
  source_path text not null check (
    source_path like '/blog/%'
    and char_length(source_path) between 7 and 500
  ),
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index newsletter_subscriptions_admin_idx
  on public.newsletter_subscriptions (organization_id, status, consented_at desc);

alter table public.newsletter_subscriptions enable row level security;

revoke all on table public.newsletter_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.newsletter_subscriptions to service_role;

comment on table public.newsletter_subscriptions is
  'Server-only record of explicit newsletter consent collected below public blog articles.';
