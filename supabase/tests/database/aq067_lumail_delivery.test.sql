begin;

select plan(18);

select has_column('public', 'clients', 'preferred_locale', 'clients store a preferred commercial locale');
select has_column('public', 'clients', 'marketing_opt_out_at', 'clients store the marketing opt-out timestamp');
select has_table('public', 'email_deliveries', 'the tenant delivery register exists');
select has_table('public', 'email_delivery_settings', 'organization reminder settings exist');

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.email_deliveries'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.email_delivery_settings'::regclass),
  'delivery tables have row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.email_deliveries', 'SELECT')
  and not has_table_privilege('authenticated', 'public.email_deliveries', 'SELECT')
  and not has_table_privilege('anon', 'public.email_delivery_settings', 'SELECT')
  and not has_table_privilege('authenticated', 'public.email_delivery_settings', 'SELECT'),
  'browser roles cannot read server-only delivery metadata'
);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000009067', 'AQ-067 tenant', 'aq-067-tenant');

insert into public.clients (organization_id, name, email)
values ('00000000-0000-0000-0000-000000009067', 'Test client', 'client@example.test');

insert into public.email_deliveries (organization_id, client_id, category, template_key, locale, recipient, entity_type, entity_id, idempotency_key)
select '00000000-0000-0000-0000-000000009067', id, 'transactional', 'quote_available', 'fr', email, 'quote', '42', 'quote:42'
from public.clients where organization_id = '00000000-0000-0000-0000-000000009067';

select throws_ok(
  $$ insert into public.email_deliveries (organization_id, category, template_key, locale, recipient, idempotency_key)
     values ('00000000-0000-0000-0000-000000009067', 'transactional', 'quote_available', 'fr', 'client@example.test', 'quote:42') $$,
  '23505', null, 'an idempotency key is unique inside its tenant'
);

select throws_ok(
  $$ insert into public.email_deliveries (organization_id, category, template_key, locale, recipient, idempotency_key)
     values ('00000000-0000-0000-0000-000000009067', 'secret', 'quote_available', 'fr', 'client@example.test', 'invalid-category') $$,
  '23514', null, 'delivery categories are closed'
);

select throws_ok(
  $$ insert into public.email_delivery_settings (organization_id, quote_offsets, invoice_offsets)
     values ('00000000-0000-0000-0000-000000009067', array[99], array[0]) $$,
  '23514', null, 'unsafe reminder offsets are rejected'
);

select is(
  (select preferred_locale from public.clients where organization_id = '00000000-0000-0000-0000-000000009067' limit 1),
  'fr', 'French is the explicit locale fallback'
);

select has_function(
  'public', 'claim_email_reminder_delivery', array['uuid', 'bigint', 'boolean', 'date'],
  'the database exposes the atomic reminder claim boundary'
);

select ok(
  not has_function_privilege('anon', 'public.claim_email_reminder_delivery(uuid,bigint,boolean,date)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_email_reminder_delivery(uuid,bigint,boolean,date)', 'EXECUTE'),
  'browser roles cannot claim reminder deliveries'
);

insert into public.quotes (
  organization_id, client_id, number, title, amount_cents, currency, status,
  issued_at, valid_until, subtotal_cents, tax_cents, total_cents
)
select
  '00000000-0000-0000-0000-000000009067', id, 'DEV-AQ067', 'Atomic reminder',
  1000, 'CHF', 'sent', current_date, current_date + 3, 1000, 0, 1000
from public.clients where organization_id = '00000000-0000-0000-0000-000000009067';

insert into public.email_deliveries (
  organization_id, client_id, category, template_key, locale, recipient,
  entity_type, entity_id, idempotency_key
)
select
  q.organization_id, q.client_id, 'transactional', 'quote_reminder', 'fr', c.email,
  'quote', q.id::text, 'quote:atomic-before-cancel'
from public.quotes q
join public.clients c on c.organization_id = q.organization_id and c.id = q.client_id
where q.organization_id = '00000000-0000-0000-0000-000000009067' and q.number = 'DEV-AQ067';

select is(
  public.claim_email_reminder_delivery(
    '00000000-0000-0000-0000-000000009067',
    (select id from public.email_deliveries where idempotency_key = 'quote:atomic-before-cancel'),
    false,
    current_date + 3
  ),
  'claimed',
  'an eligible reminder is claimed at the linearization boundary'
);

select ok(
  (select send_claimed_at is not null and status = 'pending'
   from public.email_deliveries where idempotency_key = 'quote:atomic-before-cancel'),
  'the successful claim records when the provider send became logically engaged'
);

update public.email_deliveries
set status = 'failed', error_code = 'provider_rejected'
where idempotency_key = 'quote:atomic-before-cancel';

select is(
  public.claim_email_reminder_delivery(
    '00000000-0000-0000-0000-000000009067',
    (select id from public.email_deliveries where idempotency_key = 'quote:atomic-before-cancel'),
    true,
    null
  ),
  'claimed',
  'a retry uses the same eligibility and claim boundary'
);

select is(
  (select attempt_count from public.email_deliveries where idempotency_key = 'quote:atomic-before-cancel'),
  2::smallint,
  'the atomic retry claim increments the attempt count once'
);

update public.quotes set status = 'rejected'
where organization_id = '00000000-0000-0000-0000-000000009067' and number = 'DEV-AQ067';

insert into public.email_deliveries (
  organization_id, client_id, category, template_key, locale, recipient,
  entity_type, entity_id, idempotency_key
)
select
  q.organization_id, q.client_id, 'transactional', 'quote_reminder', 'fr', c.email,
  'quote', q.id::text, 'quote:cancel-before-atomic'
from public.quotes q
join public.clients c on c.organization_id = q.organization_id and c.id = q.client_id
where q.organization_id = '00000000-0000-0000-0000-000000009067' and q.number = 'DEV-AQ067';

select is(
  public.claim_email_reminder_delivery(
    '00000000-0000-0000-0000-000000009067',
    (select id from public.email_deliveries where idempotency_key = 'quote:cancel-before-atomic'),
    false,
    current_date + 3
  ),
  'ineligible',
  'a cancellation committed before the claim prevents the provider send'
);

select is(
  (select status from public.email_deliveries where idempotency_key = 'quote:cancel-before-atomic'),
  'suppressed',
  'an ineligible atomic claim is audited as suppressed'
);

select * from finish();
rollback;
