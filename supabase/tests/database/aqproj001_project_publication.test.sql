begin;

select plan(12);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000101', 'AQ Project Publication', 'aq-project-publication');

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_project_with_publication_audit'
      and not p.prosecdef
  ),
  'the atomic project save function is security invoker'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_project_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.save_project_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.save_project_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  ),
  'only the service role can execute the atomic project save function'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'portfolio_visible'
      and is_nullable = 'NO'
      and column_default = 'false'
  ),
  'the activation release makes new portfolio entries private by default'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      null,
      null,
      'manager',
      '{
        "title":"Private project",
        "slug":"aqproj001-private",
        "category":"web",
        "tags":[],
        "description":"Private description",
        "image":"https://example.com/private.jpg",
        "live_url":"https://example.com/private",
        "featured":false,
        "portfolio_visible":false,
        "case_study_published":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  'a manager can create a private project'
);

select is(
  (
    select payload
    from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000101'
      and action = 'project.publication_changed'
    order by id desc
    limit 1
  ),
  '{"after":{"portfolioVisible":false,"caseStudyPublished":false},"before":null}'::jsonb,
  'project creation and its initial private publication state are audited'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      (select id from public.projects where slug = 'aqproj001-private'),
      null,
      'manager',
      '{
        "title":"Private project",
        "slug":"aqproj001-private",
        "category":"web",
        "tags":[],
        "description":"Private description",
        "image":"https://example.com/private.jpg",
        "live_url":"https://example.com/private",
        "featured":false,
        "portfolio_visible":true,
        "case_study_published":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  '42501',
  'project_publication_forbidden',
  'a manager cannot change a public state inside the locked operation'
);

select is(
  (select portfolio_visible from public.projects where slug = 'aqproj001-private'),
  false,
  'a refused manager transition leaves the portfolio state unchanged'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      (select id from public.projects where slug = 'aqproj001-private'),
      '00000000-0000-0000-0000-000000000999',
      'admin',
      '{
        "title":"Private project",
        "slug":"aqproj001-private",
        "category":"web",
        "tags":[],
        "description":"Private description",
        "image":"https://example.com/private.jpg",
        "live_url":"https://example.com/private",
        "featured":false,
        "portfolio_visible":true,
        "case_study_published":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  '23503',
  'insert or update on table "audit_logs" violates foreign key constraint "audit_logs_actor_user_id_fkey"',
  'an audit failure rejects the whole publication transaction'
);

select is(
  (select portfolio_visible from public.projects where slug = 'aqproj001-private'),
  false,
  'the project update rolls back when its audit insert fails'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      (select id from public.projects where slug = 'aqproj001-private'),
      null,
      'admin',
      '{
        "title":"Private project",
        "slug":"aqproj001-private",
        "category":"web",
        "tags":[],
        "description":"Private description",
        "image":"https://example.com/private.jpg",
        "live_url":"https://example.com/private",
        "featured":false,
        "portfolio_visible":true,
        "case_study_published":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  'an administrator can publish the portfolio card atomically'
);

select is(
  (select portfolio_visible from public.projects where slug = 'aqproj001-private'),
  true,
  'the administrator transition is persisted'
);

select is(
  (
    select payload
    from public.audit_logs
    where organization_id = '00000000-0000-0000-0000-000000000101'
      and action = 'project.publication_changed'
    order by id desc
    limit 1
  ),
  '{"after":{"portfolioVisible":true,"caseStudyPublished":false},"before":{"portfolioVisible":false,"caseStudyPublished":false}}'::jsonb,
  'the successful transition stores its exact previous and next states'
);

select * from finish();
rollback;
