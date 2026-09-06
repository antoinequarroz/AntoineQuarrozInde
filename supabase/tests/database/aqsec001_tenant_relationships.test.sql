begin;

select plan(5);

insert into public.organizations (id, name, slug) values
  ('00000000-0000-0000-0000-000000009101', 'Security tenant A', 'security-tenant-a'),
  ('00000000-0000-0000-0000-000000009102', 'Security tenant B', 'security-tenant-b');

insert into public.clients (organization_id, name, email) values
  ('00000000-0000-0000-0000-000000009101', 'Client A', 'a@example.test'),
  ('00000000-0000-0000-0000-000000009102', 'Client B', 'b@example.test');

insert into public.projects (
  organization_id, title, slug, category, description, image, live_url
) values (
  '00000000-0000-0000-0000-000000009101',
  'Project A',
  'project-a',
  'web',
  'Project in tenant A',
  'https://example.test/image.jpg',
  'https://example.test'
);

select throws_ok(
  $$
    insert into public.tasks (organization_id, client_id, title)
    select '00000000-0000-0000-0000-000000009101', id, 'Cross tenant task'
    from public.clients
    where organization_id = '00000000-0000-0000-0000-000000009102'
  $$,
  '23503',
  null,
  'a task cannot reference a client from another organization'
);

select throws_ok(
  $$
    insert into public.quotes (organization_id, client_id, number, title)
    select '00000000-0000-0000-0000-000000009101', id, 'SEC-QUOTE-1', 'Cross tenant quote'
    from public.clients
    where organization_id = '00000000-0000-0000-0000-000000009102'
  $$,
  '23503',
  null,
  'a quote cannot reference a client from another organization'
);

select throws_ok(
  $$
    insert into public.appointments (organization_id, client_id, title, starts_at, ends_at)
    select
      '00000000-0000-0000-0000-000000009101',
      id,
      'Cross tenant appointment',
      now(),
      now() + interval '1 hour'
    from public.clients
    where organization_id = '00000000-0000-0000-0000-000000009102'
  $$,
  '23503',
  null,
  'an appointment cannot reference a client from another organization'
);

select throws_ok(
  $$
    update public.projects
    set client_id = (
      select id from public.clients
      where organization_id = '00000000-0000-0000-0000-000000009102'
    )
    where organization_id = '00000000-0000-0000-0000-000000009101'
  $$,
  '23503',
  null,
  'a project cannot reference a client from another organization'
);

select throws_ok(
  $$
    insert into public.audit_logs (organization_id, client_id, action)
    select '00000000-0000-0000-0000-000000009101', id, 'cross_tenant.audit'
    from public.clients
    where organization_id = '00000000-0000-0000-0000-000000009102'
  $$,
  '23503',
  null,
  'an audit log cannot reference a client from another organization'
);

select * from finish();
rollback;
