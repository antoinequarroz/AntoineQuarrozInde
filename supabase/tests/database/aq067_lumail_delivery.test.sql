begin;

select plan(10);

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

select * from finish();
rollback;
