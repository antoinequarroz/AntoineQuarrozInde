begin;

select plan(7);

select has_column('public', 'clients', 'next_follow_up_at', 'clients expose an explicit next follow-up date');
select col_type_is('public', 'clients', 'next_follow_up_at', 'date', 'next follow-up uses a calendar date');
select has_column('public', 'clients', 'follow_up_note', 'clients expose an internal follow-up note');
select has_column('public', 'clients', 'last_contacted_at', 'clients expose the latest confirmed contact time');
select col_type_is('public', 'clients', 'last_contacted_at', 'timestamp with time zone', 'last contact keeps its timezone');

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'clients'
      and indexname = 'clients_organization_next_follow_up_idx'
      and indexdef like '%(organization_id, next_follow_up_at)%'
      and indexdef like '%next_follow_up_at IS NOT NULL%'
      and indexdef like '%status = ''lead''::text%'
  ),
  'planned prospect follow-ups use a tenant-first partial index'
);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000009062', 'AQ-062 tenant', 'aq-062-tenant');

select throws_ok(
  $$
    insert into public.clients (organization_id, name, email, follow_up_note)
    values (
      '00000000-0000-0000-0000-000000009062',
      'Oversized follow-up',
      'follow-up@example.test',
      repeat('x', 501)
    )
  $$,
  '23514',
  null,
  'follow-up notes cannot exceed 500 characters'
);

select * from finish();
rollback;
