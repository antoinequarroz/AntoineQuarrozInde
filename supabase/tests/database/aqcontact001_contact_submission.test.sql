begin;

select plan(15);

select has_column('public', 'contact_messages', 'submission_id', 'contact messages reserve a stable submission id');
select has_column('public', 'contact_messages', 'payload_fingerprint', 'contact messages keep a server fingerprint');
select has_column('public', 'contact_messages', 'notification_status', 'contact messages expose a closed notification state');

select lives_ok(
  $$ insert into public.contact_messages (submission_id, payload_fingerprint, name, email, subject, message, locale, budget, timeline, notification_status)
     values ('3a165d6c-2d56-4fa8-a4ee-10ee30e5f0a1', repeat('a', 64), 'Test', 'test@example.com', 'Sujet', 'Message', 'fr', null, null, 'pending') $$,
  'minimal contact details remain optional'
);

select throws_ok(
  $$ insert into public.contact_messages (submission_id, payload_fingerprint, name, email, message)
     values ('3a165d6c-2d56-4fa8-a4ee-10ee30e5f0a1', repeat('a', 64), 'Replay', 'replay@example.com', 'Message') $$,
  '23505',
  null,
  'a submission id cannot be reserved twice'
);

select throws_ok(
  $$ insert into public.contact_messages (payload_fingerprint, name, email, message) values ('short', 'Test', 'test@example.com', 'Message') $$,
  '23514', null, 'fingerprints have a fixed length'
);
select throws_ok(
  $$ insert into public.contact_messages (name, email, message, locale) values ('Test', 'test@example.com', 'Message', 'it') $$,
  '23514', null, 'locale is closed'
);
select throws_ok(
  $$ insert into public.contact_messages (name, email, message, budget) values ('Test', 'test@example.com', 'Message', 'unlimited') $$,
  '23514', null, 'budget is closed'
);
select throws_ok(
  $$ insert into public.contact_messages (name, email, message, timeline) values ('Test', 'test@example.com', 'Message', 'tomorrow') $$,
  '23514', null, 'timeline is closed'
);
select throws_ok(
  $$ insert into public.contact_messages (name, email, message, notification_status) values ('Test', 'test@example.com', 'Message', 'delivered') $$,
  '23514', null, 'notification status is closed'
);

select lives_ok(
  $$ insert into public.email_deliveries (organization_id, category, template_key, locale, recipient, entity_type, entity_id, idempotency_key)
     select id, 'transactional', 'contact_notification', 'fr', 'info@antoinequarroz.ch', 'contact_message', '1', 'contact:test' from public.organizations limit 1 $$,
  'contact notifications use the existing tenant delivery register'
);

select ok(
  not has_table_privilege('anon', 'public.contact_messages', 'SELECT')
  and not has_table_privilege('authenticated', 'public.contact_messages', 'SELECT'),
  'contact messages remain server-only'
);
select ok(
  not has_table_privilege('anon', 'public.email_deliveries', 'SELECT')
  and not has_table_privilege('authenticated', 'public.email_deliveries', 'SELECT'),
  'contact notification delivery metadata remains server-only'
);
select ok(
  (select i.indisunique
   from pg_catalog.pg_index i
   join pg_catalog.pg_class idx on idx.oid = i.indexrelid
   join pg_catalog.pg_namespace n on n.oid = idx.relnamespace
   where n.nspname = 'public' and idx.relname = 'contact_messages_submission_uidx'),
  'submission reservation index is unique'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class source on source.oid = c.conrelid
    join pg_catalog.pg_class target on target.oid = c.confrelid
    join pg_catalog.pg_namespace n on n.oid = source.relnamespace
    where n.nspname = 'public'
      and source.relname = 'contact_messages'
      and target.relname = 'clients'
      and c.conname = 'contact_messages_client_tenant_fk'
      and c.contype = 'f'
  ),
  'contact client relation is tenant-safe'
);

select * from finish();
rollback;
