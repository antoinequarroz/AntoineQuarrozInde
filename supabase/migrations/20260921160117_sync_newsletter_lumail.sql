alter table public.newsletter_subscriptions
  add column lumail_subscriber_id text,
  add column lumail_status text,
  add column lumail_synced_at timestamptz;

create index newsletter_subscriptions_lumail_idx
  on public.newsletter_subscriptions (organization_id, lumail_synced_at desc);

comment on column public.newsletter_subscriptions.lumail_subscriber_id is
  'Identifier returned by Lumail after the server-side subscriber synchronization.';
