begin;

select plan(2);

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000001010', 'AQ Software Category', 'aq-software-category');

select lives_ok(
  $$
    insert into public.projects (organization_id, title, slug, category, description)
    values (
      '00000000-0000-0000-0000-000000001010',
      'Desktop software',
      'aqproj010-software',
      'software',
      'A desktop application.'
    )
  $$,
  'software is an accepted project category'
);

select throws_ok(
  $$
    insert into public.projects (organization_id, title, slug, category, description)
    values (
      '00000000-0000-0000-0000-000000001010',
      'Unknown category',
      'aqproj010-unknown',
      'desktop',
      'An invalid category.'
    )
  $$,
  '23514',
  null,
  'unknown project categories remain rejected'
);

select * from finish();
rollback;
