-- Instagram is a text review queue, never an automatic publishing target.
alter table public.social_posts drop constraint social_posts_platform_check;
alter table public.social_posts add constraint social_posts_platform_check
  check (platform in ('linkedin', 'x', 'instagram'));
alter table public.social_posts add constraint social_posts_instagram_content_check
  check (platform <> 'instagram' or char_length(content) <= 2200);
alter table public.social_posts drop constraint social_posts_publish_after_check;
alter table public.social_posts add constraint social_posts_publish_after_check
  check (platform = 'instagram' or status not in ('approved', 'publishing') or publish_after is not null);
alter table public.social_posts add constraint social_posts_instagram_manual_check
  check (platform <> 'instagram' or (publish_after is null and status <> 'publishing'));

create or replace function public.claim_social_post(
  p_organization_id uuid, p_post_id uuid, p_expected_version integer
) returns setof public.social_posts
language sql security invoker set search_path = '' as $$
  update public.social_posts
  set status = 'publishing', version = version + 1, updated_at = now(), last_error = null
  where organization_id = p_organization_id and id = p_post_id
    and platform in ('linkedin', 'x') and status = 'approved'
    and publish_after is not null and publish_after <= now()
    and version = p_expected_version
  returning *;
$$;
revoke all on function public.claim_social_post(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_social_post(uuid, uuid, integer) to service_role;

-- One latest, sanitized, dated observation per tenant/account. No tokens here.
create table public.social_insights (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform = 'instagram'),
  account_username text not null check (account_username = 'antoinequarroz.dev'),
  collected_at timestamptz not null,
  received_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (organization_id, platform)
);
alter table public.social_insights enable row level security;
revoke all on table public.social_insights from public, anon, authenticated;
grant select, insert, update, delete on table public.social_insights to service_role;
comment on table public.social_insights is 'Private Instagram observations from the read-only Hermes collector. Missing metrics remain null.';

-- Out-of-order retries cannot replace a newer observation. Tenant is supplied
-- exclusively by the authenticated Hermes server route, not its request body.
create function public.store_instagram_insight(
  p_organization_id uuid, p_collected_at timestamptz, p_snapshot jsonb
) returns void language sql security invoker set search_path = '' as $$
  insert into public.social_insights (organization_id, platform, account_username, collected_at, snapshot)
  values (p_organization_id, 'instagram', 'antoinequarroz.dev', p_collected_at, p_snapshot)
  on conflict (organization_id, platform) do update
    set collected_at = excluded.collected_at, received_at = now(), snapshot = excluded.snapshot
    where public.social_insights.collected_at < excluded.collected_at;
$$;
revoke all on function public.store_instagram_insight(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.store_instagram_insight(uuid, timestamptz, jsonb) to service_role;
