begin;

select plan(14);

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-0000-0000-000000000901', 'AQ SEO Attribution A', 'aq-seo-attribution-a'),
  ('00000000-0000-0000-0000-000000000902', 'AQ SEO Attribution B', 'aq-seo-attribution-b');

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'articles'
      and column_name = 'author_key'
      and is_nullable = 'NO'
      and column_default = '''antoine-quarroz''::text'
  ),
  'articles require the canonical author key by default'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'articles_author_key_approved'
      and conrelid = 'public.articles'::regclass
      and contype = 'c'
  ),
  'the approved author is protected by a database constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_article_with_publication_audit'
      and not p.prosecdef
  ),
  'the article save function remains security invoker'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_article_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.save_article_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.save_article_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  ),
  'the audited save remains callable only by the service role'
);

select lives_ok(
  $$
    set local role service_role;
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000901', null, null, 'manager',
      '{
        "title":"Legacy draft",
        "slug":"aqseo009-legacy-draft",
        "excerpt":"Legacy excerpt",
        "content":"Legacy content",
        "published":false,
        "tags":[],
        "read_time":5
      }'::jsonb
    );
    reset role
  $$,
  'a previous application image can still create a draft without author_key'
);

select is(
  (select author_key from public.articles where slug = 'aqseo009-legacy-draft'),
  'antoine-quarroz',
  'a legacy creation receives the canonical author'
);

select lives_ok(
  $$
    set local role service_role;
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000901', null, null, 'owner',
      '{
        "title":"Attributed article",
        "slug":"aqseo009-attributed",
        "excerpt":"Attributed excerpt",
        "content":"Attributed content",
        "published":true,
        "author_key":"antoine-quarroz",
        "tags":[],
        "read_time":5
      }'::jsonb
    );
    reset role
  $$,
  'an owner can publish an article with the approved author'
);

select ok(
  (select published_at is not null and updated_at >= published_at
   from public.articles where slug = 'aqseo009-attributed'),
  'a published attributed article has reliable editorial dates'
);

select is(
  (
    select payload
    from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000901'
      and entity_id = (select id::text from public.articles where slug = 'aqseo009-attributed')
    order by id desc
    limit 1
  ),
  '{"after":{"authorKey":"antoine-quarroz","published":true},"before":null}'::jsonb,
  'publication audit records the approved author'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000901', null, null, 'owner',
      '{
        "title":"Unknown author",
        "slug":"aqseo009-unknown-author",
        "excerpt":"Unknown excerpt",
        "content":"Unknown content",
        "published":true,
        "author_key":"unknown",
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '23514',
  'new row for relation "articles" violates check constraint "articles_author_key_approved"',
  'an unapproved author cannot be persisted'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000901', null, null, 'owner',
      '{
        "title":"Missing author",
        "slug":"aqseo009-missing-author",
        "excerpt":"Missing excerpt",
        "content":"Missing content",
        "published":true,
        "author_key":null,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '23502',
  'null value in column "author_key" of relation "articles" violates not-null constraint',
  'an explicitly missing author cannot be persisted'
);

select lives_ok(
  $$
    set local role service_role;
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000901',
      (select id from public.articles where slug = 'aqseo009-legacy-draft'),
      null, 'manager',
      '{
        "title":"Legacy draft updated",
        "slug":"aqseo009-legacy-draft",
        "excerpt":"Legacy excerpt",
        "content":"Legacy content updated",
        "published":false,
        "tags":[],
        "read_time":5
      }'::jsonb
    );
    reset role
  $$,
  'a previous application image can update a draft without author_key'
);

select is(
  (select author_key from public.articles where slug = 'aqseo009-legacy-draft'),
  'antoine-quarroz',
  'a legacy update preserves the existing author'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000902',
      (select id from public.articles where slug = 'aqseo009-attributed'),
      null, 'owner',
      '{
        "title":"Cross tenant",
        "slug":"aqseo009-attributed",
        "excerpt":"Cross tenant",
        "content":"Cross tenant",
        "published":true,
        "author_key":"antoine-quarroz",
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'P0002',
  'article_not_found',
  'an article cannot be updated through another organization'
);

select * from finish();

rollback;
