begin;

select plan(19);

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-0000-0000-000000000201', 'AQ Project Localizations A', 'aq-project-localizations-a'),
  ('00000000-0000-0000-0000-000000000202', 'AQ Project Localizations B', 'aq-project-localizations-b');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000210', 'authenticated', 'authenticated',
   'aqproj002-owner@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000211', 'authenticated', 'authenticated',
   'aqproj002-admin@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000212', 'authenticated', 'authenticated',
   'aqproj002-manager@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000213', 'authenticated', 'authenticated',
   'aqproj002-owner-b@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organization_memberships (organization_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000210', 'owner'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000211', 'admin'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000212', 'manager'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000213', 'owner');

select has_table(
  'public',
  'project_case_study_localizations',
  'the private project-localization table exists'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.project_case_study_localizations'::regclass),
  'row-level security is enabled on project localizations'
);

select ok(
  not has_table_privilege('anon', 'public.project_case_study_localizations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.project_case_study_localizations', 'SELECT')
  and has_table_privilege('service_role', 'public.project_case_study_localizations', 'SELECT'),
  'browser roles cannot read private localizations and service_role can'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'save_project_with_publication_audit'
      and not procedure.prosecdef
  ),
  'the localized atomic save function is security invoker'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000201',
      null,
      '00000000-0000-0000-0000-000000000210',
      null,
      '{
        "title":"Localized project",
        "slug":"aqproj002-localized",
        "category":"mobile",
        "tags":[],
        "description":"Description publique française",
        "image":"https://example.com/localized.jpg",
        "live_url":null,
        "code_url":null,
        "featured":false,
        "portfolio_visible":false,
        "case_study_published":false,
        "client_disclosure_status":"pending",
        "case_study_approval_confirmed":false,
        "gallery_images":[],
        "case_study_localizations":{
          "fr":{"project_role":"Rôle FR","challenge":"Contexte FR","deliverables":["App FR"],"results":[{"value":"25 %","label":"Résultat FR","approved":true}]},
          "en":{"project_role":"English role","challenge":"English challenge","deliverables":["EN app"],"results":[{"value":"25%","label":"EN result","approved":false}]},
          "de":{}
        }
      }'::jsonb
    )
  $$,
  'an owner atomically creates independent FR, EN and empty DE drafts'
);

select is(
  (select count(*)::integer from public.project_case_study_localizations where project_id = (select id from public.projects where slug = 'aqproj002-localized')),
  3,
  'the save persists exactly one row for each supported locale'
);

select is(
  (select challenge from public.project_case_study_localizations where project_id = (select id from public.projects where slug = 'aqproj002-localized') and locale = 'en'),
  'English challenge',
  'English content remains independent'
);

select is(
  (select challenge from public.project_case_study_localizations where project_id = (select id from public.projects where slug = 'aqproj002-localized') and locale = 'de'),
  null,
  'an empty German locale does not receive the French value'
);

select is(
  (select challenge from public.projects where slug = 'aqproj002-localized'),
  'Contexte FR',
  'French localization remains synchronized with the legacy public column'
);

select throws_ok(
  $$
    insert into public.project_case_study_localizations (project_id, organization_id, locale)
    values (
      (select id from public.projects where slug = 'aqproj002-localized'),
      '00000000-0000-0000-0000-000000000201',
      'it'
    )
  $$,
  '23514',
  null,
  'a fourth locale is rejected by the database'
);

select throws_ok(
  $$
    insert into public.project_case_study_localizations (project_id, organization_id, locale)
    values (
      (select id from public.projects where slug = 'aqproj002-localized'),
      '00000000-0000-0000-0000-000000000201',
      'fr'
    )
  $$,
  '23505',
  null,
  'a duplicate project and locale pair is rejected'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000201',
      (select id from public.projects where slug = 'aqproj002-localized'),
      '00000000-0000-0000-0000-000000000212',
      'owner',
      '{
        "title":"Localized project","slug":"aqproj002-localized","category":"mobile","tags":[],
        "description":"Description publique française","image":"https://example.com/localized.jpg",
        "featured":false,"portfolio_visible":false,"case_study_published":false,
        "client_disclosure_status":"pending","case_study_approval_confirmed":false,"gallery_images":[],
        "case_study_localizations":{"fr":{"challenge":"Spoof"},"en":{},"de":{}}
      }'::jsonb
    )
  $$,
  '42501',
  'project_case_study_localizations_forbidden',
  'a manager cannot spoof an owner role to edit localizations'
);

select is(
  (
    select actor_user_id
    from public.audit_logs
    where action = 'project.case_study_localizations_changed'
      and entity_id = (select id::text from public.projects where slug = 'aqproj002-localized')
    order by id desc limit 1
  ),
  '00000000-0000-0000-0000-000000000210'::uuid,
  'the localization audit records the actual actor'
);

select ok(
  (
    select payload ? 'locales'
      and payload ? 'fieldsByLocale'
      and payload::text not like '%English challenge%'
      and payload::text not like '%Contexte FR%'
    from public.audit_logs
    where action = 'project.case_study_localizations_changed'
      and entity_id = (select id::text from public.projects where slug = 'aqproj002-localized')
    order by id desc limit 1
  ),
  'the audit lists changed locales and fields without storing editorial text'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000202', null,
      '00000000-0000-0000-0000-000000000213', null,
      '{"title":"Tenant B","slug":"aqproj002-tenant-b","category":"web","tags":[],"description":"Tenant B","image":"https://example.com/b.jpg","featured":false,"portfolio_visible":false,"case_study_published":false,"client_disclosure_status":"pending","case_study_approval_confirmed":false,"deliverables":[],"gallery_images":[],"results":[]}'::jsonb
    )
  $$,
  'a second-tenant project fixture is created'
);

select throws_ok(
  $$
    insert into public.project_case_study_localizations (project_id, organization_id, locale)
    values (
      (select id from public.projects where slug = 'aqproj002-tenant-b'),
      '00000000-0000-0000-0000-000000000201',
      'fr'
    )
  $$,
  '23503',
  null,
  'the composite foreign key prevents cross-tenant localization attachment'
);

create function pg_temp.reject_localization_audit()
returns trigger
language plpgsql
as $$
begin
  raise exception 'forced_localization_audit_failure' using errcode = '23514';
end;
$$;

create trigger reject_localization_audit
  before insert on public.audit_logs
  for each row
  when (new.action = 'project.case_study_localizations_changed')
  execute function pg_temp.reject_localization_audit();

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000000201',
      (select id from public.projects where slug = 'aqproj002-localized'),
      '00000000-0000-0000-0000-000000000211',
      null,
      '{
        "title":"Localized project","slug":"aqproj002-localized","category":"mobile","tags":[],
        "description":"Description publique française","image":"https://example.com/localized.jpg",
        "featured":false,"portfolio_visible":false,"case_study_published":false,
        "client_disclosure_status":"pending","case_study_approval_confirmed":false,"gallery_images":[],
        "case_study_localizations":{"fr":{"project_role":"Rôle FR","challenge":"Contexte FR","deliverables":["App FR"],"results":[]},"en":{"challenge":"Must roll back"},"de":{}}
      }'::jsonb
    )
  $$,
  '23514',
  'forced_localization_audit_failure',
  'an audit failure rejects the complete localized save'
);

drop trigger reject_localization_audit on public.audit_logs;

select is(
  (select challenge from public.project_case_study_localizations where project_id = (select id from public.projects where slug = 'aqproj002-localized') and locale = 'en'),
  'English challenge',
  'the English change rolls back when its audit insert fails'
);

delete from public.projects where slug = 'aqproj002-localized';

select is(
  (select count(*)::integer from public.project_case_study_localizations where organization_id = '00000000-0000-0000-0000-000000000201'),
  0,
  'deleting the project cascades only its localization rows'
);

select * from finish();
rollback;
