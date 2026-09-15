alter table public.contact_messages
  add column if not exists submission_id uuid,
  add column if not exists payload_fingerprint text,
  add column if not exists client_id bigint,
  add column if not exists locale text,
  add column if not exists budget text,
  add column if not exists timeline text,
  add column if not exists notification_status text,
  add column if not exists notification_provider_id text,
  add column if not exists notification_error_code text;

alter table public.contact_messages
  drop constraint if exists contact_messages_payload_fingerprint_check,
  add constraint contact_messages_payload_fingerprint_check
    check (payload_fingerprint is null or length(payload_fingerprint) = 64),
  drop constraint if exists contact_messages_locale_check,
  add constraint contact_messages_locale_check
    check (locale is null or locale in ('fr', 'en', 'de')),
  drop constraint if exists contact_messages_budget_check,
  add constraint contact_messages_budget_check
    check (budget is null or budget in ('<2k', '2k-5k', '5k-10k', '10k+')),
  drop constraint if exists contact_messages_timeline_check,
  add constraint contact_messages_timeline_check
    check (timeline is null or timeline in ('urgent', '1mois', '2-3mois', 'flexible')),
  drop constraint if exists contact_messages_notification_status_check,
  add constraint contact_messages_notification_status_check
    check (notification_status is null or notification_status in ('pending', 'sent', 'failed', 'uncertain')),
  drop constraint if exists contact_messages_notification_error_code_check,
  add constraint contact_messages_notification_error_code_check
    check (notification_error_code is null or notification_error_code in ('not_configured', 'invalid_recipient', 'provider_rejected', 'network_error', 'timeout_ambiguous', 'unknown')),
  drop constraint if exists contact_messages_client_tenant_fk,
  add constraint contact_messages_client_tenant_fk
    foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
    on delete set null (client_id),
  drop constraint if exists contact_messages_client_requires_org_check,
  add constraint contact_messages_client_requires_org_check
    check (client_id is null or organization_id is not null);

create unique index if not exists contact_messages_submission_uidx
  on public.contact_messages(submission_id)
  where submission_id is not null;

create index if not exists contact_messages_org_notification_idx
  on public.contact_messages(organization_id, notification_status, created_at desc);

alter table public.email_deliveries
  drop constraint if exists email_deliveries_template_key_check,
  add constraint email_deliveries_template_key_check
    check (template_key in ('quote_available', 'invoice_available', 'payment_received', 'quote_reminder', 'invoice_reminder', 'contact_notification')),
  drop constraint if exists email_deliveries_entity_type_check,
  add constraint email_deliveries_entity_type_check
    check (entity_type is null or entity_type in ('quote', 'invoice', 'payment', 'contact_message'));

comment on column public.contact_messages.submission_id is 'Browser-generated UUID used only to make a public contact submission idempotent.';
comment on column public.contact_messages.payload_fingerprint is 'Server-side SHA-256 used to reject UUID reuse with different contact content.';
comment on column public.contact_messages.notification_status is 'Closed Lumail notification state; the provider response body is never stored.';
