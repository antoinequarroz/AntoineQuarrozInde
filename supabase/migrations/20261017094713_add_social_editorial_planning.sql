-- ANT-39: editorial intent never grants consent to publish.
-- No backfill: existing schedules, content, statuses and approvals are preserved.
alter table public.social_posts add column planned_at timestamptz;
comment on column public.social_posts.planned_at is
  'Editorial planning only. Publication still requires explicit approval and publish_after.';

create index social_posts_editorial_plan_idx
  on public.social_posts (organization_id, planned_at, id)
  where planned_at is not null;
