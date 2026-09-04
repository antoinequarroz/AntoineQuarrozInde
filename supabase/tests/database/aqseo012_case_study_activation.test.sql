begin;

create function pg_temp.aqseo012_activation_payload(
  p_slug text,
  p_published boolean,
  p_confirmed boolean default true
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'title', 'Étude activation',
    'slug', p_slug,
    'category', 'web',
    'tags', jsonb_build_array('Nuxt'),
    'description', 'Résumé public vérifié',
    'image', 'https://example.com/case.jpg',
    'live_url', 'https://example.com/case',
    'code_url', null,
    'featured', false,
    'portfolio_visible', false,
    'case_study_published', p_published,
    'client_label', null,
    'client_disclosure_status', 'anonymous',
    'project_role', 'Conception et développement',
    'project_duration', null,
    'case_study_timeline_approved', false,
    'completed_at', null,
    'challenge', 'Contexte vérifié',
    'project_scope', 'Périmètre vérifié',
    'key_decisions', 'Décisions vérifiées',
    'approach', null,
    'solution', null,
    'outcome', 'Résultat qualitatif vérifié',
    'outcome_approved', true,
    'case_study_links_approved', false,
    'related_service_paths', jsonb_build_array('/developpeur-web-valais'),
    'deliverables', '[]'::jsonb,
    'gallery_images', '[]'::jsonb,
    'results', '[]'::jsonb,
    'seo_title', null,
    'seo_description', null,
    'case_study_approval_confirmed', p_confirmed
  );
$$;

select plan(16);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000001221', 'AQ SEO 012 Activation', 'aq-seo-012-activation');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000001222', 'authenticated', 'authenticated',
   'aqseo012-activation-owner@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000001223', 'authenticated', 'authenticated',
   'aqseo012-activation-manager@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organization_memberships (organization_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000001221', '00000000-0000-0000-0000-000000001222', 'owner'),
  ('00000000-0000-0000-0000-000000001221', '00000000-0000-0000-0000-000000001223', 'manager');

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'projects_case_study_publication_matches_approval'
      and conrelid = 'public.projects'::regclass
      and convalidated
  ),
  'activation validates the published-to-approved invariant'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'enforce_project_case_study_activation'
      and tgrelid = 'public.projects'::regclass
      and not tgisinternal
  )
  and exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_project_case_study_activation'
      and not p.prosecdef
  ),
  'the activation trigger exists and remains security invoker'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_project_with_publication_audit_transition(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.save_project_with_publication_audit_transition(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.save_project_with_publication_audit(uuid,bigint,uuid,text,jsonb)',
    'EXECUTE'
  ),
  'internal and activated functions stay unavailable to browser roles'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001221', null,
      '00000000-0000-0000-0000-000000001222', 'owner',
      '{
        "title":"Old image draft",
        "slug":"aqseo012-old-contract",
        "category":"web",
        "description":"Legacy payload",
        "portfolio_visible":false,
        "case_study_published":false
      }'::jsonb
    )
  $$,
  '22023', 'project_case_study_contract_required',
  'an application image older than the transition contract is rejected'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001221', null,
      '00000000-0000-0000-0000-000000001223', 'owner',
      pg_temp.aqseo012_activation_payload('aqseo012-manager-spoof', true)
    )
  $$,
  '42501', 'project_publication_forbidden',
  'a manager cannot spoof an owner role parameter to publish'
);

select is(
  (select count(*) from public.projects where slug in ('aqseo012-old-contract', 'aqseo012-manager-spoof')),
  0::bigint,
  'rejected contracts and role spoofing leave no project behind'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001221', null,
      '00000000-0000-0000-0000-000000001222', null,
      pg_temp.aqseo012_activation_payload('aqseo012-activation', false, false)
    )
  $$,
  'a current owner can create a private draft through the activated RPC'
);

select ok(
  (select not case_study_published
      and case_study_approved_at is null
      and case_study_approved_by is null
   from public.projects where slug = 'aqseo012-activation'),
  'the activated contract keeps a new draft unapproved'
);

create function pg_temp.reject_case_study_sensitive_audit()
returns trigger
language plpgsql
as $$
begin
  raise exception 'forced_case_study_audit_failure' using errcode = '23514';
end;
$$;

create trigger reject_case_study_sensitive_audit
  before insert on public.audit_logs
  for each row
  when (new.action = 'project.case_study_approval_changed')
  execute function pg_temp.reject_case_study_sensitive_audit();

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001221',
      (select id from public.projects where slug = 'aqseo012-activation'),
      '00000000-0000-0000-0000-000000001222', null,
      pg_temp.aqseo012_activation_payload('aqseo012-activation', true, true)
    )
  $$,
  '23514', 'forced_case_study_audit_failure',
  'a sensitive-audit failure rejects the complete approval transaction'
);

drop trigger reject_case_study_sensitive_audit on public.audit_logs;

select ok(
  (select not case_study_published
      and case_study_approved_at is null
      and case_study_approved_by is null
   from public.projects where slug = 'aqseo012-activation'),
  'an audit failure rolls the project and approval state back together'
);

select is(
  (
    select count(*)
    from public.audit_logs
    where entity_type = 'project'
      and entity_id = (select id::text from public.projects where slug = 'aqseo012-activation')
      and action = 'project.publication_changed'
  ),
  1::bigint,
  'the failed approval leaves no partial publication audit'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001221',
      (select id from public.projects where slug = 'aqseo012-activation'),
      '00000000-0000-0000-0000-000000001222', null,
      pg_temp.aqseo012_activation_payload('aqseo012-activation', true, true)
    )
  $$,
  'the owner can approve the complete study after the audit recovers'
);

select ok(
  (select case_study_published
      and case_study_approved_at is not null
      and case_study_approved_by = '00000000-0000-0000-0000-000000001222'
   from public.projects where slug = 'aqseo012-activation'),
  'the successful approval stores the derived owner identity'
);

select throws_ok(
  $$
    update public.projects
    set outcome = 'Mutation directe interdite'
    where slug = 'aqseo012-activation'
  $$,
  '40001', 'project_case_study_locked',
  'approved public content cannot be mutated outside the RPC'
);

select is(
  (select outcome from public.projects where slug = 'aqseo012-activation'),
  'Résultat qualitatif vérifié',
  'a refused direct mutation leaves approved content unchanged'
);

select throws_ok(
  $$
    insert into public.projects (
      organization_id, title, slug, category, description, image, live_url,
      case_study_published, case_study_approved_at, case_study_approved_by,
      client_disclosure_status, project_role, challenge, project_scope,
      key_decisions, outcome, outcome_approved, related_service_paths
    ) values (
      '00000000-0000-0000-0000-000000001221', 'Direct case',
      'aqseo012-direct', 'web', 'Direct description',
      'https://example.com/direct.jpg', 'https://example.com/direct', true,
      now(), '00000000-0000-0000-0000-000000001222', 'anonymous',
      'Développement', 'Contexte', 'Périmètre', 'Décisions', 'Résultat', true,
      array['/developpeur-web-valais']
    )
  $$,
  '42501', 'project_publication_requires_audited_rpc',
  'direct SQL cannot bypass the audited publication RPC'
);

select * from finish();
rollback;
