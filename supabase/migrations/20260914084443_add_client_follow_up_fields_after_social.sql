alter table public.clients
  add column if not exists next_follow_up_at date,
  add column if not exists follow_up_note text,
  add column if not exists last_contacted_at timestamptz;

alter table public.clients
  add constraint clients_follow_up_note_length_check
  check (follow_up_note is null or char_length(follow_up_note) <= 500);

create index if not exists clients_organization_next_follow_up_idx
  on public.clients (organization_id, next_follow_up_at)
  where next_follow_up_at is not null and status = 'lead';

comment on column public.clients.next_follow_up_at is
  'Next explicit commercial follow-up date for this client or prospect.';
comment on column public.clients.follow_up_note is
  'Internal bounded context for the next commercial follow-up; never copied directly to outbound email.';
comment on column public.clients.last_contacted_at is
  'Timestamp of the latest confirmed commercial contact.';
