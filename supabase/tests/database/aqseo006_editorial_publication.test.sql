begin;

select plan(42);

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-0000-0000-000000000601', 'AQ SEO Editorial A', 'aq-seo-editorial-a'),
  ('00000000-0000-0000-0000-000000000602', 'AQ SEO Editorial B', 'aq-seo-editorial-b');

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_article_with_publication_audit'
      and not p.prosecdef
  ),
  'the atomic article save function is security invoker'
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
  )
  and has_function_privilege(
    'service_role',
    'public.maintain_article_editorial_timestamps()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.maintain_article_editorial_timestamps()',
    'EXECUTE'
  ),
  'only the service role can execute the article save and timestamp functions'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles'
      and column_name = 'published_at' and data_type = 'timestamp with time zone'
      and is_nullable = 'YES'
  )
  and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles'
      and column_name = 'updated_at' and data_type = 'timestamp with time zone'
      and is_nullable = 'NO'
  ),
  'articles expose nullable publication and required modification timestamps'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'case_study_published_at' and data_type = 'timestamp with time zone'
      and is_nullable = 'YES'
  )
  and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects'
      and column_name = 'updated_at' and data_type = 'timestamp with time zone'
      and is_nullable = 'NO'
  ),
  'projects expose nullable case-study publication and required modification timestamps'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'set_article_editorial_timestamps'
      and tgrelid = 'public.articles'::regclass
      and not tgisinternal
  )
  and exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'set_project_editorial_timestamps'
      and tgrelid = 'public.projects'::regclass
      and not tgisinternal
  ),
  'article and project dates are maintained at the database source'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'enforce_article_publication_audit'
      and tgrelid = 'public.articles'::regclass
      and not tgisinternal
  ),
  'article publication transitions are protected by a database trigger'
);

select throws_ok(
  $$
    insert into public.articles (
      organization_id, title, slug, excerpt, content, published, tags, read_time
    ) values (
      '00000000-0000-0000-0000-000000000601', 'Legacy public article',
      'aqseo006-legacy-public', 'Legacy excerpt', 'Legacy content', true, '{}', 5
    )
  $$,
  '42501',
  'article_publication_requires_audited_rpc',
  'a previous application image cannot create a public article directly'
);

select is(
  (select count(*) from public.articles where slug = 'aqseo006-legacy-public'),
  0::bigint,
  'a refused legacy public creation leaves no article behind'
);

select lives_ok(
  $$
    insert into public.articles (
      organization_id, title, slug, excerpt, content, published, tags, read_time
    ) values (
      '00000000-0000-0000-0000-000000000601', 'Legacy private article',
      'aqseo006-legacy-private', 'Legacy excerpt', 'Legacy content', false, '{}', 5
    )
  $$,
  'a previous application image can still create a private draft directly'
);

select matches(
  lower(pg_get_functiondef('public.save_article_with_publication_audit(uuid,bigint,uuid,text,jsonb)'::regprocedure)),
  'for update',
  'article updates lock the organization-scoped row before authorization and save'
);

select lives_ok(
  $$
    set local role service_role;
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601', null, null, 'manager',
      '{
        "title":"Private article",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content",
        "published":false,
        "tags":[],
        "read_time":5
      }'::jsonb
    );
    reset role
  $$,
  'the service role can create a private article for a manager'
);

select is(
  (select published_at from public.articles where slug = 'aqseo006-private'),
  null::timestamptz,
  'a private article has no publication date'
);

select is(
  (select updated_at from public.articles where slug = 'aqseo006-private'),
  (select created_at from public.articles where slug = 'aqseo006-private'),
  'a new private article starts with a stable modification date'
);

select is(
  (
    select payload from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000601'
      and action = 'article.publication_changed'
    order by id desc limit 1
  ),
  '{"after":{"authorKey":"antoine-quarroz","published":false},"before":null}'::jsonb,
  'private creation records its exact initial publication state'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601', null, null, 'manager',
      '{
        "title":"Forbidden public article",
        "slug":"aqseo006-forbidden-public",
        "excerpt":"Forbidden excerpt",
        "content":"Forbidden content",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '42501',
  'article_publication_forbidden',
  'a manager cannot create a public article'
);

select is(
  (select count(*) from public.articles where slug = 'aqseo006-forbidden-public'),
  0::bigint,
  'a forbidden public creation leaves no article behind'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601', null, null, null,
      '{
        "title":"Null role public article",
        "slug":"aqseo006-null-role-public",
        "excerpt":"Forbidden excerpt",
        "content":"Forbidden content",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '42501',
  'article_publication_forbidden',
  'a missing role fails closed when creating a public article'
);

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601', null, null, 'owner',
      '{
        "title":"Public article",
        "slug":"aqseo006-public",
        "excerpt":"Public excerpt",
        "content":"Public content",
        "published":true,
        "tags":["seo"],
        "read_time":6
      }'::jsonb
    )
  $$,
  'an owner can create a public article atomically'
);

select is(
  (select published_at from public.articles where slug = 'aqseo006-public'),
  (select created_at from public.articles where slug = 'aqseo006-public'),
  'a public article creation uses its real creation date as publication date'
);

select is(
  (select updated_at from public.articles where slug = 'aqseo006-public'),
  (select created_at from public.articles where slug = 'aqseo006-public'),
  'a public article creation uses its real creation date as modification date'
);

select is(
  (
    select payload from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000601'
      and entity_id = (select id::text from public.articles where slug = 'aqseo006-public')
    order by id desc limit 1
  ),
  '{"after":{"authorKey":"antoine-quarroz","published":true},"before":null}'::jsonb,
  'public creation records its exact initial publication state'
);

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'manager',
      '{
        "title":"Private article edited",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content edited",
        "published":false,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'a manager can edit content without changing its private state'
);

select ok(
  (select title = 'Private article edited' and updated_at > created_at
   from public.articles where slug = 'aqseo006-private'),
  'a private content edit is saved and maintains its modification date'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'manager',
      '{
        "title":"Manager publication attempt",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '42501',
  'article_publication_forbidden',
  'a manager cannot publish an existing article'
);

select ok(
  (select not published and title = 'Private article edited'
   from public.articles where slug = 'aqseo006-private'),
  'a refused manager transition leaves content and publication unchanged'
);

select throws_ok(
  $$
    update public.articles
    set published = true
    where slug = 'aqseo006-private'
  $$,
  '42501',
  'article_publication_requires_audited_rpc',
  'a previous application image cannot publish an article directly'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, null,
      '{
        "title":"Null role publication attempt",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '42501',
  'article_publication_forbidden',
  'a missing role fails closed when publishing an existing article'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000602',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'owner',
      '{
        "title":"Cross organization attempt",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'P0002',
  'article_not_found',
  'an article cannot be changed through another organization'
);

select throws_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      '00000000-0000-0000-0000-000000000699', 'admin',
      '{
        "title":"Must roll back",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Must roll back",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  '23503',
  'insert or update on table "audit_logs" violates foreign key constraint "audit_logs_actor_user_id_fkey"',
  'an audit failure rejects the complete article publication transaction'
);

select ok(
  (select not published and title = 'Private article edited'
   from public.articles where slug = 'aqseo006-private'),
  'content and publication both roll back when the audit insert fails'
);

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'admin',
      '{
        "title":"Private article edited",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Private content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'an administrator can perform the first publication'
);

select ok(
  (select published and published_at is not null and updated_at >= published_at
   from public.articles where slug = 'aqseo006-private'),
  'first publication records stable publication and modification dates'
);

select is(
  (
    select payload from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000601'
      and entity_id = (select id::text from public.articles where slug = 'aqseo006-private')
    order by id desc limit 1
  ),
  '{"after":{"authorKey":"antoine-quarroz","published":true},"before":{"authorKey":"antoine-quarroz","published":false}}'::jsonb,
  'first publication records exact before and after states'
);

create temporary table aqseo006_dates as
select id, published_at, updated_at
from public.articles
where slug = 'aqseo006-private';

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'manager',
      '{
        "title":"Published content edited",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Published content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'a manager can modify already-published content without changing visibility'
);

select ok(
  (
    select a.published_at = d.published_at and a.updated_at > d.updated_at
    from public.articles a
    join aqseo006_dates d using (id)
  ),
  'content modification preserves publication date and advances modification date'
);

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'owner',
      '{
        "title":"Published content edited",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Published content edited",
        "published":false,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'an owner can unpublish an article'
);

select ok(
  (select not published and published_at is null
   from public.articles where slug = 'aqseo006-private'),
  'unpublication clears the current publication timestamp'
);

select lives_ok(
  $$
    select public.save_article_with_publication_audit(
      '00000000-0000-0000-0000-000000000601',
      (select id from public.articles where slug = 'aqseo006-private'),
      null, 'admin',
      '{
        "title":"Published content edited",
        "slug":"aqseo006-private",
        "excerpt":"Private excerpt",
        "content":"Published content edited",
        "published":true,
        "tags":[],
        "read_time":5
      }'::jsonb
    )
  $$,
  'an administrator can republish an article'
);

select ok(
  (
    select a.published and a.published_at is not null
      and a.published_at >= d.published_at
    from public.articles a
    join aqseo006_dates d using (id)
  ),
  'republication records the start of the current publication period'
);

select is(
  (
    select payload from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000601'
      and entity_id = (select id::text from public.articles where slug = 'aqseo006-private')
    order by id desc limit 1
  ),
  '{"after":{"authorKey":"antoine-quarroz","published":true},"before":{"authorKey":"antoine-quarroz","published":false}}'::jsonb,
  'republication records its exact previous and next states'
);

insert into public.projects (
  organization_id, title, slug, category, description, case_study_published,
  created_at
) values (
  '00000000-0000-0000-0000-000000000601', 'Timestamp project',
  'aqseo006-project', 'web', 'Project description', false,
  '2025-01-02 03:04:05+00'
);

select ok(
  (
    select updated_at = created_at and case_study_published_at is null
    from public.projects where slug = 'aqseo006-project'
  ),
  'a private historical project keeps created_at as its stable initial date'
);

update public.projects
set case_study_published = true
where slug = 'aqseo006-project';

select ok(
  (
    select updated_at > created_at and case_study_published_at is not null
    from public.projects where slug = 'aqseo006-project'
  ),
  'project case-study publication dates are maintained at the source'
);

select * from finish();
rollback;
