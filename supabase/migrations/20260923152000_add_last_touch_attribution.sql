alter table public.contact_messages
  add column if not exists last_landing_path text,
  add column if not exists last_referrer_host text,
  add column if not exists last_utm_source text,
  add column if not exists last_utm_medium text,
  add column if not exists last_utm_campaign text,
  add column if not exists last_utm_content text,
  add column if not exists last_utm_term text;

alter table public.clients
  add column if not exists last_acquisition_source text,
  add column if not exists last_acquisition_medium text,
  add column if not exists last_acquisition_campaign text;

create index if not exists contact_messages_last_attribution_idx
  on public.contact_messages(organization_id, last_utm_source, created_at desc);
