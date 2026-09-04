begin;

create function pg_temp.aqseo012_payload(
  p_published boolean,
  p_confirmed boolean default true,
  p_context text default 'Contexte client vérifié'
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'title', 'Étude approuvée',
    'slug', 'aqseo012-approved',
    'category', 'web',
    'tags', jsonb_build_array('Nuxt'),
    'description', 'Résumé public vérifié',
    'image', 'https://example.com/case.jpg',
    'live_url', 'https://example.com',
    'code_url', 'https://github.com/example/project',
    'featured', false,
    'portfolio_visible', true,
    'case_study_published', p_published,
    'client_label', 'Client confidentiel',
    'client_disclosure_status', 'anonymous',
    'project_role', 'Conception et développement',
    'project_duration', '8 semaines',
    'case_study_timeline_approved', false,
    'challenge', p_context,
    'project_scope', 'Application et interface publiques',
    'key_decisions', 'Architecture sobre et parcours raccourci',
    'approach', 'Ateliers puis livraison progressive',
    'solution', 'Application Nuxt',
    'outcome', 'Le parcours métier est maintenant utilisable.',
    'outcome_approved', true,
    'case_study_links_approved', false,
    'related_service_paths', jsonb_build_array('/developpeur-web-valais'),
    'deliverables', jsonb_build_array('Application'),
    'gallery_images', '[]'::jsonb,
    'results', jsonb_build_array(jsonb_build_object(
      'value', '1 parcours',
      'label', 'mis en production',
      'measurementContext', 'Périmètre du projet',
      'evidenceNote', 'Note privée AQSEO012',
      'approved', true
    )),
    'seo_title', 'Étude approuvée en Valais',
    'seo_description', 'Une étude factuelle et validée.',
    'case_study_approval_confirmed', p_confirmed
  );
$$;

select plan(25);

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-0000-0000-000000001201', 'AQ SEO 012 A', 'aq-seo-012-a'),
  ('00000000-0000-0000-0000-000000001202', 'AQ SEO 012 B', 'aq-seo-012-b');

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000001210', 'authenticated', 'authenticated',
  'aqseo012@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name in (
        'project_scope', 'key_decisions', 'client_disclosure_status',
        'case_study_links_approved', 'case_study_timeline_approved',
        'outcome_approved', 'related_service_paths',
        'case_study_approved_at', 'case_study_approved_by'
      )
  ),
  9,
  'the additive approval model exposes every expected project column'
);

select ok(
  (select column_default = '''pending''::text' and is_nullable = 'NO'
   from information_schema.columns
   where table_schema = 'public' and table_name = 'projects'
     and column_name = 'client_disclosure_status')
  and
  (select column_default = 'false' and is_nullable = 'NO'
   from information_schema.columns
   where table_schema = 'public' and table_name = 'projects'
     and column_name = 'outcome_approved'),
  'new approval fields default to private states'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname in (
        'projects_client_disclosure_status_allowed',
        'projects_related_service_paths_allowed',
        'projects_case_study_approval_pair'
      )
  ),
  3,
  'database constraints protect disclosure, services and approval attribution'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_project_with_publication_audit'
      and not p.prosecdef
  ),
  'the transition save function remains security invoker'
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
  'only the service role can execute the transition save function'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null, null, 'manager',
      '{
        "title":"Legacy draft",
        "slug":"aqseo012-legacy",
        "category":"web",
        "tags":[],
        "description":"Legacy description",
        "portfolio_visible":false,
        "case_study_published":false,
        "featured":false,
        "deliverables":[],
        "gallery_images":[],
        "results":[]
      }'::jsonb
    )
  $$,
  'the previous application contract can still create a private draft'
);

select ok(
  (select case_study_approved_at is null and case_study_approved_by is null
   from public.projects where slug = 'aqseo012-legacy'),
  'a legacy write never receives implicit approval'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null,
      '00000000-0000-0000-0000-000000001210', 'manager',
      pg_temp.aqseo012_payload(true)
    )
  $$,
  '42501', 'project_publication_forbidden',
  'a manager cannot publish with the approval contract'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null,
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(true, true, null)
    )
  $$,
  '22023', 'project_case_study_context_required',
  'publication fails closed when a critical passage is missing'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null,
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(true)
        || '{"results":[{"value":"1","approved":true}]}'::jsonb
    )
  $$,
  '22023', 'project_case_study_result_invalid',
  'an approved measure must keep a complete public value and label'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null,
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(true)
    )
  $$,
  'an owner can publish one complete explicitly approved study'
);

select ok(
  (select case_study_published
      and case_study_approved_at is not null
      and case_study_approved_by = '00000000-0000-0000-0000-000000001210'
      and client_disclosure_status = 'anonymous'
   from public.projects where slug = 'aqseo012-approved'),
  'approval is persisted with its actor, timestamp and disclosure decision'
);

select ok(
  (
    select payload::text not like '%Client confidentiel%'
      and payload::text not like '%Note privée AQSEO012%'
      and payload ? 'fields'
    from public.audit_logs
    where action = 'project.case_study_sensitive_changed'
      and entity_id = (select id::text from public.projects where slug = 'aqseo012-approved')
    order by id desc
    limit 1
  ),
  'the sensitive audit stores field names but no client content or evidence note'
);

select throws_ok(
  $$
    insert into public.projects (
      organization_id, title, slug, category, description, related_service_paths
    ) values (
      '00000000-0000-0000-0000-000000001201', 'Duplicate service',
      'aqseo012-duplicate-service', 'web', 'Description',
      array['/developpeur-web-valais', '/developpeur-web-valais']
    )
  $$,
  '23514',
  'new row for relation "projects" violates check constraint "projects_related_service_paths_allowed"',
  'duplicate related services are rejected by the database'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201',
      (select id from public.projects where slug = 'aqseo012-approved'),
      '00000000-0000-0000-0000-000000001210', 'admin',
      pg_temp.aqseo012_payload(true) || '{"outcome":"Résultat modifié"}'::jsonb
    )
  $$,
  '40001', 'project_case_study_locked',
  'an approved published study cannot be mutated in place'
);

select is(
  (select outcome from public.projects where slug = 'aqseo012-approved'),
  'Le parcours métier est maintenant utilisable.',
  'a refused published mutation leaves approved content unchanged'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201',
      (select id from public.projects where slug = 'aqseo012-approved'),
      '00000000-0000-0000-0000-000000001210', 'admin',
      pg_temp.aqseo012_payload(false, false)
    )
  $$,
  'an administrator can return an approved study to draft'
);

select ok(
  (select not case_study_published
      and case_study_approved_at is null
      and case_study_approved_by is null
      and challenge = 'Contexte client vérifié'
      and results -> 0 ->> 'evidenceNote' = 'Note privée AQSEO012'
   from public.projects where slug = 'aqseo012-approved'),
  'unpublishing clears approval while preserving the private draft evidence'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201',
      (select id from public.projects where slug = 'aqseo012-approved'),
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(true, false)
    )
  $$,
  '22023', 'project_case_study_approval_required',
  'republishing requires a fresh explicit confirmation'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201',
      (select id from public.projects where slug = 'aqseo012-approved'),
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(true, true)
    )
  $$,
  'a fresh explicit confirmation can republish the preserved draft'
);

select ok(
  (select case_study_published and case_study_approved_at is not null
   from public.projects where slug = 'aqseo012-approved'),
  'republishing restores a current approval atomically'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001202',
      (select id from public.projects where slug = 'aqseo012-approved'),
      '00000000-0000-0000-0000-000000001210', 'owner',
      pg_temp.aqseo012_payload(false, false)
    )
  $$,
  'P0002', 'project_not_found',
  'an organization cannot mutate another organization study'
);

select lives_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201', null, null, 'manager',
      pg_temp.aqseo012_payload(false, false)
        || '{"slug":"aqseo012-rollback","portfolio_visible":false}'::jsonb
    )
  $$,
  'a second private draft is available for the transaction rollback proof'
);

select throws_ok(
  $$
    select public.save_project_with_publication_audit(
      '00000000-0000-0000-0000-000000001201',
      (select id from public.projects where slug = 'aqseo012-rollback'),
      '00000000-0000-0000-0000-000000001299', 'owner',
      pg_temp.aqseo012_payload(true, true)
        || '{"slug":"aqseo012-rollback"}'::jsonb
    )
  $$,
  '23503',
  'insert or update on table "projects" violates foreign key constraint "projects_case_study_approved_by_fkey"',
  'an invalid approval actor rolls back the whole publication transaction'
);

select ok(
  (select not case_study_published and case_study_approved_at is null
   from public.projects where slug = 'aqseo012-rollback'),
  'a failed approval write leaves the project private and unapproved'
);

select * from finish();
rollback;
