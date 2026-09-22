alter table public.social_posts
  add column if not exists publish_after timestamptz;

-- Existing approved items must not become immediately publishable during the
-- rollout. Put them on the next 18:00 Europe/Zurich boundary instead.
update public.social_posts
set publish_after = case
  when (now() at time zone 'Europe/Zurich')::time < time '18:00'
    then (((now() at time zone 'Europe/Zurich')::date + time '18:00') at time zone 'Europe/Zurich')
  else ((((now() at time zone 'Europe/Zurich')::date + 1) + time '18:00') at time zone 'Europe/Zurich')
end
where status in ('approved', 'publishing')
  and publish_after is null;

alter table public.social_posts
  drop constraint if exists social_posts_publish_after_check;

alter table public.social_posts
  add constraint social_posts_publish_after_check check (
    status not in ('approved', 'publishing') or publish_after is not null
  );

create index if not exists social_posts_due_publication_idx
  on public.social_posts (organization_id, publish_after, created_at)
  where status = 'approved';

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
    and publish_after is not null
    and publish_after <= now()
    and version = p_expected_version
  returning *;
$$;
