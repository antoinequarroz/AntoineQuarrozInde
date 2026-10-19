begin;

select plan(12);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000004601', 'ANT 46 Portfolio', 'ant046-portfolio');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000004602', 'authenticated', 'authenticated',
   'ant046-admin@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000004603', 'authenticated', 'authenticated',
   'ant046-manager@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organization_memberships (organization_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000004601', '00000000-0000-0000-0000-000000004602', 'admin'),
  ('00000000-0000-0000-0000-000000004601', '00000000-0000-0000-0000-000000004603', 'manager');

create function pg_temp.ant046_payload(p_slug text, p_visible boolean, p_case_study boolean default false)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'title', 'Projet avec démonstration privée', 'slug', p_slug,
    'category', 'software', 'tags', '[]'::jsonb,
    'description', 'Résumé public vérifié', 'image', 'https://example.com/project.webp',
    'live_url', null, 'code_url', null, 'featured', false,
    'portfolio_visible', p_visible, 'case_study_published', p_case_study,
    'client_disclosure_status', 'anonymous', 'project_role', 'Conception et développement',
    'challenge', 'Contexte vérifié', 'project_scope', 'Périmètre vérifié',
    'key_decisions', 'Décisions vérifiées', 'outcome', 'Résultat qualitatif vérifié',
    'outcome_approved', true, 'related_service_paths', jsonb_build_array('/developpeur-web-valais'),
    'deliverables', '[]'::jsonb, 'gallery_images', '[]'::jsonb, 'results', '[]'::jsonb,
    'case_study_approval_confirmed', p_case_study
  );
$$;

select lives_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601', null,
    '00000000-0000-0000-0000-000000004603', null,
    pg_temp.ant046_payload('ant046-project', false)
  )
$$, 'a manager may create a linkless private project');

select throws_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601',
    (select id from public.projects where slug = 'ant046-project'),
    '00000000-0000-0000-0000-000000004603', 'admin',
    pg_temp.ant046_payload('ant046-project', true)
  )
$$, '42501', 'project_publication_forbidden', 'an asserted admin role cannot let a manager publish a linkless project');

select is((select portfolio_visible from public.projects where slug = 'ant046-project'), false,
  'a refused publication leaves the project private');

select lives_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601',
    (select id from public.projects where slug = 'ant046-project'),
    '00000000-0000-0000-0000-000000004602', null,
    pg_temp.ant046_payload('ant046-project', true)
  )
$$, 'an administrator may publish a portfolio project without a site or repository');

select ok((select portfolio_visible and live_url is null and code_url is null
  and not case_study_published and case_study_approved_at is null and case_study_approved_by is null
  from public.projects where slug = 'ant046-project'),
  'a linkless portfolio card does not approve or publish its detailed study');

select ok(exists(select 1 from public.audit_logs
  where organization_id = '00000000-0000-0000-0000-000000004601'
    and actor_user_id = '00000000-0000-0000-0000-000000004602'
    and action = 'project.publication_changed'
    and entity_id = (select id::text from public.projects where slug = 'ant046-project')
    and payload -> 'before' ->> 'portfolioVisible' = 'false'
    and payload -> 'after' ->> 'portfolioVisible' = 'true'),
  'the public transition retains its actor and before/after audit');

select throws_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601', null,
    '00000000-0000-0000-0000-000000004603', null,
    pg_temp.ant046_payload('ant046-manager-public', true)
  )
$$, '42501', 'project_publication_forbidden', 'a manager cannot create a directly public linkless project');

select throws_ok($$
  insert into public.projects (organization_id, title, slug, category, description, image, portfolio_visible)
  values ('00000000-0000-0000-0000-000000004601', 'Direct public project', 'ant046-direct',
    'software', 'Description', 'https://example.com/project.webp', true)
$$, '42501', 'project_publication_requires_audited_rpc', 'a direct write cannot bypass the publication audit');

select throws_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601', null, null, 'admin',
    pg_temp.ant046_payload('ant046-no-member', true)
  )
$$, '42501', 'project_actor_membership_required', 'publication still requires an identified organization member');

select throws_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601', null,
    '00000000-0000-0000-0000-000000004602', null,
    pg_temp.ant046_payload('ant046-case-study', true, true)
  )
$$, '22023', 'project_public_link_required', 'a published case study still requires a public site or repository');

select is((select count(*) from public.projects where slug = 'ant046-case-study'), 0::bigint,
  'a rejected study leaves no project or partial approval behind');

select lives_ok($$
  select public.save_project_with_publication_audit(
    '00000000-0000-0000-0000-000000004601', null,
    '00000000-0000-0000-0000-000000004602', null,
    pg_temp.ant046_payload('ant046-case-study', true, true)
      || jsonb_build_object('code_url', 'https://github.com/example/public-project')
  )
$$, 'an approved complete case study can still publish with a public repository');

select * from finish();
rollback;
