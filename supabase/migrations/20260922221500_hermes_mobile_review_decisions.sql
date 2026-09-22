-- Mobile review decisions are requests for the Mac cockpit. They never publish
-- content and are applied only when the review version still matches.
create table public.hermes_mobile_review_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_id uuid references public.hermes_mobile_devices(id),
  review_id text not null check (char_length(review_id) between 1 and 180),
  expected_revision bigint not null check (expected_revision > 0),
  expected_digest text not null check (expected_digest ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('reviewed', 'changesRequested', 'later')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  constraint hermes_mobile_review_decisions_handled_check check (
    (status = 'pending' and handled_at is null)
    or (status <> 'pending' and handled_at is not null)
  )
);

create index hermes_mobile_review_decisions_pending_idx
  on public.hermes_mobile_review_decisions (organization_id, created_at)
  where status = 'pending';

create unique index hermes_mobile_review_decisions_one_pending_idx
  on public.hermes_mobile_review_decisions (organization_id, review_id)
  where status = 'pending';

alter table public.hermes_mobile_review_decisions enable row level security;
revoke all on public.hermes_mobile_review_decisions from anon, authenticated;
grant select, insert, update, delete on public.hermes_mobile_review_decisions to service_role;
