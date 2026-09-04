begin;

select plan(12);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000101', 'AQ Project Publication', 'aq-project-publication');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000110', 'authenticated', 'authenticated',
   'aqproj001-manager@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000111', 'authenticated', 'authenticated',
   'aqproj001-admin@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organization_memberships (organization_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000110', 'manager'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111', 'admin');

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
      '00000000-0000-0000-0000-000000000110',
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
        "client_disclosure_status":"pending",
        "case_study_approval_confirmed":false,
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
  '{"after":{"portfolioVisible":false,"caseStudyApproved":false,"caseStudyPublished":false},"before":null}'::jsonb,
  'project creation and its initial private publication state are audited'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      (select id from public.projects where slug = 'aqproj001-private'),
      '00000000-0000-0000-0000-000000000110',
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
        "client_disclosure_status":"pending",
        "case_study_approval_confirmed":false,
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

create function pg_temp.reject_project_publication_audit()
returns trigger
language plpgsql
as $$
begin
  raise exception 'forced_project_audit_failure' using errcode = '23514';
end;
$$;

create trigger reject_project_publication_audit
  before insert on public.audit_logs
  for each row
  when (new.action = 'project.publication_changed')
  execute function pg_temp.reject_project_publication_audit();

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000101',
      (select id from public.projects where slug = 'aqproj001-private'),
      '00000000-0000-0000-0000-000000000111',
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
        "client_disclosure_status":"pending",
        "case_study_approval_confirmed":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  '23514',
  'forced_project_audit_failure',
  'an audit failure rejects the whole publication transaction'
);

drop trigger reject_project_publication_audit on public.audit_logs;

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
      '00000000-0000-0000-0000-000000000111',
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
        "client_disclosure_status":"pending",
        "case_study_approval_confirmed":false,
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
  '{"after":{"portfolioVisible":true,"caseStudyApproved":false,"caseStudyPublished":false},"before":{"portfolioVisible":false,"caseStudyApproved":false,"caseStudyPublished":false}}'::jsonb,
  'the successful transition stores its exact previous and next states'
);

select * from finish();
rollback;
