create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'x')),
  source_key text not null check (char_length(source_key) between 1 and 180),
  article_title text not null check (char_length(article_title) between 1 and 180),
  article_url text not null check (
    article_url like 'https://www.antoinequarroz.ch/blog/%'
    and char_length(article_url) <= 500
  ),
  content text not null check (
    char_length(content) between 1 and 3000
    and (platform <> 'x' or char_length(content) <= 280)
  ),
  source_path text check (
    source_path is null
    or source_path ~ '^seo/social/a-valider/[A-Za-z0-9._/-]+\\.md$'
  ),
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'publishing', 'published', 'rejected', 'failed')
  ),
  external_post_id text,
  external_post_url text,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  published_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform, source_key)
);

create index social_posts_review_queue_idx
  on public.social_posts (organization_id, status, created_at desc);

create table public.social_platform_connections (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'x')),
  state text not null check (state in ('ready', 'blocked', 'unknown')),
  message text not null check (char_length(message) between 1 and 300),
  checked_at timestamptz not null default now(),
  last_success_at timestamptz,
  primary key (organization_id, platform)
);

alter table public.social_posts enable row level security;
alter table public.social_platform_connections enable row level security;

revoke all on table public.social_posts from public, anon, authenticated;
revoke all on table public.social_platform_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.social_posts to service_role;
grant select, insert, update, delete on table public.social_platform_connections to service_role;

create or replace function public.claim_social_post(
  p_organization_id uuid,
  p_post_id uuid,
  p_expected_version integer
)
returns setof public.social_posts
language sql
security invoker
set search_path = ''
as $$
  update public.social_posts
  set status = 'publishing',
      version = version + 1,
      updated_at = now(),
      last_error = null
  where organization_id = p_organization_id
    and id = p_post_id
    and status = 'approved'
    and version = p_expected_version
  returning *;
$$;

revoke all on function public.claim_social_post(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_social_post(uuid, uuid, integer) to service_role;

comment on table public.social_posts is
  'Server-only validation queue. Platform credentials remain in Hermes and are never stored here.';
