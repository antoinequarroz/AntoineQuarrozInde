begin;

select plan(6);

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'hermes_mobile_devices')
  and (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'hermes_mobile_snapshots'),
  'both mobile sharing tables require row-level security'
);

select ok(
  not has_table_privilege('anon', 'public.hermes_mobile_devices', 'SELECT')
  and not has_table_privilege('authenticated', 'public.hermes_mobile_devices', 'SELECT')
  and not has_table_privilege('anon', 'public.hermes_mobile_snapshots', 'SELECT')
  and not has_table_privilege('authenticated', 'public.hermes_mobile_snapshots', 'SELECT')
  and has_table_privilege('service_role', 'public.hermes_mobile_snapshots', 'SELECT'),
  'phone snapshots and device hashes are available only through trusted server routes'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'hermes_mobile_devices_one_active_writer_idx'),
  'one active Mac writer is enforced per organization'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'hermes_mobile_snapshots_revision_check')
  and exists (select 1 from pg_constraint where conname = 'hermes_mobile_devices_token_hash_check'),
  'revisions and stored device hashes are constrained by the database'
);

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'hermes_mobile_review_decisions')
  and not has_table_privilege('anon', 'public.hermes_mobile_review_decisions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.hermes_mobile_review_decisions', 'SELECT'),
  'mobile review decisions are available only through trusted server routes'
);

select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'hermes_mobile_review_decisions_one_pending_idx')
  and exists (select 1 from pg_constraint where conname = 'hermes_mobile_review_decisions_handled_check'),
  'one pending decision per review and coherent receipts are enforced'
);

select * from finish();
rollback;
