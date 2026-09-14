begin;

select plan(6);

select ok(
  exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'social_posts' and c.relrowsecurity),
  'social_posts exists with row level security enabled'
);

select ok(
  exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'social_platform_connections' and c.relrowsecurity),
  'social platform readiness exists with row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.social_posts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.social_posts', 'SELECT')
  and has_table_privilege('service_role', 'public.social_posts', 'SELECT'),
  'the social queue is server-only'
);

select ok(
  not has_table_privilege('anon', 'public.social_platform_connections', 'SELECT')
  and not has_table_privilege('authenticated', 'public.social_platform_connections', 'SELECT'),
  'platform readiness is server-only'
);

select ok(
  not has_function_privilege('anon', 'public.claim_social_post(uuid,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_social_post(uuid,uuid,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_social_post(uuid,uuid,integer)', 'EXECUTE'),
  'only the service role can claim a post'
);

select ok(
  exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'claim_social_post' and not p.prosecdef),
  'the claim function remains security invoker'
);

select * from finish();
rollback;
