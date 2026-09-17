begin;

select plan(10);

select has_table('public', 'technology_stack_settings', 'technology stack settings exist');
select has_column('public', 'technology_stack_settings', 'draft_items', 'a private draft is stored');
select has_column('public', 'technology_stack_settings', 'published_items', 'an explicit public document is stored');
select has_column('public', 'technology_stack_settings', 'draft_revision', 'draft revisions support conflict detection');
select has_column('public', 'technology_stack_settings', 'published_revision', 'published revisions are traceable');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.technology_stack_settings'::regclass),
  'RLS is enabled on the exposed-schema table'
);

select ok(
  not has_table_privilege('anon', 'public.technology_stack_settings', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.technology_stack_settings', 'select,insert,update,delete'),
  'browser roles have no direct access'
);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000009101', 'AQ stack tenant', 'aq-stack-tenant');

select lives_ok(
  $$insert into public.technology_stack_settings (organization_id, draft_items, published_items)
    values (
      '00000000-0000-0000-0000-000000009101',
      '[{"key":"vue","label":"Vue","icon":"vue","level":"used","showAbout":true,"showFooter":true,"position":0}]'::jsonb,
      '[]'::jsonb
    )$$,
  'a tenant can hold distinct draft and published documents'
);

select throws_ok(
  $$update public.technology_stack_settings
    set draft_items = '{}'::jsonb
    where organization_id = '00000000-0000-0000-0000-000000009101'$$,
  '23514',
  null,
  'draft documents must remain arrays'
);

select throws_ok(
  $$update public.technology_stack_settings
    set published_items = (
      select jsonb_agg(value)
      from generate_series(1, 41) value
    )
    where organization_id = '00000000-0000-0000-0000-000000009101'$$,
  '23514',
  null,
  'published documents cannot exceed forty entries'
);

select * from finish();
rollback;
