begin;

select plan(6);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000801', 'AQ Newsletter', 'aq-newsletter');

select ok(
  exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'newsletter_subscriptions'
      and c.relrowsecurity
  ),
  'newsletter subscriptions use row level security'
);

select ok(
  not has_table_privilege('anon', 'public.newsletter_subscriptions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.newsletter_subscriptions', 'SELECT')
  and not has_table_privilege('anon', 'public.newsletter_subscriptions', 'INSERT')
  and has_table_privilege('service_role', 'public.newsletter_subscriptions', 'SELECT')
  and has_table_privilege('service_role', 'public.newsletter_subscriptions', 'INSERT'),
  'the newsletter list is server-only'
);

select lives_ok(
  $$
    insert into public.newsletter_subscriptions (organization_id, email, source_path)
    values ('00000000-0000-0000-0000-000000000801', 'reader@example.com', '/blog/example')
  $$,
  'an explicit blog subscription is accepted'
);

select throws_ok(
  $$
    insert into public.newsletter_subscriptions (organization_id, email, source_path)
    values ('00000000-0000-0000-0000-000000000801', 'Reader@Example.com', '/blog/example')
  $$,
  '23514',
  null,
  'email addresses must already be normalized'
);

select throws_ok(
  $$
    insert into public.newsletter_subscriptions (organization_id, email, source_path)
    values ('00000000-0000-0000-0000-000000000801', 'other@example.com', '/admin')
  $$,
  '23514',
  null,
  'subscriptions must identify a blog source'
);

select throws_ok(
  $$
    insert into public.newsletter_subscriptions (organization_id, email, source_path)
    values ('00000000-0000-0000-0000-000000000801', 'reader@example.com', '/blog/other')
  $$,
  '23505',
  null,
  'an address is unique within an organization'
);

select * from finish();
rollback;
